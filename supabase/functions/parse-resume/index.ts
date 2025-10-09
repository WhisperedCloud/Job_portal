/// <reference lib="deno.ns" />

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

  const { resumeBase64, mimeType, candidateId } = body;
  
  if (!resumeBase64) {
    return new Response(
      JSON.stringify({ error: "Missing resumeBase64" }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log(`Parsing resume for candidate: ${candidateId}`);
    console.log(`Resume base64 length: ${resumeBase64.length}`);
    console.log(`MIME type: ${mimeType}`);

    const prompt = `You are a resume parser. Analyze the resume document and extract the following information:

**Instructions:**
1. Extract the candidate's full name
2. Extract phone number (with country code if available)
3. Extract all skills mentioned in the resume
4. Extract work experience (company names, job titles, dates)
5. Extract education (degree, institution, year)
6. Extract location/address if available
7. Extract any certifications or licenses

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Full Name",
  "phone": "Phone number with country code",
  "location": "City, State/Country",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": "Detailed work experience as text",
  "education": "Education details as text",
  "license_type": "Certification or License name if any",
  "license_number": "License number if available"
}

If any field is not found in the resume, use null for that field.`;

    console.log("Sending request to Gemini API...");
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || "application/pdf",
                data: resumeBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
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
    console.log("Gemini response structure:", JSON.stringify(data, null, 2));
    
    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    
    console.log(`Finish reason: ${finishReason}`);
    
    if (finishReason === "MAX_TOKENS") {
      console.error("Gemini response exceeded MAX_TOKENS limit");
      throw new Error("Response too long. Try with a shorter resume.");
    }
    
    const parsedText = candidate?.content?.parts?.[0]?.text;

    if (!parsedText) {
      console.error("Invalid Gemini response - no parsed text:", JSON.stringify(data));
      throw new Error("Could not parse resume");
    }

    console.log("Raw parsed text:", parsedText);

    // Parse the JSON response
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanedText = parsedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanedText);
      console.log("Parsed resume data:", parsedData);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parsedText);
      throw new Error("Failed to parse resume data");
    }

    // If candidateId is provided, update the candidate profile
    if (candidateId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

      const updateData: any = {};
      
      if (parsedData.name) updateData.name = parsedData.name;
      if (parsedData.phone) updateData.phone = parsedData.phone;
      if (parsedData.location) updateData.location = parsedData.location;
      if (parsedData.skills && parsedData.skills.length > 0) {
        // Get existing skills and merge
        const { data: existingProfile } = await supabase
          .from('candidates')
          .select('skills')
          .eq('id', candidateId)
          .single();
        
        const existingSkills = existingProfile?.skills || [];
        const mergedSkills = [...new Set([...existingSkills, ...parsedData.skills])];
        updateData.skills = mergedSkills;
      }
      if (parsedData.experience) updateData.experience = parsedData.experience;
      if (parsedData.education) updateData.education = parsedData.education;
      if (parsedData.license_type) updateData.license_type = parsedData.license_type;
      if (parsedData.license_number) updateData.license_number = parsedData.license_number;

      const { error: updateError } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('id', candidateId);

      if (updateError) {
        console.error("Supabase Update Error:", updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      console.log("Profile updated successfully!");
    }

    return new Response(
      JSON.stringify(parsedData), 
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