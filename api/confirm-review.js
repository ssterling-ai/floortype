export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderRef, projectName, clientEmail, clientName, currentStage } = req.body;
  if (!orderRef || !clientEmail) return res.status(400).json({ error: 'Missing required fields' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  // Auto-advance stage: draft ready → revisions
  const stageMap = {
    'draft-1-ready': 'draft-1-revisions',
    'draft-2-ready': 'draft-2-revisions',
    'final-draft-ready': 'final-draft-ready' // stays, you decide next step
  };
  const nextStage = stageMap[currentStage] || currentStage;

  try {
    // Update project stage in Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/orders?ref=eq.${orderRef}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ project_stage: nextStage })
    });

    // Send admin notification email
    const stageLabel = {
      'draft-1-ready': 'Draft 1',
      'draft-2-ready': 'Draft 2',
      'final-draft-ready': 'Final Draft'
    }[currentStage] || currentStage;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Floortype <s.sterling@floortype.com>`,
        to: [ADMIN_EMAIL],
        subject: `Review Complete — ${projectName || orderRef} (${stageLabel})`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#F7F5FF;font-family:'DM Sans',Arial,sans-serif;">
            <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,86,200,0.1);">
              <div style="background:linear-gradient(135deg,#4B2EC5,#2AB5A0);padding:28px 32px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">Review Confirmed</div>
                <div style="font-size:24px;font-weight:700;color:white;">${projectName || orderRef}</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${orderRef}</div>
              </div>
              <div style="padding:28px 32px;">
                <p style="font-size:15px;color:#333;line-height:1.6;">
                  <strong>${clientName || clientEmail}</strong> has confirmed that all review comments for <strong>${stageLabel}</strong> are complete and submitted in ReviewStudio.
                </p>
                <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:16px 20px;margin:20px 0;">
                  <div style="font-size:12px;font-weight:700;color:#16A34A;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Stage Updated</div>
                  <div style="font-size:14px;color:#333;">${stageLabel} → ${nextStage.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
                </div>
                <p style="font-size:13px;color:#666;">You can now review the comments in ReviewStudio and begin revisions.</p>
              </div>
              <div style="background:#F7F5FF;padding:20px 32px;text-align:center;">
                <a href="https://floortype.com/admin" style="display:inline-block;background:linear-gradient(135deg,#4B2EC5,#2AB5A0);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">Open in Admin Dashboard →</a>
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    return res.status(200).json({ ok: true, nextStage });
  } catch(e) {
    console.error('Confirm review error:', e);
    return res.status(500).json({ error: e.message });
  }
}
