import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY");
const PINECONE_HOST = Deno.env.get("PINECONE_HOST"); // e.g. https://index-name-id.svc.region.pinecone.io
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id, text, type } = await req.json(); // type: 'candidate' | 'job'

    if (!id || !text) throw new Error("Missing id or text");

    console.log(`Generating embedding for ${type} ${id}`);

    // 1. Generate Embedding using Gemini
    const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
    
    const embedResponse = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text }] }
      }),
    });

    const embedData = await embedResponse.json();
    const vector = embedData.embedding.values;

    // 2. Store in Pinecone
    if (PINECONE_API_KEY && PINECONE_HOST) {
      console.log("Upserting to Pinecone...");
      const pineconeResponse = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          vectors: [{
            id: `${type}_${id}`,
            values: vector,
            metadata: { id, type }
          }],
          namespace: "job-portal"
        })
      });

      if (!pineconeResponse.ok) throw new Error("Pinecone upsert failed");
    }

    // 3. Update Supabase with vector_id
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
    const table = type === 'candidate' ? 'candidates' : 'jobs';
    const column = type === 'candidate' ? 'vector_id' : 'job_vector_id';

    const { error: updateError } = await supabase
      .from(table)
      .update({ [column]: `${type}_${id}` })
      .eq('id', id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: "Embedding stored successfully", vector_id: `${type}_${id}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
