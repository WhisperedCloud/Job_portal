import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Required environment variables are not set");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST requests are allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // You *could* optionally inspect the authorization header if you want to restrict
  // but since you're using service role internally, we don't *require* it here.
  // const authHeader = req.headers.get("authorization");

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON input" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { candidateId, jobId } = body;

  if (!candidateId || !jobId) {
    return new Response(
      JSON.stringify({ error: "Missing candidateId or jobId" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Supabase client using the service role key (full privileges)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      },
    });

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error("Candidate fetch error:", candidateError);
      return new Response(
        JSON.stringify({ error: "Candidate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Job fetch error:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for Gemini
    const prompt = `You are a technical recruiter. Rate the match between this candidate and job posting as an integer from 0 to 100.
Only reply with the integer (no explanation).

Candidate:
- Name: ${candidate.name || 'Not specified'}
- Skills: ${(candidate.skills || []).join(', ') || 'Not specified'}
- Experience: ${candidate.experience || 'Not specified'}
- Education: ${candidate.education || 'Not specified'}

Job:
- Title: ${job.title || 'Not specified'}
- Required Skills: ${(job.skills_required || []).join(', ') || 'Not specified'}
- Experience Level: ${job.experience_level || 'Not specified'}
- Description: ${(job.job_description || '').substring(0, 200) || 'Not specified'}
- Location: ${job.location || 'Not specified'}
`.trim();

    console.log("Gemini prompt:", prompt);

    let score = 0;
    let geminiRaw = '';

    try {
      const model = 'gemini-2.0-flash';
      const GEMINI_API_URL =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error:", errorBody);
        geminiRaw = errorBody;
        throw new Error(`Gemini API request failed: ${errorBody}`);
      }

      const data = await response.json();
      geminiRaw = JSON.stringify(data);

      console.log("Gemini response:", geminiRaw);

      const candidateResp = data.candidates?.[0];
      const finishReason = candidateResp?.finishReason;
      console.log(`Gemini finish reason: ${finishReason}`);

      if (finishReason === "MAX_TOKENS") {
        console.error("Gemini response MAX_TOKENS limit");
        throw new Error("Gemini response exceeded MAX_TOKENS limit. Try shorter input.");
      }

      const text = candidateResp?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        console.error("No Gemini output text:", geminiRaw);
        throw new Error("No Gemini output text");
      }

      const match = text.match(/(\d{1,3})/);
      if (match) {
        const parsedScore = parseInt(match[1], 10);
        score = Math.max(0, Math.min(100, parsedScore));
      } else {
        console.error("Could not parse score from Gemini output:", text);
      }

    } catch (err) {
      console.error("Error during Gemini analysis:", err);
      return new Response(
        JSON.stringify({
          error: "Gemini processing failed",
          details: String(err),
          geminiRaw,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ jobId, score, geminiRaw }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error during processing:", err);
    return new Response(
      JSON.stringify({ error: "Processing failed", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
