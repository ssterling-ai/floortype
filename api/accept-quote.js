export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ref, token } = req.body;
  if (!ref || !token) return res.status(400).json({ error: 'Missing ref or token' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

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

    // 2. Validate token
    const expectedToken = Buffer.from(ref + ':' + SUPABASE_KEY.slice(-16)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    if (token !== expectedToken) return res.status(403).json({ error: 'Invalid or expired acceptance link' });

    // 3. Prevent double-acceptance
    if (q.status === 'Approved') {
      return res.status(200).json({ ok: true, alreadyAccepted: true, ref });
    }

    const clientName = q.client_name || q.name || '';
    const clientEmail = q.client_email || q.email || '';
    const projectName = q.project || q.project_name || ref;
    const confirmedPrice = q.confirmed_price || 0;
    const depositAmount = Math.round(confirmedPrice * 0.5);
    const orderRef = 'FT-' + Math.floor(100000 + Math.random() * 900000);
    const firstName = clientName.split(' ')[0] || 'there';

    // 4. Update quote status to Approved
    await fetch(`${SUPABASE_URL}/rest/v1/quotes?ref=eq.${encodeURIComponent(ref)}`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ status: 'Approved', accepted_at: new Date().toISOString() })
    });

    // 5. Create order record — status: Awaiting Deposit
    const orderPayload = {
      ref: orderRef,
      quote_ref: ref,
      client_name: clientName,
      client_email: clientEmail,
      client_company: q.company || '',
      address: q.city || q.address || '',
      style: q.project_type || q.type || 'Custom Rendering',
      floors: null,
      total: confirmedPrice,
      deposit: 0,
      deposit_amount: depositAmount,
      notes: q.notes || '',
      status: 'Awaiting Deposit',
      project_name: projectName,
      project_stage: 'awaiting-deposit',
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

    // 6. Create portal account (or confirm existing)
    let accountCreated = false;
    try {
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(clientEmail)}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const listData = await listRes.json();
      const existing = listData?.users?.find(u => u.email === clientEmail);
      if (!existing) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: SB_HEADERS,
          body: JSON.stringify({
            email: clientEmail,
            email_confirm: false,
            user_metadata: { full_name: clientName, order_ref: orderRef }
          })
        });
        // Send password set email
        await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: SB_HEADERS,
          body: JSON.stringify({ email: clientEmail, redirect_to: 'https://floortype.com/reset-password' })
        });
        accountCreated = true;
      }
    } catch(e) {
      console.warn('Account creation warning:', e.message);
    }

    if (!RESEND_KEY) {
      return res.status(200).json({ ok: true, alreadyAccepted: false, ref, orderRef });
    }

    const formattedTotal = confirmedPrice.toLocaleString('en-US');
    const formattedDeposit = depositAmount.toLocaleString('en-US');
    const portalUrl = 'https://floortype.com/portal';

    // 7a. Admin notification email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Floortype <orders@floortype.com>',
        to: ['orders@floortype.com'],
        subject: `✅ Quote Accepted & Order Created — ${projectName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#F7F5FF;border-radius:12px;">
            <div style="background:linear-gradient(135deg,#120F2A,#3D3660);border-radius:10px;padding:24px 28px;margin-bottom:20px;">
              <div style="font-size:11px;color:rgba(196,181,244,0.7);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;">Quote Accepted &#8212; New Order</div>
              <div style="font-size:22px;font-weight:700;color:white;">${projectName}</div>
            </div>
            <table style="width:100%;font-size:13px;color:#333;border-collapse:collapse;">
              <tr><td style="padding:6px 0;color:#888;width:40%;">Quote Ref</td><td style="padding:6px 0;font-weight:600;">${ref}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Order Ref</td><td style="padding:6px 0;font-weight:700;color:#6B56C8;">${orderRef}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Client</td><td style="padding:6px 0;">${clientName}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;">${clientEmail}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Project Total</td><td style="padding:6px 0;font-weight:700;color:#2BA892;">$${formattedTotal}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">50% Deposit Due</td><td style="padding:6px 0;font-weight:700;color:#E8A020;">$${formattedDeposit}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Portal Account</td><td style="padding:6px 0;">${accountCreated ? 'Created &#8212; password set email sent' : 'Already existed'}</td></tr>
            </table>
            <div style="margin-top:20px;padding:14px;background:white;border-radius:8px;font-size:12px;color:#888;line-height:1.6;">
              Order is now live in the admin dashboard. Status: <strong>Awaiting Deposit</strong>. Deposit prompt is live in client portal.
            </div>
          </div>`
      })
    });

    // 7b. Client email — welcome + deposit prompt
    const accountSection = accountCreated
      ? `<div style="background:#EDE9FF;border-radius:10px;padding:18px 22px;margin-bottom:20px;">
           <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B56C8;margin-bottom:6px;">Your Client Portal</div>
           <div style="font-size:14px;color:#333;line-height:1.6;margin-bottom:12px;">We've created your Floortype client portal account. Check your email for a separate message to set your password, then log in to track your project from start to finish.</div>
           <a href="${portalUrl}" style="display:inline-block;background:#6B56C8;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">Access Your Portal &#8594;</a>
         </div>`
      : `<div style="background:#EDE9FF;border-radius:10px;padding:18px 22px;margin-bottom:20px;">
           <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B56C8;margin-bottom:6px;">Your Client Portal</div>
           <div style="font-size:14px;color:#333;line-height:1.6;margin-bottom:12px;">Log in to your Floortype portal to pay your deposit and track your project.</div>
           <a href="${portalUrl}" style="display:inline-block;background:#6B56C8;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">Go to Portal &#8594;</a>
         </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Floortype <orders@floortype.com>',
        to: [clientEmail],
        reply_to: 'orders@floortype.com',
        subject: `Your project is confirmed — ${projectName}`,
        html: `
          <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
          <body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,sans-serif;">
          <div style="max-width:580px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(107,86,200,0.12);">

            <div style="background:linear-gradient(135deg,#120F2A,#3D3660);padding:36px 40px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(196,181,244,0.7);margin-bottom:8px;">Project Confirmed</div>
              <div style="font-size:26px;font-weight:700;color:white;margin-bottom:4px;">${projectName}</div>
              <div style="font-size:12px;color:rgba(196,181,244,0.5);">${orderRef}</div>
            </div>

            <div style="padding:32px 40px 0;">
              <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">Hi ${firstName}, your quote has been accepted and your project is now confirmed. Here&#8217;s what happens next.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#EDE9FF,#DFF6F1);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B56C8;margin-bottom:4px;">50% Deposit Due</div>
                    <div style="font-size:32px;font-weight:700;color:#120F2A;">$${formattedDeposit}</div>
                    <div style="font-size:12px;color:#8880AA;margin-top:4px;">of $${formattedTotal} total &nbsp;&#183;&nbsp; Pay securely in your portal</div>
                  </td>
                </tr>
              </table>

              ${accountSection}

              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">What Happens Next</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:6px 0;font-size:13px;color:#333;">&#9312;&nbsp;&nbsp;<strong>Pay your 50% deposit</strong> in the client portal to kick off production</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#333;">&#9313;&nbsp;&nbsp;<strong>Send your project files</strong> &#8212; floor plans, references, and any style guides</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#333;">&#9314;&nbsp;&nbsp;<strong>Track production</strong> and review drafts through the portal</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#333;">&#9315;&nbsp;&nbsp;<strong>Final payment</strong> and delivery of full-resolution files</td></tr>
                </table>
              </div>
            </div>

            <div style="background:#120F2A;padding:24px 40px;text-align:center;margin-top:16px;">
              <div style="font-size:16px;font-weight:700;letter-spacing:0.12em;color:white;margin-bottom:6px;">FLOORTYPE</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.4);">orders@floortype.com &nbsp;&#183;&nbsp; floortype.com</div>
            </div>

          </div></body></html>`
      })
    });

    res.status(200).json({ ok: true, alreadyAccepted: false, ref, orderRef, depositAmount });

  } catch(e) {
    console.error('Accept quote error:', e);
    res.status(500).json({ error: e.message });
  }
}
