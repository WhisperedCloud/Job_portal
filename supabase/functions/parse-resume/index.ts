export const config = {
  verify_jwt: false,
  skip_jwt_verification: true,
};

/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 🛠️ SENIOR ENGINEER REFACTOR: parse-resume
 * Goal: Zero-Crash, High Observability, Robust JSON extraction
 */
serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  console.log(`🔐 [AUTH] Header present: ${!!authHeader} (starts with ${authHeader?.substring(0, 15) || 'N/A'})`);


  // 🛡️ SECURITY: Request Validation
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const startTime = Date.now();
  console.log("🚀 [INBOUND] Processing resume parsing request...");

  try {
    // 2. Parse and Validate Request Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("❌ [ERROR] Invalid JSON in request body");
      return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { resumeBase64, mimeType, candidateId } = body;

    // 🛡️ INPUT VALIDATION
    if (!resumeBase64 || resumeBase64.length < 100) {
      console.warn("⚠️ [WARN] Missing or excessively short resumeBase64");
      return new Response(JSON.stringify({ error: "Valid resumeBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`📊 [STATS] CandidateID: ${candidateId || 'N/A'}`);
    console.log(`📊 [STATS] Payload Size: ${(resumeBase64.length / 1024).toFixed(2)} KB`);
    console.log(`📊 [STATS] MIME Type: ${mimeType || 'unknown'}`);

    // check API Key health
    if (!GEMINI_API_KEY) {
      console.error("❌ [CRITICAL] GEMINI_API_KEY is not set in environment secrets");
      throw new Error("Configuration Error: AI Service Key missing");
    } else {
      console.log(`🔑 [DEBUG] API Key starts with: ${GEMINI_API_KEY.substring(0, 4)}... (Total: ${GEMINI_API_KEY.length} chars)`);
    }

    const prompt = `You are a professional resume parser. Analyze the document and extract structured data.
    Return ONLY a single valid JSON object. No preamble, no markdown formatting.
    Structure:
    {
      "name": "string",
      "phone": "string",
      "location": "string",
      "skills": ["string"],
      "experience": "text summary",
      "education": "text summary",
      "linkedin_url": "string or null",
      "seniority_level": "Junior/Mid/Senior/Lead",
      "domain_expertise": ["string"],
      "career_trajectory": "text summary",
      "projects": "text summary",
      "linkedin_summary": "professional summary",
      "resume_text": "full extracted text"
    }`;

    // 3. Invoke Gemini API
    console.log("🧠 [AI] Calling Gemini v1beta (1.5-flash)...");

    // 🛡️ Gemini 1.5 Flash stable model name
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // 🛡️ Final Base64 Sanitization: Clean padding and whitespace
    const finalBase64 = resumeBase64.trim().replace(/\s/g, '');

    // 🛡️ Supported Doc Types: PDF, DOCX, DOC, TXT (Gemini inline_data supports PDF and common image types)
    const finalMimeType = mimeType || "application/pdf";

    // 🚨 Reject unsupported formats
    if (
      finalMimeType !== "application/pdf" &&
      finalMimeType !== "image/png" &&
      finalMimeType !== "image/jpeg"
    ) {
      return new Response(JSON.stringify({
        error: "Unsupported file type. Please upload PDF only."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: finalMimeType, data: finalBase64 } }
          ]
        }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 2048, 
          responseMimeType: "application/json" 
        },
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error(`❌ [AI ERROR] Status: ${apiResponse.status} - Body: ${errBody}`);

      if (apiResponse.status === 429) {
        return new Response(JSON.stringify({
          error: "Quota Exceeded",
          status: 429,
          details: "Gemini API free tier limit reached. Please wait a moment or upgrade your plan.",
          hint: "The free tier allows 15 requests per minute. Try again in 60 seconds."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        error: "Gemini API Error",
        status: apiResponse.status,
        details: errBody,
        hint: "Check if your GEMINI_API_KEY is active and has access to gemini-1.5-flash."
      }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await apiResponse.json();
    console.log("✅ [AI SUCCESS] Response received from Gemini");

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("❌ [AI ERROR] Empty response content from Gemini", JSON.stringify(data));
      throw new Error("AI provider returned empty content");
    }

    // 4. Robust JSON Extraction
    console.log("🧹 [PARSER] Cleaning AI output for JSON extraction...");
    let parsedData;
    try {
      // Find JSON object using balanced brace regex
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("⚠️ [WARN] No JSON braces found. Raw output:", rawText.substring(0, 200));
        throw new Error("No JSON structure detected in AI response");
      }

      const cleanJson = jsonMatch[0].replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
      console.log("✅ [PARSER SUCCESS] Data successfully mapped to JSON schema");
    } catch (parseErr) {
      console.error("❌ [PARSER ERROR] Extraction failed. Raw Text Snippet:", rawText.substring(0, 500));
      return new Response(JSON.stringify({
        error: "Data parsing failed",
        raw_output: rawText.substring(0, 1000)
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const duration = Date.now() - startTime;
    console.log(`🎯 [COMPLETE] Request fulfilled in ${duration}ms`);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("❌ [FATAL ERROR] Unhandled Exception:", err.message);
    return new Response(JSON.stringify({
      error: "Internal Processing Failure",
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 3).join("\n") // Partial stack trace for security
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});