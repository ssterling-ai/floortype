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
            <td style="padding:0;font-size:13px;text-align:right;color:${paymentMethod === 'net30' ? '#B07D00' : '#2AB5A0'};font-weight:600;">$${deposit}</td>
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
        <a href="https://floortype.vercel.app/admin" style="display:inline-block;background:linear-gradient(135deg,#4B2EC5,#2AB5A0);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">Open in Admin Dashboard →</a>
      </div>

    </div>
  </body>
  </html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Floortype Orders <orders@floortype.com>',
        to: [process.env.ADMIN_EMAIL || 'hello@floortype.com'],
        subject: `New Order ${ref} — ${name}${paymentMethod === 'net30' ? ' [Net 30 Application]' : ''}`,
        html
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Email error:', e);
    res.status(500).json({ error: e.message });
  }
}
