import { serve } from 'https://deno.land/std@0.140.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const SEND_JOB_ALERT_URL = "https://yzppfbsoarvaodfncpjh.supabase.co/functions/v1/send-job-alert"

serve(async (req) => {
  try {
    const { record: job } = await req.json()
    if (!job) return new Response('No job data found', { status: 400 })

    const jobSkills = Array.isArray(job.skills_required) ? job.skills_required : []
    if (jobSkills.length === 0) return new Response('No skills required for job', { status: 400 })

    // Fetch candidates whose skills overlap with jobSkills (Postgres array operator)
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, name, email, skills')
      .overlaps('skills', jobSkills)

    if (error) {
      console.error("Supabase error:", error)
      return new Response('Error fetching candidates', { status: 500 })
    }
    if (!candidates || candidates.length === 0) {
      return new Response('No matching candidates found.', { status: 200 })
    }

    let sentCount = 0
    for (const candidate of candidates) {
      if (!candidate.email) continue

      const res = await fetch(SEND_JOB_ALERT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: candidate.email,
          subject: `New Job Alert: ${job.title}`,
          html: `
            <div style="font-family:sans-serif;padding:24px;">
              <h2 style="color:#6366f1;">${job.title}</h2>
              <p><b>Company:</b> ${job.company_name || 'Unknown'}</p>
              <p><b>Location:</b> ${job.location || 'N/A'}</p>
              <p><b>Description:</b> ${job.job_description || ''}</p>
              <p><b>Required Skills:</b> ${jobSkills.join(', ')}</p>
              <p style="margin-top:24px;">
                <a href="https://job-portal-a8zj.vercel.app" style="background:#6366f1;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;">View & Apply</a>
              </p>
              <hr />
              <small style="color:#888;">You received this because your profile matches the job skills.</small>
            </div>
          `,
          text: `
Hello ${candidate.name},

A new job matching your skills has been posted!

Job title: ${job.title}
Company: ${job.company_name || 'Unknown'}
Location: ${job.location || 'N/A'}
Description: ${job.job_description || ''}
Required Skills: ${jobSkills.join(', ')}

Apply now on the Job Portal!
          `,
        })
      })
      if (res.ok) sentCount++
    }

    return new Response(`Job alert emails sent to ${sentCount} candidate(s).`, { status: 200 })
  } catch (err) {
    console.error("Function error:", err)
    return new Response('Server error', { status: 500 })
  }
})