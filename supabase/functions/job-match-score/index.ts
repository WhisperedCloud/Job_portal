import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── AI UTILS (GLOBAL) ───────────────────────────────────────────────────────

async function getEmbedding(text: string) {
  if (!GEMINI_API_KEY) return [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        }),
      }
    );
    const data = await res.json();
    return data.embedding?.values || [];
  } catch (e) {
    console.error("Embedding fetch error:", e);
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + (val * b[i]), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + (val * val), 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + (val * val), 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

const skillGraph: Record<string, string[]> = {
  react: ["next.js", "javascript", "frontend"],
  node: ["express", "backend", "javascript"],
  python: ["django", "flask", "backend"],
  sql: ["postgresql", "mysql", "database"],
  java: ["spring", "backend"],
  aws: ["cloud", "devops"],
};

function expandSkills(skills: string[]) {
  const expanded = new Set(skills.map(s => s.toLowerCase()));
  skills.forEach(skill => {
    skillGraph[skill.toLowerCase()]?.forEach(r => expanded.add(r));
  });
  return Array.from(expanded);
}

function normalizeArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch { }
    }
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    try {
      const values = Object.values(value);
      if (values.length > 0) return values.map((s) => String(s).trim()).filter(Boolean);
    } catch { }
  }
  return [];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  console.log('Ping: Edge Function INVOKED', { method: req.method, url: req.url });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("Edge Function Logic Starting...");
    console.log("Environment check:", {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_KEY,
      hasGeminiKey: !!GEMINI_API_KEY
    });

    const body = await req.json();
    const { candidateId, jobId } = body;
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_KEY!
    );

    // DB Connectivity Test
    const { count, error: dbTestErr } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });

    console.log("DB Connectivity Test:", {
      success: !dbTestErr,
      count,
      error: dbTestErr ? { message: dbTestErr.message, code: dbTestErr.code } : null
    });

    if (dbTestErr) {
      console.warn("Internal DB access issues detected. Analysis might fail if RLS blocks reads.");
    }

    if (!candidateId || !jobId) {
      return jsonResponse({ error: "Missing candidateId or jobId" }, 400);
    }
    const [{ data: candidate, error: cErr }, { data: job, error: jErr }] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", candidateId).single(),
      supabase.from("jobs").select("*").eq("id", jobId).single(),
    ]);

    if (cErr || !candidate) return jsonResponse({ error: "Candidate not found" }, 404);
    if (jErr || !job) return jsonResponse({ error: "Job not found" }, 404);

    // 2. Normalize Inputs
    let jobSkills = normalizeArray(job.skills_required);

    if (jobSkills.length === 0 && job.job_description) {
      jobSkills = job.job_description
        .toLowerCase()
        .match(/\b(react|node|python|java|sql|mongodb|express|aws|docker|typescript|javascript)\b/g) || [];
    }
    const candidateResume = String(body.candidateResume || candidate.resume_text || "");
    const candidateLinkedIn = String(body.candidateLinkedIn || candidate.linkedin_summary || "");
    const candidateProjects = String(body.candidateProjects || candidate.projects || "");
    const candidateExp = String(body.candidateExperience || candidate.experience || "");
    const candidateSkills = body.candidateSkills
      ? normalizeArray(body.candidateSkills)
      : normalizeArray(candidate.skills);

    // Skill expansion & Heuristic match
    const expandedCandSkills = expandSkills(candidateSkills);
    function isSkillMatch(a: string, b: string) {
      a = a.toLowerCase();
      b = b.toLowerCase();

      return (
        a === b ||
        a.includes(b) ||
        b.includes(a) ||
        a.replace('.js', '') === b.replace('.js', '') ||
        a.replace('.', '') === b.replace('.', '')
      );
    }

    const matchedSkills = expandedCandSkills.filter(s =>
      jobSkills.some(js => isSkillMatch(s, js))
    );
    const missingSkills = jobSkills.filter(js =>
      !expandedCandSkills.some(cs => js.toLowerCase().includes(cs) || cs.includes(js.toLowerCase()))
    );

    const candidateDomains = normalizeArray(candidate.domain_expertise);
    const candidateTrajectory = String(candidate.career_trajectory || "N/A");

    // 3. Semantic Similarity calculation
    let semanticScore = 0;
    try {
      const candText = `
SKILLS: ${candidateSkills.join(", ")}

EXPERIENCE:
${candidateExp}

RESUME:
${candidateResume}

LINKEDIN:
${candidateLinkedIn}

PROJECTS:
${candidateProjects}

DOMAINS:
${candidateDomains.join(", ")}
`;
      const jobText = `Title: ${job.title}, Description: ${job.job_description}, Skills: ${jobSkills.join(", ")}`;
      const [candVec, jobVec] = await Promise.all([getEmbedding(candText), getEmbedding(jobText)]);
      semanticScore = cosineSimilarity(candVec, jobVec) * 100;
    } catch (e) {
      console.warn("Semantic embedding failed:", e);
    }

    // 4. Gemini AI Deep Analysis
    let finalResult: any = null;
    let isRealAI = false;
    let debug_info: string | null = null;

    if (GEMINI_API_KEY) {
      try {
        const TRUNC_LIMIT = 4000;
        const llmPrompt = `
You are a Senior AI Hiring Manager.

Analyze the candidate HOLISTICALLY.

DO NOT rely only on explicit skills.
Infer skills from:
- projects
- resume
- experience
- linkedin profile
- career trajectory

Example:
"Built a React dashboard" → infer:
React, API, UI, frontend

---

CANDIDATE:
Skills: ${candidateSkills.join(", ")}

Experience:
${candidateExp}

Resume:
${candidateResume}

LinkedIn:
${candidateLinkedIn}

Projects:
${candidateProjects}

Trajectory:
${candidateTrajectory}

---

JOB:
Title: ${job.title}
Description: ${job.job_description}
Required Skills: ${jobSkills.join(", ")}

---

RULES:
- Prioritize REAL EXPERIENCE over keywords
- Give HIGH score if candidate has similar project work
- Do NOT penalize missing keywords if equivalent skills exist

---

RETURN JSON:
{
  "score": number,
  "confidence": number,
  "strengths": string[],
  "growthAreas": string[],
  "hiddenStrengths": string[],
  "riskFactors": string[],
  "domainBreakdown": [
    {
      "domain": string,
      "score": number,
      "matchedInsights": string[],
      "gaps": string[]
    }
  ],
  "summary": string
}
`;
        console.log("🧠 [AI] Calling Gemini v1beta (1.5-flash)...");
        const ACTIVE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const llmResp = await fetch(ACTIVE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.1, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            },
          }),
        });

        if (!llmResp.ok) {
          const errBody = await llmResp.text();
          console.error(`AI Error (${llmResp.status}):`, errBody);
          if (llmResp.status === 429) {
            debug_info = "AI Quota Exceeded. Please wait a minute.";
          } else {
            debug_info = `AI Error: ${llmResp.status}`;
          }
        } else {
          const llmData = await llmResp.json();
          const rawText = llmData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
          
          // 🛡️ Robust JSON Extraction
          let parsed: any = {};
          try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '').trim() : rawText;
            parsed = JSON.parse(cleanJson);
          } catch (e) {
            console.error("❌ [PARSER ERROR] Extraction failed. Raw:", rawText.substring(0, 500));
            debug_info = "AI returned malformed JSON.";
          }

          if (parsed.confidence !== undefined && parsed.confidence > 1) {
            parsed.confidence = parsed.confidence / 100;
          }

          if (parsed.score !== undefined && parsed.summary) {
            finalResult = parsed;
            isRealAI = true;
          }
        }
      } catch (err: any) {
        console.error("Gemini Error:", err);
        debug_info = `AI Request Failed: ${err.message}`;
      }
    }

    // 5. Heuristic Fallback (if AI fails)
    if (!finalResult) {
      const skillMatchRatio = matchedSkills.length / (jobSkills.length || 1);
      const skillScore = Math.min(100, skillMatchRatio * 100);
      const compositeScore = Math.round(
        skillScore * 0.5 +
        semanticScore * 0.3 +
        (candidateExp.length > 100 ? 20 : 10)
      );
      finalResult = {
        score: Math.min(100, compositeScore),
        confidence: 0.7,
        strengths: matchedSkills.length > 0 ? [`Matches core skills: ${matchedSkills.slice(0, 3).join(", ")}`] : ["Relevant background found in profile"],
        growthAreas: missingSkills.length > 0 ? [`Gap in specific tools: ${missingSkills.slice(0, 2).join(", ")}`] : ["Further domain specialization recommended"],
        hiddenStrengths: ["Strong technical adaptability", "Career trajectory alignment"],
        riskFactors: [missingSkills.length > 3 ? "Significant tech stack transition required" : "Minor adjustment period"],
        domainBreakdown: [{ domain: "Core Technical", score: Math.round(skillScore), matchedInsights: matchedSkills, gaps: missingSkills.slice(0, 3) }],
        summary: `Heuristic Analysis: The candidate demonstrates a ${compositeScore}% alignment with the ${job.title} role. This score considers technical skill matching (${Math.round(skillScore)}%) and semantic role similarity (${Math.round(semanticScore)}%).`
      };
    }

    // 6. Response
    return jsonResponse({
      ...finalResult,
      jobId,
      candidateId,
      isRealAI,
      debug_info,
      processedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("job-match-score error:", err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
});