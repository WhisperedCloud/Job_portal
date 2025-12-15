// supabase/functions/analyze-resume/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== ENV ==========
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing environment variables");
}

// ========== CORS ==========
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ========== SERVER ==========
serve(async (req) => {
  // ----- CORS preflight -----
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ----- Method check -----
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST requests allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  // ----- Parse body safely -----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { resumeText, jobDescription, applicationId } = body;

  if (!resumeText || !jobDescription) {
    return new Response(
      JSON.stringify({
        error: "resumeText and jobDescription are required",
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // ========== PROMPT ==========
    const prompt = `
You are a technical recruiter.

Compare the following resume with the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON in this exact format:
{
  "overallMatchScore": number,
  "keySkillsMatched": string[],
  "missingSkills": string[],
  "summary": string
}
`;

    // ========== GEMINI CALL ==========
    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      GEMINI_API_KEY;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    // ----- Handle Gemini errors -----
    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("❌ Gemini error:", errText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI quota exceeded. Try again later.",
          }),
          { status: 429, headers: corsHeaders }
        );
      }

      throw new Error("Gemini API failed");
    }

    const geminiData = await geminiResponse.json();

    const analysisText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error("Empty Gemini response");
    }

    // ========== PARSE JSON ==========
    let analysis;
    try {
      const cleaned = analysisText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("❌ Failed to parse Gemini output:", analysisText);
      throw new Error("Invalid AI response format");
    }

    // ========== SUPABASE ==========
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const insertPayload: any = {
      resume_text: resumeText.substring(0, 5000),
      job_description: jobDescription.substring(0, 5000),
      overall_match_score: analysis.overallMatchScore,
      key_skills_matched: analysis.keySkillsMatched,
      missing_skills: analysis.missingSkills,
      summary: analysis.summary,
    };

    if (applicationId) {
      insertPayload.application_id = applicationId;
    }

    const { data, error } = await supabase
      .from("analysis_results")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      throw new Error("Database insert failed");
    }

    // ========== SUCCESS ==========
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    console.error("❌ Edge Function error:", err.message);
    return new Response(
      JSON.stringify({
        error: "Processing failed",
        details: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
