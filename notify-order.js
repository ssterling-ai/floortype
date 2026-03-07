export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ref, name, email, company, address, floors, style, addons, total, deposit, notes, paymentMethod, net30 } = req.body;

  const addonLines = addons && Object.keys(addons).length
    ? Object.entries(addons).filter(([k]) => !k.startsWith('_')).map(([k,v]) => `<tr><td style="padding:6px 0;color:#666;font-size:13px;">${k}</td><td style="padding:6px 0;text-align:right;font-size:13px;">+$${v}</td></tr>`).join('')
    : '<tr><td colspan="2" style="padding:6px 0;color:#999;font-size:13px;">None</td></tr>';

  const net30Section = paymentMethod === 'net30' ? `
    <tr><td colspan="2" style="padding-top:20px;">
      <div style="background:#FFF8E1;border:1.5px solid #F0C040;border-radius:10px;padding:16px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#B07D00;margin-bottom:10px;">⚠️ Net 30 Invoice Application</div>
        <table width="100%" style="font-size:13px;color:#333;">
          <tr><td style="padding:3px 0;color:#666;">Legal Entity:</td><td style="padding:3px 0;font-weight:600;">${net30?.entity || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;">Billing Contact:</td><td style="padding:3px 0;font-weight:600;">${net30?.contact || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;">Billing Email:</td><td style="padding:3px 0;font-weight:600;">${net30?.email || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;">Billing Phone:</td><td style="padding:3px 0;font-weight:600;">${net30?.phone || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;">Billing Address:</td><td style="padding:3px 0;font-weight:600;">${net30?.address || '—'}</td></tr>
        </table>
      </div>
    </td></tr>` : '';

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#F7F5FF;font-family:'DM Sans',Arial,sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,86,200,0.1);">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4B2EC5,#2AB5A0);padding:28px 32px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">New Floor Plan Order</div>
        <div style="font-size:26px;font-weight:700;color:white;letter-spacing:0.04em;">${ref}</div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">

          <!-- Client -->
          <tr><td colspan="2" style="padding-bottom:6px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Client</div>
          </td></tr>
          <tr>
            <td style="padding:4px 0;color:#666;font-size:13px;">Name</td>
            <td style="padding:4px 0;font-weight:600;font-size:13px;">${name}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;font-size:13px;">Email</td>
            <td style="padding:4px 0;font-size:13px;"><a href="mailto:${email}" style="color:#4B2EC5;">${email}</a></td>
          </tr>
          ${company ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Company</td><td style="padding:4px 0;font-size:13px;">${company}</td></tr>` : ''}

          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>

          <!-- Project -->
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Project</div>
          </td></tr>
          <tr>
            <td style="padding:4px 0;color:#666;font-size:13px;">Address</td>
            <td style="padding:4px 0;font-weight:600;font-size:13px;">${address}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;font-size:13px;">Floors</td>
            <td style="padding:4px 0;font-size:13px;">${floors}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;font-size:13px;">Style</td>
            <td style="padding:4px 0;font-size:13px;">${style}</td>
          </tr>

          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>

          <!-- Pricing -->
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Pricing</div>
          </td></tr>
          ${addonLines}
          <tr>
            <td style="padding:10px 0 4px;font-weight:700;font-size:14px;">Total</td>
            <td style="padding:10px 0 4px;font-weight:700;font-size:14px;text-align:right;">$${total}</td>
          </tr>
          <tr>
            <td style="padding:0;color:#666;font-size:13px;">Deposit ${paymentMethod === 'net30' ? '(Invoice — Net 30)' : '(Paid via Stripe)'}</td>
            <td style="padding:0;font-size:13px;text-align:right;color:${paymentMethod === 'net30' ? '#B07D00' : '#2AB5A0'};font-weight:600;">$${parseFloat(deposit).toFixed(2)}</td>
          </tr>

          ${net30Section}

          ${notes ? `
          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:8px;">Client Notes</div>
            <div style="font-size:13px;color:#444;line-height:1.7;background:#F7F5FF;border-radius:8px;padding:12px;">${notes}</div>
          </td></tr>` : ''}

        </table>
      </div>

      <!-- Footer -->
      <div style="background:#F7F5FF;padding:20px 32px;text-align:center;">
        <a href="https://floortype.com/admin" style="display:inline-block;background:linear-gradient(135deg,#4B2EC5,#2AB5A0);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">Open in Admin Dashboard →</a>
      </div>

    </div>
  </body>
  </html>`;

  try {
    // ── Admin notification ──
    const adminSend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Floortype Orders <s.sterling@floortype.com>',
        to: [process.env.ADMIN_EMAIL || 's.sterling@floortype.com'],
        subject: `New Order ${ref} — ${name}${paymentMethod === 'net30' ? ' [Net 30 Application]' : ''}`,
        html
      })
    });
    const adminData = await adminSend.json();
    if (!adminSend.ok) throw new Error(JSON.stringify(adminData));

    // ── Client confirmation ──
    const clientHtml = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,86,200,0.1);">

        <div style="background:linear-gradient(135deg,#120F2A,#3D3660);padding:32px 36px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(196,181,244,0.7);margin-bottom:6px;">Order Confirmed</div>
          <div style="font-size:26px;font-weight:700;color:white;letter-spacing:0.04em;">${ref}</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">${address}</div>
        </div>

        <div style="padding:28px 36px;">
          <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px;">Hi ${name.split(' ')[0]},</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
            Thanks for your order — we've received it and will begin processing shortly.
            ${paymentMethod === 'net30'
              ? 'Your Net 30 invoice application is under review. You'll hear from us within 1 business day.'
              : `Your 50% deposit of <strong>$${parseFloat(deposit).toFixed(2)}</strong> has been collected via Stripe.`}
          </p>

          <div style="background:#F7F5FF;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;padding-bottom:12px;" colspan="2">Order Summary</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Reference</td><td style="font-size:13px;color:#333;font-weight:600;text-align:right;">${ref}</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Address</td><td style="font-size:13px;color:#333;text-align:right;">${address}</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Floors</td><td style="font-size:13px;color:#333;text-align:right;">${floors}</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Style</td><td style="font-size:13px;color:#333;text-align:right;">${style}</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Total</td><td style="font-size:13px;color:#333;font-weight:700;text-align:right;">$${total}</td></tr>
              <tr><td style="font-size:13px;color:#888;padding:4px 0;">Deposit ${paymentMethod === 'net30' ? '(Net 30)' : '(Paid)'}</td>
                  <td style="font-size:13px;font-weight:600;text-align:right;color:${paymentMethod === 'net30' ? '#B07D00' : '#2AB5A0'};">$${parseFloat(deposit).toFixed(2)}</td></tr>
            </table>
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">What Happens Next</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;font-size:13px;color:#333;">1.&nbsp;&nbsp;We review your files and begin production (typically within 1 business day)</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#333;">2.&nbsp;&nbsp;Your first draft is delivered to your client portal within 48 hours</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#333;">3.&nbsp;&nbsp;Review, leave comments, and we revise until you're happy</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#333;">4.&nbsp;&nbsp;Final files delivered — balance due upon approval</td></tr>
            </table>
          </div>

          <div style="text-align:center;margin-bottom:8px;">
            <a href="https://floortype.com/portal" style="display:inline-block;background:linear-gradient(135deg,#6B56C8,#2BA892);color:white;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;">Track Your Order →</a>
          </div>
        </div>

        <div style="background:#120F2A;padding:20px 36px;text-align:center;">
          <div style="font-size:15px;font-weight:700;letter-spacing:0.12em;color:white;margin-bottom:4px;">FLOORTYPE</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.4);">Questions? Reply to this email or reach us at s.sterling@floortype.com</div>
        </div>

      </div>
    </body>
    </html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Floortype <s.sterling@floortype.com>',
        to: [email],
        reply_to: 's.sterling@floortype.com',
        subject: `Order Confirmed — ${ref}`,
        html: clientHtml
      })
    });

    res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Email error:', e);
    res.status(500).json({ error: e.message });
  }
}
