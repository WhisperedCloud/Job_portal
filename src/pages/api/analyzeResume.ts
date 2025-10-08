import { supabase } from "../../integrations/supabase/client";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ keep secret, set in .env
});

export async function POST(req, res) {
  try {
    const { candidateId, jobId, fileUrl } = await req.json();

    // Fetch job data (skills required) from Supabase
    const { data: job } = await supabase
      .from("jobs")
      .select("title, skills_required")
      .eq("id", jobId)
      .single();

    // Extract text from the resume file (simplified)
    const resumeText = await fetch(fileUrl).then((r) => r.text());

    // Call OpenAI model
    const prompt = `
Compare this resume to the job role:
Job Title: ${job.title}
Required Skills: ${job.skills_required}

Resume Content:
${resumeText}

Return JSON with:
{
  "role_fit_score": number (0-100),
  "skills_matched": string[],
  "skills_missing": string[],
  "recommendation": string
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    await supabase.from("resume_scores" as any).insert([
      { candidate_id: candidateId, job_id: jobId, analysis },
    ]);

    return res.status(200).json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to analyze resume" });
  }
}
