export const config = {
  verify_jwt: false,
};

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

async function fetchResumeText(resumeUrl: string): Promise<string | null> {
  if (!resumeUrl) return null;
  try {
    // Try to fetch the resume as text. If it's a PDF, skip or add PDF parsing logic.
    const resp = await fetch(resumeUrl);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "";
    // Only support text or PDF (if you want to parse PDF, you'll need a PDF parser)
    if (contentType.includes("text/plain")) {
      // Plain text resume
      return await resp.text();
    }
    // If you want PDF support, you can use a PDF parsing library here (not included for brevity)
    // Optionally: Limit resume size
    return null;
  } catch (_e) {
    return null;
  }
}

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
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {
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

    // ---- Fetch resume content if possible ----
    let resumeText: string | null = null;
    if (candidate.resume_url) {
      resumeText = await fetchResumeText(candidate.resume_url);
      // Optionally limit to first 2000 characters to avoid prompt size issues
      if (resumeText && resumeText.length > 2000) {
        resumeText = resumeText.substring(0, 2000) + "\n...[truncated]";
      }
    }

    // Prompt for Gemini: add resume content if available
    // Simple semantic hint based on domain/skills alignment
    const domainMatch = candidate.domain_focus?.toLowerCase() === job.category?.toLowerCase() ? 20 : 0;
    const skillsMatch = (job.skills_required || []).filter((s: string) => 
      (candidate.skills || []).some((cs: string) => cs.toLowerCase().includes(s.toLowerCase()))
    ).length * 5;
    const semanticHint = Math.min(40, domainMatch + skillsMatch);

    console.log(`Semantic Hint Calculated: ${semanticHint}`);

    const prompt = `You are an expert recruitment analyzer. 
    Compare this Candidate with this Job Description. 
    
    CANDIDATE:
    - Seniority: ${candidate.seniority}
    - Skills: ${(candidate.skills || []).join(', ')}
    - Summary: ${candidate.about}
    - Trajectory: ${candidate.career_trajectory}
    
    JOB:
    - Title: ${job.title}
    - Level: ${job.experience_level}
    - Skills: ${(job.skills_required || []).join(', ')}
    - Summary: ${job.job_description}

    SEMANTIC ALIGNMENT HINT: ${semanticHint}/40 (Based on keyword/domain overlap)

    TASK:
    Calculate a Match Score (0-100) and provide a structured breakdown.
    
    ### OUTPUT FORMAT (JSON ONLY):
    {
      "score": number (0-100),
      "candidate_name": "string (The real Full Name of the candidate extracted from their resume) or null",
      "reasoning": "1-2 concise sentences explaining the fit",
      "breakdown": {
        "skills": number (0-100),
        "seniority": number (0-100),
        "domain": number (0-100),
        "semantic": number (0-100)
      }
    }
    
    Return ONLY the raw JSON object.`.trim();

    console.log("Gemini prompt:", prompt);

    let score = 0;
    let geminiRaw = '';

    let response;
    let geminiRawError = '';

    const models = [
      "gemini-2.5-flash", 
      "gemini-3.1-flash-lite-preview", 
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest"
    ];
    const versions = ["v1", "v1beta"];

    outerLoop: for (const version of versions) {
      for (const model of models) {
        const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        console.log(`Trying Gemini: ${version}/${model}`);
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 200,
              },
            }),
          });
          
          if (response.ok) {
            geminiRawError = "";
            break outerLoop;
          }
          geminiRawError = await response.text();
          console.warn(`Failed ${version}/${model}: ${response.status} - ${geminiRawError}`);
        } catch (err: any) {
          geminiRawError = err.message || String(err);
          console.warn(`Fetch error on ${version}/${model}:`, geminiRawError);
        }
      }
    }

    if (!response || !response.ok) {
      return new Response(
        JSON.stringify({ 
          error: "Gemini API failed all endpoints", 
          details: geminiRawError,
          status: response?.status || 0
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const data = await response.json();
      geminiRaw = JSON.stringify(data);
      console.log("Gemini response:", geminiRaw);

      const candidateResp = data.candidates?.[0];
      const text = candidateResp?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Invalid Gemini response - no text content");
      }

      console.log("Raw output text:", text);

      // Parse structured JSON from Gemini output
      const result = { 
        jobId, 
        score: 0, 
        candidate_name: null as string | null,
        reasoning: text, 
        breakdown: { skills: 50, seniority: 50, domain: 50, semantic: 50 } 
      };
      
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.score === 'number') {
          result.score = Math.max(0, Math.min(100, parsed.score));
          result.reasoning = parsed.reasoning || text;
          result.candidate_name = parsed.candidate_name || null;
          result.breakdown = {
            skills: parsed.breakdown?.skills || result.breakdown.skills,
            seniority: parsed.breakdown?.seniority || result.breakdown.seniority,
            domain: parsed.breakdown?.domain || result.breakdown.domain,
            semantic: parsed.breakdown?.semantic || result.breakdown.semantic,
          };
        }
      } catch (e) {
        console.warn("Falling back to regex parsing for score");
        const match = text.match(/(\d+)/);
        if (match) result.score = Math.min(100, parseInt(match[1], 10));
      }

    // 4. Lazy Name Correction 
    // If the candidate's current name is an email/placeholder, and we found a real name, update it.
    if (result.candidate_name) {
      try {
        const { data: candData } = await supabase
          .from('candidates')
          .select('id, name, email')
          .eq('id', candidateId)
          .single();
        
        const currentName = candData?.name || '';
        const emailPrefix = candData?.email?.split('@')[0] || '';
        
        // If current name is missing or looks like an email prefix, update it!
        if (!currentName || currentName === emailPrefix || !currentName.includes(' ')) {
          console.log(`Updating candidate name from ${currentName} to ${result.candidate_name}`);
          await supabase
            .from('candidates')
            .update({ name: result.candidate_name, updated_at: new Date().toISOString() })
            .eq('id', candidateId);
        }
      } catch (err) {
        console.warn("Lazy name update failed (non-critical):", err);
      }
    }

    // 5. Success Return
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    } catch (err: any) {
      console.error("Error during processing:", err);
      return new Response(
        JSON.stringify({ 
          error: "Processing failed", 
          details: err.message || String(err),
          geminiRaw: geminiRaw || "No raw data available"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ jobId, score, geminiRaw }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (outerErr: unknown) {
    console.error("Outer process error:", outerErr);
    return new Response(
      JSON.stringify({ error: "Fatal error", details: (outerErr as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});