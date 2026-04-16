import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getEmbedding(text: string): Promise<number[]> {
  const model = "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:embedContent?key=${GEMINI_API_KEY}`;
  
  let response;
  let lastError = "";

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1/models/${model}:embedContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_API_KEY}`
  ];

  for (const endpoint of endpoints) {
    console.log(`Trying Embedding endpoint: ${endpoint.split('=')[0]}`);
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        }),
      });
      if (response.ok) break;
      lastError = await response.text();
    } catch (err) {
      console.warn(`Fetch error on ${endpoint}:`, err);
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Gemini Embedding failed all endpoints. Latest error: ${lastError}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { candidateId, jobId } = await req.json();
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    if (candidateId) {
      console.log(`Generating embedding for candidate: ${candidateId}`);
      const { data: candidate } = await supabase.from('candidates').select('*').eq('id', candidateId).single();
      if (candidate) {
        const textToEmbed = `
          Name: ${candidate.name}
          Skills: ${(candidate.skills || []).join(', ')}
          Experience: ${candidate.experience}
          Seniority: ${candidate.seniority}
          Domain: ${candidate.domain_focus}
          Trajectory: ${candidate.career_trajectory}
          Education: ${candidate.education}
        `.trim();
        const embedding = await getEmbedding(textToEmbed);
        await supabase.from('candidates').update({ embedding }).eq('id', candidateId);
      }
    }

    if (jobId) {
      console.log(`Generating embedding for job: ${jobId}`);
      const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single();
      if (job) {
        const textToEmbed = `
          Title: ${job.title}
          Description: ${job.job_description}
          Skills Required: ${(job.skills_required || []).join(', ')}
          Experience Level: ${job.experience_level}
          Qualification: ${job.qualification}
        `.trim();
        const embedding = await getEmbedding(textToEmbed);
        await supabase.from('jobs').update({ embedding }).eq('id', jobId);
      }
    }

    return new Response(
      JSON.stringify({ message: "Embedding generated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
