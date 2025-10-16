import { supabase } from "@/integrations/supabase/client";
import { notifyCandidatesOnJobPost } from "@/utils/notifyCandidatesOnJobPost";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const jobData = req.body;

    const { data: job, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .single();

    if (error || !job) {
      return res.status(500).json({ error: error?.message || "Job creation failed" });
    }

    try {
      await notifyCandidatesOnJobPost(supabase, job);
    } catch (notificationError) {
      console.error('Error notifying candidates:', notificationError);
    }

    return res.status(201).json(job);
  }

  return res.status(405).json({ error: "Method not allowed" });
}