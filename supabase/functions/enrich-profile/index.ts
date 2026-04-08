import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { candidateId, linkedinUrl } = await req.json();

    if (!candidateId || !linkedinUrl) {
      return new Response(JSON.stringify({ error: "Missing candidateId or linkedinUrl" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Fetch current candidate profile
    const { data: profile, error: profileError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (profileError || !profile) {
      console.error("❌ Candidate not found:", candidateId);
      return new Response(JSON.stringify({ error: "Candidate profile not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const enrichmentPrompt = `You are a Senior Career Analyst. Analyze the profile and LinkedIn URL to generate enrichment data.
    LinkedIn: ${linkedinUrl}
    Current Profile: ${profile.name}, ${profile.location}, Skills: ${(profile.skills || []).join(', ')}

    Return ONLY JSON:
    {
      "seniority_level": "Junior/Mid/Senior/Lead",
      "domain_expertise": ["string"],
      "career_trajectory": "2-3 sentence summary",
      "additional_skills": ["string"]
    }`;

    console.log("🧠 [AI] Calling Gemini v1beta (1.5-flash)...");
    const ACTIVE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(ACTIVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enrichmentPrompt }] }],
        generationConfig: { 
          temperature: 0.2, 
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`❌ [AI ERROR] status: ${geminiResponse.status} - ${errText}`);
      if (geminiResponse.status === 429) {
        throw new Error("AI Quota Exceeded. Please try again in 60s.");
      }
      throw new Error(`Gemini API failure: ${errText.substring(0, 200)}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    // 🛡️ Robust JSON Extraction
    let enrichmentResult: any;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '').trim() : rawText;
      enrichmentResult = JSON.parse(cleanJson);
    } catch {
      console.error("❌ [PARSER ERROR] Extraction failed. Raw:", rawText.substring(0, 500));
      throw new Error("Failed to parse AI enrichment data");
    }

    // Merge skills
    const existingSkillsLower = (profile.skills || []).map((s: string) => s.toLowerCase());
    const newSkills = (enrichmentResult.additional_skills || []).filter(
      (s: string) => !existingSkillsLower.includes(s.toLowerCase())
    );
    const updatedSkills = [...(profile.skills || []), ...newSkills];

    // Update candidate record
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        linkedin_url: linkedinUrl,
        seniority_level: enrichmentResult.seniority_level || null,
        domain_expertise: enrichmentResult.domain_expertise || [],
        career_trajectory: enrichmentResult.career_trajectory || null,
        skills: updatedSkills,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      message: "Profile enriched",
      data: enrichmentResult
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("❌ Enrichment Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
