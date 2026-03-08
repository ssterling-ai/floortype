export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    ref, clientName, clientEmail, ccEmails,
    company, projectName, projectType, city,
    phases, renders, complexity, timeline,
    confirmedPrice, notes
  } = req.body;

  if (!clientEmail || !confirmedPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const renderLabels = {
    interior: 'Interior Rendering',
    exterior: 'Exterior Rendering',
    aerial: 'Aerial Rendering',
    '360': '360° Virtual Tour',
    flythrough: 'Fly-Through Animation'
  };

  const complexityLabel = {
    standard: 'Standard',
    premium: 'Premium',
    luxury: 'Luxury'
  }[complexity] || complexity || 'Standard';

  const timelineLabel = {
    standard: 'Standard (4–8 weeks)',
    expedited: 'Expedited (2–4 weeks)',
    urgent: 'Urgent (under 2 weeks)'
  }[timeline] || timeline || 'Standard (4–8 weeks)';

  const revisionRounds = 2;
  const formattedPrice = parseInt(confirmedPrice).toLocaleString('en-US');

  // Generate acceptance token and URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const acceptToken = Buffer.from(`${ref}:${SUPABASE_KEY.slice(-16)}`).toString('base64url');
  const acceptUrl = `https://floortype.com/accept-quote?ref=${encodeURIComponent(ref)}&token=${encodeURIComponent(acceptToken)}`;

  const renderRows = renders && Object.keys(renders).length
    ? Object.entries(renders).map(([type, val]) => {
        const label = renderLabels[type] || type;
        const views = val?.views || 1;
        return `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;text-align:center;">${views} view${views > 1 ? 's' : ''}</td>
            <td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;text-align:right;">Included</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="3" style="padding:10px 0;font-size:14px;color:#999;">See project scope below</td></tr>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,sans-serif;">

  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(107,86,200,0.12);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#120F2A,#3D3660);padding:36px 40px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(196,181,244,0.7);margin-bottom:8px;">Project Quote</div>
      <div style="font-size:28px;font-weight:700;color:white;letter-spacing:0.06em;font-family:Arial,sans-serif;">${ref}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.6);margin-top:6px;">${projectName}</div>
    </div>

    <!-- Greeting -->
    <div style="padding:32px 40px 0;">
      <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 12px;">Hi ${clientName.split(' ')[0]},</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">
        Thank you for your quote request. We've reviewed your project brief and put together the following proposal.
        Please review the details below — if you have any questions, reply to this email and we'll get back to you promptly.
      </p>
    </div>

    <!-- Price Banner -->
    <div style="margin:0 40px;background:linear-gradient(135deg,#EDE9FF,#DFF6F1);border-radius:12px;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B56C8;margin-bottom:4px;">Confirmed Project Price</div>
        <div style="font-size:36px;font-weight:700;color:#120F2A;letter-spacing:0.02em;">$${formattedPrice}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#8880AA;margin-bottom:2px;">Delivery</div>
        <div style="font-size:14px;font-weight:600;color:#333;">${timelineLabel}</div>
        <div style="font-size:11px;color:#8880AA;margin-top:6px;">Revision Rounds</div>
        <div style="font-size:14px;font-weight:600;color:#333;">${revisionRounds} included</div>
      </div>
    </div>

    <!-- Scope -->
    <div style="padding:28px 40px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">Project Scope</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:left;border-bottom:2px solid #F0EDF9;">Item</th>
            <th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:center;border-bottom:2px solid #F0EDF9;">Qty</th>
            <th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:right;border-bottom:2px solid #F0EDF9;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows}
        </tbody>
      </table>
    </div>

    <!-- Project Details -->
    <div style="padding:24px 40px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">Project Details</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${projectType ? `<tr><td style="padding:5px 0;font-size:13px;color:#888;width:40%;">Project Type</td><td style="padding:5px 0;font-size:13px;color:#333;">${projectType}</td></tr>` : ''}
        ${city ? `<tr><td style="padding:5px 0;font-size:13px;color:#888;">Location</td><td style="padding:5px 0;font-size:13px;color:#333;">${city}</td></tr>` : ''}
        ${phases ? `<tr><td style="padding:5px 0;font-size:13px;color:#888;">Phases / Buildings</td><td style="padding:5px 0;font-size:13px;color:#333;">${phases}</td></tr>` : ''}
        <tr><td style="padding:5px 0;font-size:13px;color:#888;">Quality Level</td><td style="padding:5px 0;font-size:13px;color:#333;">${complexityLabel}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#888;">Timeline</td><td style="padding:5px 0;font-size:13px;color:#333;">${timelineLabel}</td></tr>
      </table>
    </div>

    <!-- What's Included -->
    <div style="padding:24px 40px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">What's Included</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#333;">✓&nbsp;&nbsp;High-resolution final files (JPEG + PNG)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#333;">✓&nbsp;&nbsp;${revisionRounds} rounds of structured draft review via ReviewStudio</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#333;">✓&nbsp;&nbsp;Dedicated client portal for project tracking</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#333;">✓&nbsp;&nbsp;100% license-free — use anywhere, no restrictions</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#333;">✓&nbsp;&nbsp;Direct communication throughout production</td>
        </tr>
      </table>
    </div>

    ${notes ? `
    <!-- Notes -->
    <div style="padding:24px 40px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Additional Notes</div>
      <div style="font-size:13px;color:#555;line-height:1.7;background:#F7F5FF;border-radius:8px;padding:14px 16px;">${notes}</div>
    </div>` : ''}

    <!-- CTA -->
    <div style="padding:32px 40px;text-align:center;">
      <p style="font-size:13px;color:#888;margin:0 0 20px;">Ready to move forward? Click below to accept this quote and we'll get started right away.</p>
      <a href="${acceptUrl}" 
         style="display:inline-block;background:linear-gradient(135deg,#6B56C8,#2BA892);color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">
        Accept This Quote →
      </a>
      <p style="font-size:11px;color:#BBB;margin:14px 0 0;">Or reply to this email with any questions before accepting.</p>
    </div>

    <!-- Footer -->
    <div style="background:#120F2A;padding:24px 40px;text-align:center;">
      <div style="font-size:16px;font-weight:700;letter-spacing:0.12em;color:white;margin-bottom:6px;">FLOORTYPE</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);">Architectural Visualization · s.sterling@floortype.com</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:8px;">This quote is valid for 30 days from the date of issue.</div>
    </div>

  </div>
</body>
</html>`;

  // Build recipient list
  const toList = [clientEmail];
  const ccList = ccEmails
    ? ccEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'))
    : [];

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Floortype <s.sterling@floortype.com>',
        to: toList,
        cc: ccList.length ? ccList : undefined,
        reply_to: 's.sterling@floortype.com',
        subject: `Your Floortype Quote — ${projectName} (${ref})`,
        html
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));

    // Update quote status in Supabase
    const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/quotes?ref=eq.${ref}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ status: 'Quoted', confirmed_price: parseInt(confirmedPrice) })
      });
    }

    res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Send quote error:', e);
    res.status(500).json({ error: e.message });
  }
}
