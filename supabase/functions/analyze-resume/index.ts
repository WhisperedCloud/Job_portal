import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON input" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Accept EITHER resumeBase64 (from frontend) OR resumeText (legacy plain text)
  const { resumeBase64, mimeType, resumeText, jobDescription, applicationId } = body;

  if (!resumeBase64 && !resumeText) {
    return new Response(
      JSON.stringify({ error: "resumeBase64 (or resumeText) and jobDescription are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!jobDescription) {
    return new Response(
      JSON.stringify({ error: "jobDescription is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log(`Analyzing resume for application: ${applicationId}`);

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const promptText = `You are a technical recruiter. Compare the candidate's resume with the job description.

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "overallMatchScore": <number 0-100>,
  "keySkillsMatched": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "summary": "2-3 sentences about candidate fit"
}`;

    // Build the request parts - use inline PDF if base64 provided, else fall back to text
    let parts: any[];
    if (resumeBase64) {
      parts = [
        {
          inline_data: {
            mime_type: mimeType || "application/pdf",
            data: resumeBase64,
          },
        },
        { text: promptText },
      ];
    } else {
      parts = [
        { text: `RESUME:\n${resumeText}\n\n${promptText}` },
      ];
    }

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", errorBody);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI quota exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API request failed: ${errorBody}`);
    }

    const geminiData = await response.json();
    const candidate = geminiData.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (finishReason === "MAX_TOKENS") {
      throw new Error("Response too long. Try with a shorter resume or job description.");
    }

    const analysisText = candidate?.content?.parts?.[0]?.text;
    if (!analysisText) {
      throw new Error("Empty Gemini response");
    }

    let analysis;
    try {
      const cleaned = analysisText.replace(/```json/gi, "").replace(/```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Raw Gemini response:", analysisText);
      throw new Error("Invalid AI response format — could not parse JSON");
    }

    // Save result to database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const insertPayload: any = {
      resume_text: resumeText ? resumeText.substring(0, 5000) : `[PDF analyzed via base64 - application ${applicationId}]`,
      job_description: jobDescription.substring(0, 5000),
      overall_match_score: analysis.overallMatchScore,
      key_skills_matched: analysis.keySkillsMatched || [],
      missing_skills: analysis.missingSkills || [],
      summary: analysis.summary || "",
    };

    if (applicationId) {
      insertPayload.application_id = applicationId;
    }

    const { data: savedData, error: dbError } = await supabase
      .from("analysis_results")
      .insert(insertPayload)
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log("Analysis saved successfully:", savedData.id);

    return new Response(JSON.stringify(savedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error during processing:", err.message);
    return new Response(
      JSON.stringify({ error: "Processing failed", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
