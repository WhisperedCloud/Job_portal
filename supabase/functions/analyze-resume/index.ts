// supabase/functions/analyze-resume/index.ts
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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

  const { resumeText, jobDescription, applicationId } = body;
  
  if (!resumeText || !jobDescription) {
    return new Response(
      JSON.stringify({ error: "Missing resumeText or jobDescription" }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const prompt = `You are a technical recruiter. Evaluate this candidate's resume against the following job description.
      
**Job Description:**
${jobDescription}

**Resume Text:**
${resumeText}

Return a JSON object with the following structure, and no other text or explanation:
{
  "overallMatchScore": number (0-100),
  "keySkillsMatched": string[],
  "missingSkills": string[],
  "summary": string (2-3 sentences about candidate fit)
}`;

    console.log("Sending request to Gemini API...");
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`Gemini API request failed: ${errorBody}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      console.error("Invalid Gemini response:", data);
      throw new Error("Could not find analysis in Gemini response");
    }

    // Parse the JSON response
    let analysisJson;
    try {
      // Remove markdown code blocks if present
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisJson = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", analysisText);
      throw new Error("Failed to parse analysis result");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Store the result in Supabase
    const insertData: any = {
      resume_text: resumeText.substring(0, 5000), // Limit text length
      job_description: jobDescription.substring(0, 5000),
      overall_match_score: analysisJson.overallMatchScore,
      key_skills_matched: analysisJson.keySkillsMatched,
      missing_skills: analysisJson.missingSkills,
      summary: analysisJson.summary,
    };

    // Add application_id if provided
    if (applicationId) {
      insertData.application_id = applicationId;
    }

    const { data: supabaseData, error: supabaseError } = await supabase
      .from("analysis_results")
      .insert(insertData)
      .select()
      .single();

    if (supabaseError) {
      console.error("Supabase Error:", supabaseError);
      throw new Error(`Failed to store data: ${supabaseError.message}`);
    }

    return new Response(
      JSON.stringify(supabaseData), 
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