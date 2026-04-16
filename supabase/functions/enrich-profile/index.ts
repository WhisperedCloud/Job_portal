export const config = {
  verify_jwt: false,
};

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Ensure categorical fields are STRINGS. 
// If data is missing, we now return NULL to clear the mocks from the DB.
const cleanPayload = (obj: any) => {
  const clean: any = {};
  const fields = ['seniority', 'domain_focus', 'career_trajectory', 'headline', 'about'];
  
  fields.forEach(key => {
    let val = obj[key];
    if (val === null || val === undefined || val === "" || String(val).toLowerCase() === "unknown") {
      clean[key] = null; // Use null to clear the field in the database
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = val.summary || val.level || val.text || JSON.stringify(val);
    } else {
      clean[key] = String(val);
    }
  });

  // Handle skills separately as an array
  if (Array.isArray(obj.skills)) {
    clean.skills = obj.skills.filter((s: any) => s && typeof s === 'string');
  } else {
    clean.skills = [];
  }
  
  return clean;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { candidateId, linkedinUrl, resumeData: directResumeData } = await req.json();

    // Strict validation of the candidateId (Must be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!candidateId || !uuidRegex.test(candidateId)) {
      console.error("Invalid candidateId received:", candidateId);
      return new Response(
        JSON.stringify({ 
          error: "Invalid or missing candidateId", 
          received: candidateId,
          tips: "Ensure you are logged in and your profile is fully synchronized."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // 1. Fetch existing candidate data
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) throw new Error("Candidate not found");

    // 2. Fetch LinkedIn data (Now returns empty if mock is disabled)
    let linkedinData: any = {};
    if (linkedinUrl) {
      try {
        const scrapeResp = await fetch(`${SUPABASE_URL}/functions/v1/scrape-linkedin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ profileUrl: linkedinUrl })
        });
        if (scrapeResp.ok) {
          linkedinData = await scrapeResp.json();
        }
      } catch (e: any) {
        console.error("LinkedIn scraping failed", e.message || e);
      }
    }

    // 3. Prompt Construction
    const prompt = `You are a Senior Technical Recruiter. 
    Analyze the following profile data. 
    
    SOURCE DATA:
    - Current Profile: ${JSON.stringify(candidate)}
    - LinkedIn data (if any): ${JSON.stringify(linkedinData)}
    - Direct Resume Input (if any): ${JSON.stringify(directResumeData || {})}
    - Stored Resume Text (from DB): ${candidate.resume_text || "No resume text found in database."}
    
    ### STRICT RULES:
    1. NO HALLUCINATION: If the Resume and LinkedIn sources are empty or missing, DO NOT make up a career.
    2. SENIORITY: If the candidate is a student or intern, seniority MUST be 'Fresher' or 'Junior'.
    3. NO MOCKS: Do not use generic software engineering descriptions if no data exists.
    4. MISSING DATA: If a field cannot be inferred, return null for that field.

    OUTPUT SCHEMA (JSON):
    {
      "name": "string (The real Full Name of the candidate, e.g. 'John Doe') or null",
      "seniority": "string (e.g. 'Fresher', 'Junior', 'Mid', 'Senior') or null",
      "domain_focus": "string or null",
      "career_trajectory": "string (one concise sentence) or null",
      "headline": "string or null",
      "about": "string or null",
      "skills": ["string"]
    }
    
    Return ONLY a plain JSON object.`;

    // Matrix of models to try. We prioritize Gemini 2.5 and 3.1 (April 2026 standards)
    const models = [
      "gemini-2.5-flash", 
      "gemini-3.1-flash-lite-preview", 
      "gemini-1.5-flash", 
      "gemini-1.5-flash-latest"
    ];
    let geminiResp: any;
    let geminiErrorTxt = "";

    const versions = ["v1", "v1beta"];

    for (const version of versions) {
      for (const model of models) {
        const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        console.log(`Trying Gemini: ${version}/${model}`);
        try {
          geminiResp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
            }),
          });
          if (geminiResp.ok) {
            geminiErrorTxt = ""; 
            break;
          }
          geminiErrorTxt = await geminiResp.text();
          console.warn(`Failed ${version}/${model}: ${geminiResp.status} - ${geminiErrorTxt}`);
        } catch (err: any) {
          geminiErrorTxt = err.message || String(err);
          console.warn(`Fetch error on ${version}/${model}:`, geminiErrorTxt);
        }
      }
      if (geminiResp?.ok) break;
    }

    if (!geminiResp || !geminiResp.ok) {
       console.error("Gemini failed all endpoints. Last error:", geminiErrorTxt);
    }

    let rawAiResponse = "";
    let aiEnrichment: any = {};

    if (geminiResp?.ok) {
      try {
        const gData = await geminiResp.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          rawAiResponse = text;
          try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            aiEnrichment = JSON.parse(cleaned);
          } catch (e: any) {
            console.error("AI Parse Error", e.message || e);
          }
        }
      } catch (jsonErr: any) {
        console.error("Failed to parse Gemini JSON:", jsonErr.message);
        geminiErrorTxt = `JSON Parse Error: ${jsonErr.message}`;
      }
    }

    // 4. Data Cleaning & Database Update
    const cleanedEnrichment = cleanPayload(aiEnrichment);
    
    const updatePayload: any = {
      ...cleanedEnrichment,
      updated_at: new Date().toISOString(),
    };

    // If we have a scraped LinkedIn name or an AI-extracted name, use it.
    // This fixed the "rockyeswar78 instead of Eswar M" problem.
    if (cleanedEnrichment.name) {
      updatePayload.name = cleanedEnrichment.name;
    } else if (linkedinData?.full_name) {
      updatePayload.name = linkedinData.full_name;
    }
    
    const { error: updateError } = await supabase
      .from('candidates')
      .update(updatePayload)
      .eq('id', candidateId);

    if (updateError) console.error("Database update failed:", updateError);

    // 5. Success Return
    console.log("Enrichment process completed successfully for candidate:", candidateId);

    return new Response(
      JSON.stringify({ 
        message: "Profile processed successfully", 
        debug: { 
          apiStatus: geminiResp?.status || 200,
          apiResponse: geminiErrorTxt || "Success",
          apiError: updateError ? `DB Update: ${updateError.message}` : null,
        },
        enrichment: updatePayload
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("CRITICAL FUNCTION ERROR:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: err.message || String(err),
        stack: err.stack 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
