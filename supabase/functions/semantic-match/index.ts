import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { jobId, limit = 10 } = await req.json();
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // 1. Fetch Job Embedding and Metadata
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, embedding')
      .eq('id', jobId)
      .single();

    if (jobError || !job || !job.embedding) {
      throw new Error("Job embedding not found. Ensure job has been processed.");
    }

    // 2. Fetch Recruiter Config for Weights
    const { data: config } = await supabase
      .from('matching_config')
      .select('*')
      .eq('recruiter_id', job.recruiter_id)
      .single();

    const weights = config || {
      skills_weight: 0.4,
      experience_weight: 0.3,
      domain_weight: 0.2,
      trajectory_weight: 0.1
    };

    // 3. Vector Similarity Search (Top K)
    // We use a raw SQL RPC or query to perform vector similarity
    const { data: candidates, error: matchError } = await supabase.rpc('match_candidates', {
      query_embedding: job.embedding,
      match_threshold: 0.5,
      match_count: limit * 2, // Fetch more for re-ranking
    });

    if (matchError) throw matchError;

    // 4. Rule-based Re-ranking
    const rankedCandidates = candidates.map((c: any) => {
      let ruleScore = 0;
      
      // Skill Intersection Score
      const jobSkills = new Set(job.skills_required || []);
      const candidateSkills = new Set(c.skills || []);
      const intersection = [...jobSkills].filter(x => candidateSkills.has(x));
      const skillScore = jobSkills.size > 0 ? (intersection.length / jobSkills.size) : 0;
      
      // Domain alignment (Simple string match for prototype, semantic in production)
      const domainScore = (c.domain_focus && job.job_description.toLowerCase().includes(c.domain_focus.toLowerCase())) ? 1 : 0.5;
      
      // seniority alignment
      const seniorityScore = (c.seniority && job.experience_level.toLowerCase().includes(c.seniority.toLowerCase())) ? 1 : 0.5;

      // Final Weighted Score
      // combine semantic similarity (similarity column from RPC) with rule score
      const semanticScore = c.similarity;
      const combinedScore = (semanticScore * 0.4) + 
                            (skillScore * weights.skills_weight) + 
                            (seniorityScore * weights.experience_weight) + 
                            (domainScore * weights.domain_weight);

      return {
        ...c,
        match_score: Math.round(combinedScore * 100),
        breakdown: {
          semantic: Math.round(semanticScore * 100),
          skills: Math.round(skillScore * 100),
          seniority: Math.round(seniorityScore * 100)
        }
      };
    }).sort((a: any, b: any) => b.match_score - a.match_score).slice(0, limit);

    return new Response(
      JSON.stringify(rankedCandidates),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
