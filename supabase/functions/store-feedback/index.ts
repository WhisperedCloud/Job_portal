import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { candidateId, jobId, actionType } = await req.json();

    if (!candidateId || !jobId || !actionType) {
      throw new Error("Missing candidateId, jobId or actionType");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Calculate score boost based on the action
    let scoreBoost = 0;
    switch (actionType) {
      case 'shortlist': scoreBoost = 5.0; break;
      case 'hire': scoreBoost = 20.0; break;
      case 'reject': scoreBoost = -15.0; break;
      case 'view': scoreBoost = 1.0; break;
      default: scoreBoost = 0;
    }

    console.log(`Storing feedback: ${actionType} for candidate ${candidateId} at job ${jobId} (Boost: ${scoreBoost})`);

    const { error } = await supabase
      .from('ranker_signals')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        action_type: actionType,
        score_boost: scoreBoost
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "Feedback stored successfully", scoreBoost }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
