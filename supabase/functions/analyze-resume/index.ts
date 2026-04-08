import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const SENIORITY_MAP: Record<string, number> = {
  'Junior': 1, 'Mid': 2, 'Senior': 3, 'Lead': 4, 'Staff': 5, 'Principal': 6,
  'fresher': 1, 'experienced': 3,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { resumeBase64, mimeType, resumeText, jobDescription, applicationId } = body;

    if (!resumeBase64 && !resumeText) {
      throw new Error("Resume content (base64 or text) is required");
    }
    if (!jobDescription) {
      throw new Error("Job description is required");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // 1. Fetch Application & Candidate Data if applicationId exists
    let candidateData: any = null;
    if (applicationId) {
      const { data: application, error: appErr } = await supabase
        .from("applications")
        .select("candidate_id")
        .eq("id", applicationId)
        .single();
      
      if (!appErr && application?.candidate_id) {
        const { data: candidate } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", application.candidate_id)
          .single();
        candidateData = candidate;
      }
    }

    // 2. Hybrid Scoring Components
    const jobSkills: string[] = (jobDescription.match(/([a-zA-Z+#]{2,})/g) || []).slice(0, 10); // Basic extraction if no skills list
    // In a real scenario, we'd extract skills from jobDescription using LLM first, 
    // but for this unify-fix, we'll rely on the LLM's deep analysis for the main score.

    const candSkills: string[] = candidateData?.skills || [];
    const matchedSkills = candSkills.filter((s: string) => 
      jobDescription.toLowerCase().includes(s.toLowerCase())
    );

    // --- GEMINI PROMPT ---
    const llmPrompt = `You are an expert technical recruiter analyzing a candidate's fit for a job.
    
    JOB DESCRIPTION:
    ${jobDescription}
    
    CANDIDATE DATA (from Profile):
    ${candidateData ? JSON.stringify({
      skills: candidateData.skills,
      seniority: candidateData.seniority_level,
      domain: candidateData.domain_expertise,
      trajectory: candidateData.career_trajectory,
      experience: candidateData.experience?.substring(0, 500)
    }) : 'No existing profile data.'}
    
    RESUME CONTENT (to analyze):
    ${resumeText || '[See attached PDF relative to this analysis]'}

    Analyze the match and return ONLY valid JSON:
    {
      "overallMatchScore": 85,
      "summary": "Deep-dive summary of candidate fit...",
      "keySkillsMatched": ["skill1", "skill2"],
      "missingSkills": ["skill1", "skill2"],
      "strengths": ["...", "..."],
      "gaps": ["...", "..."],
      "seniorityScore": 80,
      "skillScore": 75
    }`;

    // --- AI STRATEGY: GEMINI 1.5 FLASH (STABLE) ---
    console.log("🧠 [AI] Calling Gemini v1beta (1.5-flash)...");
    
    // Final Base64 Sanitization
    const finalBase64 = resumeBase64?.trim().replace(/\s/g, '');

    // Note: GEMINI_API_URL is already defined at top of file, but we should ensure it uses 1.5-flash
    const ACTIVE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResp = await fetch(ACTIVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: llmPrompt },
            ...(finalBase64 ? [{ inline_data: { mime_type: mimeType || "application/pdf", data: finalBase64 } }] : [])
          ]
        }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!geminiResp.ok) {
      const errBody = await geminiResp.text();
      console.error(`❌ [AI ERROR] Status: ${geminiResp.status} - ${errBody}`);
      if (geminiResp.status === 429) {
        throw new Error("AI Quota Exceeded. Gemini free tier allows 15 requests per minute. Please wait 60s.");
      }
      throw new Error(`AI Provider Error (${geminiResp.status}): ${errBody.substring(0, 200)}`);
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    
    // 🛡️ ROBUST EXTRACTION
    let result: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '').trim() : rawText;
      result = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("❌ [PARSER ERROR] Extraction failed. Raw:", rawText.substring(0, 500));
      throw new Error("AI returned malformed data. Please try again.");
    }

    // 3. Save to analysis_results
    const insertPayload = {
      application_id: applicationId || null,
      overall_match_score: Number(result.overallMatchScore) || 0,
      key_skills_matched: result.keySkillsMatched || [],
      missing_skills: result.missingSkills || [],
      summary: result.summary || "",
      strengths: result.strengths || [],
      gaps: result.gaps || [],
      breakdown: {
        skill_score: result.skillScore,
        seniority_score: result.seniorityScore,
        llm_analysis: result.summary,
        matched_count: (result.keySkillsMatched || []).length,
        missing_count: (result.missingSkills || []).length
      }
    };

    const { data: savedData, error: dbError } = await supabase
      .from("analysis_results")
      .insert(insertPayload)
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify(savedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("analyze-resume error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
