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
    const { candidateId, jobId, action, recruiterId } = await req.json();

    if (!candidateId || !jobId || !action) {
      throw new Error("Missing required fields");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    // Log the signal
    const { error: signalError } = await supabase
      .from('ranker_signals')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        recruiter_id: recruiterId,
        action,
        weight: action === 'hire' ? 5.0 : (action === 'shortlist' ? 2.0 : -1.0)
      });

    if (signalError) throw signalError;

    // Optional: Trigger a weight update if enough signals exist
    // For now, we just acknowledge receipt.

    return new Response(
      JSON.stringify({ message: "Feedback captured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
