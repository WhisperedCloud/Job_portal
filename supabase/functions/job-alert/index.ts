import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const job = body.record || body.job || body
    
    if (!job) return new Response(JSON.stringify({ error: 'No job data found' }), { status: 400, headers: corsHeaders })

    const jobSkills = Array.isArray(job.skills_required) ? job.skills_required : []
    if (jobSkills.length === 0) {
      return new Response(JSON.stringify({ message: 'No skills required for job' }), { status: 200, headers: corsHeaders })
    }

    // Fetch candidates whose skills overlap with jobSkills
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, user_id, name, email, skills')
      .overlaps('skills', jobSkills)

    if (error) {
      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: 'Error fetching candidates' }), { status: 500, headers: corsHeaders })
    }
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching candidates found.' }), { status: 200, headers: corsHeaders })
    }

    const SEND_JOB_ALERT_URL = `${supabaseUrl}/functions/v1/send-job-alert`

    // Parallel email sending
    const emailPromises = candidates
      .filter(candidate => candidate.email)
      .map(candidate =>
        fetch(SEND_JOB_ALERT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: candidate.email,
            subject: `New Job Alert: ${job.title}`,
            html: `
              <div style="font-family:sans-serif;padding:24px;background:#f9fafb;">
                <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                  <div style="background:#6366f1;padding:24px;">
                    <h2 style="color:white;margin:0;">New Job Alert! 🚀</h2>
                  </div>
                  <div style="padding:24px;">
                    <h3 style="color:#1e293b;">${job.title}</h3>
                    <p><b>Company:</b> ${job.company_name || 'Unknown'}</p>
                    <p><b>Location:</b> ${job.location || 'N/A'}</p>
                    <p><b>Experience:</b> ${job.experience_level || 'N/A'}</p>
                    <p><b>Required Skills:</b> ${jobSkills.join(', ')}</p>
                    <p style="color:#64748b;font-size:14px;">${(job.job_description || '').substring(0, 200)}...</p>
                    <a href="https://job-portal-a8zj.vercel.app/jobs" style="display:inline-block;background:#6366f1;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;margin-top:16px;">View & Apply Now</a>
                  </div>
                  <div style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#94a3b8;">
                    You received this because your profile skills match this job posting.
                  </div>
                </div>
              </div>
            `,
            text: `Hello ${candidate.name},\n\nA new job matching your skills has been posted!\n\nJob title: ${job.title}\nCompany: ${job.company_name || 'Unknown'}\nLocation: ${job.location || 'N/A'}\nSkills: ${jobSkills.join(', ')}\n\nApply at: https://job-portal-a8zj.vercel.app/jobs`,
          })
        }).catch(e => {
          console.error(`Failed to send email to ${candidate.email}:`, e)
          return new Response('', { status: 500 })
        })
      )

    const results = await Promise.all(emailPromises)
    const sentCount = results.filter(res => res.ok).length

    return new Response(
      JSON.stringify({ message: `Job alert sent to ${sentCount}/${candidates.length} candidate(s).` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})