/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { 
      candidateId, 
      applicationId, 
      interviewDate, 
      interviewTime, 
      interviewVenue, 
      interviewMode,
      interviewLink,
      isReschedule = false,
      rescheduleReason = ''
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get candidate and job details
    const { data: candidate } = await supabase
      .from('candidates')
      .select('user_id, name')
      .eq('id', candidateId)
      .single();

    const { data: application } = await supabase
      .from('applications')
      .select('job_id, jobs(title, company_name)')
      .eq('id', applicationId)
      .single();

    if (!candidate || !application) {
      throw new Error('Candidate or application not found');
    }

    // Format date and time
    const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create notification message
    const title = isReschedule 
      ? '📅 Interview Rescheduled' 
      : '🎉 Interview Scheduled!';
    
    let message = isReschedule
      ? `Your interview for ${application.jobs.title} at ${application.jobs.company_name} has been rescheduled.\n\n`
      : `Great news! Your interview for ${application.jobs.title} at ${application.jobs.company_name} has been scheduled.\n\n`;

    message += `📅 Date: ${formattedDate}\n`;
    message += `🕒 Time: ${interviewTime}\n`;
    
    if (interviewMode === 'in-person') {
      message += `📍 Venue: ${interviewVenue}\n`;
    } else if (interviewMode === 'video') {
      message += `💻 Mode: Video Call\n`;
      message += `🔗 Link: ${interviewLink}\n`;
    } else if (interviewMode === 'phone') {
      message += `📞 Mode: Phone Interview\n`;
    }

    if (isReschedule && rescheduleReason) {
      message += `\n📝 Reason: ${rescheduleReason}`;
    }

    message += '\n\nGood luck! 🍀';

    // Insert notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: candidate.user_id,
        candidate_id: candidateId,
        application_id: applicationId,
        type: isReschedule ? 'interview_rescheduled' : 'interview_scheduled',
        title,
        message
      });

    if (notificationError) {
      throw notificationError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});