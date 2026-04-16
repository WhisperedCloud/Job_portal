export const config = {
  verify_jwt: false,
};

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

    const promptText = `You are a technical recruiter. Compare the candidate's resume with the job description.

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "candidate_name": "Full Name of the candidate (e.g. 'John Doe')",
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

    const models = [
      "gemini-2.5-flash", 
      "gemini-3.1-flash-lite-preview", 
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest"
    ];
    const versions = ["v1", "v1beta"];

    let response;
    let geminiErrorTxt = "";

    outerLoop: for (const version of versions) {
      for (const model of models) {
        const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        console.log(`Trying Gemini: ${version}/${model}`);
        try {
          response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
            }),
          });
          
          if (response.ok) {
            geminiErrorTxt = "";
            break outerLoop;
          }
          geminiErrorTxt = await response.text();
          console.warn(`Failed ${version}/${model}: ${response.status} - ${geminiErrorTxt}`);
        } catch (err: any) {
          geminiErrorTxt = err.message || String(err);
          console.warn(`Fetch error on ${version}/${model}:`, geminiErrorTxt);
        }
      }
    }

    if (!response || !response.ok) {
      console.error("Gemini API Error:", geminiErrorTxt);
      if (response && response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI quota exceeded across all models. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API request failed on all fallbacks: ${geminiErrorTxt}`);
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

    // Lazy Name Correction
    if (analysis.candidate_name) {
      try {
        const { data: appData } = await supabase
          .from('applications')
          .select('candidate_id')
          .eq('id', applicationId)
          .single();
        
        if (appData?.candidate_id) {
          const { data: candData } = await supabase
            .from('candidates')
            .select('name, email')
            .eq('id', appData.candidate_id)
            .single();
          
          const currentName = candData?.name || '';
          const emailPrefix = candData?.email?.split('@')[0] || '';
          
          if (!currentName || currentName === emailPrefix || !currentName.includes(' ')) {
            console.log(`Updating candidate ${appData.candidate_id} name to ${analysis.candidate_name}`);
            await supabase
              .from('candidates')
              .update({ name: analysis.candidate_name, updated_at: new Date().toISOString() })
              .eq('id', appData.candidate_id);
          }
        }
      } catch (err) {
        console.warn("Lazy name update failed:", err);
      }
    }

    console.log("Analysis saved successfully:", savedData.id);

    return new Response(JSON.stringify({ ...savedData, candidate_name: analysis.candidate_name }), {
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
