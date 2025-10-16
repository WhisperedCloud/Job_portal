import { serve } from 'https://deno.land/std@0.140.0/http/server.ts'

// This function receives: to, subject, html, text
// You must integrate with an email provider (e.g., Resend, SendGrid, SMTP API, etc).
// For demo, this uses Resend's API (https://resend.com/docs/api-reference/emails/send-email)
// You need to add RESEND_API_KEY to your Supabase secrets.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

serve(async (req) => {
  try {
    const { to, subject, html, text } = await req.json()
    if (!to || !subject || !html) {
      return new Response("Missing required email fields", { status: 400 })
    }

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "rockyeswar78@gmail.com", 
        to,
        subject,
        html,
        text
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Resend API error:", err)
      return new Response("Failed to send email", { status: 500 })
    }

    return new Response("Email sent", { status: 200 })
  } catch (err) {
    console.error("Function error:", err)
    return new Response("Server error", { status: 500 })
  }
})