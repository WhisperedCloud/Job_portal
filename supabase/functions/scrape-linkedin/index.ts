import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { profileUrl } = await req.json();
    console.log(`Real LinkedIn scraping requested for: ${profileUrl}`);

    // MOCK REMOVED as requested.
    // In production, you would integrate with an API like Proxycurl or Scrupp here.
    // For now, we return empty data to force the AI to rely on the Resume source.
    const emptyData = {
      full_name: null,
      headline: null,
      location: null,
      summary: null,
      skills: [],
      experience: [],
      education: []
    };

    return new Response(JSON.stringify(emptyData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
