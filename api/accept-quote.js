export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ref, token } = req.body;

  if (!ref || !token) return res.status(400).json({ error: 'Missing ref or token' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_KEY) return res.status(500).json({ error: 'Server config error' });

  const SB_HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // 1. Fetch the quote
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/quotes?ref=eq.${encodeURIComponent(ref)}&select=*`,
      { headers: SB_HEADERS }
    );
    const quotes = await qRes.json();
    const q = quotes?.[0];

    if (!q) return res.status(404).json({ error: 'Quote not found' });

    // 2. Validate token (HMAC of ref using SUPABASE_KEY as secret)
    const expectedToken = Buffer.from(`${ref}:${SUPABASE_KEY.slice(-16)}`).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    if (token !== expectedToken) {
      return res.status(403).json({ error: 'Invalid or expired acceptance link' });
    }

    // 3. Prevent double-acceptance
    if (q.status === 'Approved') {
      return res.status(200).json({ ok: true, alreadyAccepted: true, ref });
    }

    // 4. Update quote status to Approved
    await fetch(`${SUPABASE_URL}/rest/v1/quotes?ref=eq.${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ status: 'Approved', accepted_at: new Date().toISOString() })
    });

    // 5. Create an order record from the quote
    const orderRef = 'FT-' + Math.floor(100000 + Math.random() * 900000);
    const orderPayload = {
      ref: orderRef,
      quote_ref: ref,
      name: q.name || q.client_name || '',
      email: q.email || '',
      company: q.company || '',
      address: q.city || q.address || '',
      style: q.project_type || q.type || 'Custom Rendering',
      floors: null,
      total: q.confirmed_price || 0,
      deposit: 0,
      notes: q.notes || '',
      status: 'Awaiting Assets',
      project_name: q.project || q.project_name || '',
      project_stage: 'awaiting-assets',
      addons: {
        renders: q.renders || {},
        complexity: q.complexity || '',
        timeline: q.timeline || '',
        phases: q.phases || ''
      },
      created_at: new Date().toISOString()
    };

    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify(orderPayload)
    });

    // 6. Send notification email to admin
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Floortype <orders@floortype.com>',
          to: ['orders@floortype.com'],
          subject: `✅ Quote Accepted — ${q.project || ref} (${ref})`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#F7F5FF;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#120F2A,#3D3660);border-radius:10px;padding:24px 28px;margin-bottom:20px;">
                <div style="font-size:11px;color:rgba(196,181,244,0.7);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;">Quote Accepted</div>
                <div style="font-size:22px;font-weight:700;color:white;">${q.project || ref}</div>
              </div>
              <table style="width:100%;font-size:13px;color:#333;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#888;">Quote Ref</td><td style="padding:6px 0;font-weight:600;">${ref}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">New Order Ref</td><td style="padding:6px 0;font-weight:600;color:#6B56C8;">${orderRef}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Client</td><td style="padding:6px 0;">${q.name || q.client_name || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${q.email || '—'}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Confirmed Price</td><td style="padding:6px 0;font-weight:700;color:#2BA892;">$${(q.confirmed_price || 0).toLocaleString('en-US')}</td></tr>
              </table>
              <div style="margin-top:20px;padding:14px;background:white;border-radius:8px;font-size:12px;color:#888;">
                An order record (${orderRef}) has been automatically created. Log in to the admin dashboard to get started.
              </div>
            </div>
          `
        })
      });
    }

    res.status(200).json({ ok: true, alreadyAccepted: false, ref, orderRef });

  } catch (e) {
    console.error('Accept quote error:', e);
    res.status(500).json({ error: e.message });
  }
}
