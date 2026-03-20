import { serve } from 'https://deno.land/std@0.140.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;

function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        }
      });
    }
    const resp = await handler(req);
    resp.headers.set('Access-Control-Allow-Origin', '*');
    resp.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    resp.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return resp;
  };
}

serve(withCors(async (req) => {
  try {
    const { to, subject, html, text } = await req.json();
    if (!to || !subject || !html) {
      return new Response("Missing required email fields", { status: 400 });
    }

    // Send email via SendGrid API
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "rockyeswar78@gmail.com" }, // Must be verified sender!
        subject,
        content: [
          { type: "text/plain", value: text || subject },
          { type: "text/html", value: html }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("SendGrid API error:", err);
      return new Response("Failed to send email: " + err, { status: 500 });
    }

    return new Response("Email sent", { status: 200 });
  } catch (err: any) {
    console.error("❌ Edge Function error:", err);
    return new Response("Server error: " + err.message, { status: 500 });
  }
}));