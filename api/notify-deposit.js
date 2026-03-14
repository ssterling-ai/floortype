export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderRef, amount, clientName, clientEmail, projectName } = req.body;
  if (!orderRef) return res.status(400).json({ error: 'Missing orderRef' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SB_HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // 1. Update order in Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/orders?ref=eq.${encodeURIComponent(orderRef)}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        status: 'Awaiting Assets',
        project_stage: 'awaiting-assets',
        deposit: amount,
        deposit_paid_at: new Date().toISOString()
      })
    });

    // 2. Send admin notification
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Floortype <orders@floortype.com>',
          to: ['orders@floortype.com'],
          subject: `💰 Deposit Received — ${projectName || orderRef}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#F7F5FF;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#120F2A,#3D3660);border-radius:10px;padding:24px 28px;margin-bottom:20px;">
                <div style="font-size:11px;color:rgba(196,181,244,0.7);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;">Deposit Received</div>
                <div style="font-size:22px;font-weight:700;color:white;">${projectName || orderRef}</div>
              </div>
              <table style="width:100%;font-size:13px;color:#333;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#888;width:40%;">Order Ref</td><td style="padding:6px 0;font-weight:600;">${orderRef}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Client</td><td style="padding:6px 0;">${clientName || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${clientEmail || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Deposit Amount</td><td style="padding:6px 0;font-weight:700;font-size:15px;color:#2BA892;">$${parseInt(amount||0).toLocaleString('en-US')}</td></tr>
              </table>
              <div style="margin-top:20px;padding:14px;background:white;border-radius:8px;font-size:12px;color:#888;line-height:1.6;">
                Order status updated to <strong>Awaiting Assets</strong>. The client can now upload project files in their portal.
              </div>
            </div>`
        })
      });
    }

    res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Notify deposit error:', e);
    res.status(500).json({ error: e.message });
  }
}
