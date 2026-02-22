export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { first, last, email, company, subject, message } = req.body;
  if (!first || !email || !message) return res.status(400).json({ error: 'Missing fields' });

  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Floortype <s.sterling@floortype.com>',
        to: ['s.sterling@floortype.com'],
        reply_to: email,
        subject: `Contact Form — ${subject || 'General Inquiry'} — ${first} ${last}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#4B2EC5,#2AB5A0);padding:28px 32px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">New Contact Form Submission</div>
              <div style="font-size:22px;font-weight:700;color:white;">${first} ${last}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);">${email}${company ? ' · ' + company : ''}</div>
            </div>
            <div style="padding:28px 32px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:6px;">Subject</div>
              <div style="font-size:15px;color:#333;margin-bottom:20px;">${subject || 'General Inquiry'}</div>
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:6px;">Message</div>
              <div style="font-size:15px;color:#333;line-height:1.7;white-space:pre-wrap;">${message}</div>
            </div>
            <div style="background:#F7F5FF;padding:20px 32px;">
              <a href="mailto:${email}" style="display:inline-block;background:linear-gradient(135deg,#4B2EC5,#2AB5A0);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Reply to ${first} →</a>
            </div>
          </div>`
      })
    });
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Contact email failed:', e);
    return res.status(500).json({ error: e.message });
  }
}
