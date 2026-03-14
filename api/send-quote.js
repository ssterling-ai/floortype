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
    '360': '360 Virtual Tour',
    flythrough: 'Fly-Through Animation',
    'static-interior': 'Static Interior Rendering',
    'static-exterior': 'Static Exterior Rendering',
    'static-aerial': 'Static Aerial Rendering',
    '360-interior': '360 Interior Tour',
    '360-exterior': '360 Exterior Tour',
    'flythrough-exterior': 'Fly-Through Animation (Exterior)',
    'flythrough-interior': 'Fly-Through Animation (Interior)',
  };

  function formatRenderLabel(key) {
    if (renderLabels[key]) return renderLabels[key];
    return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const complexityLabel = {
    standard: 'Standard',
    premium: 'Premium',
    luxury: 'Luxury'
  }[complexity] || complexity || 'Standard';

  const timelineLabel = {
    standard: 'Standard (4-8 weeks)',
    expedited: 'Expedited (2-4 weeks)',
    urgent: 'Urgent (under 2 weeks)'
  }[timeline] || timeline || 'Standard (4-8 weeks)';

  const revisionRounds = 2;
  const formattedPrice = parseInt(confirmedPrice).toLocaleString('en-US');

  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
  const acceptToken = Buffer.from(ref + ':' + SUPABASE_KEY.slice(-16)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const acceptUrl = 'https://floortype.com/accept-quote?ref=' + encodeURIComponent(ref) + '&token=' + encodeURIComponent(acceptToken);

  const renderRows = renders && Object.keys(renders).length
    ? Object.entries(renders).map(([type, val]) => {
        const label = formatRenderLabel(type);
        const views = val && val.views ? val.views : 1;
        return '<tr>'
          + '<td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;">' + label + '</td>'
          + '<td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;text-align:center;">' + views + ' view' + (views > 1 ? 's' : '') + '</td>'
          + '<td style="padding:10px 0;border-bottom:1px solid #F0EDF9;font-size:14px;color:#333;text-align:right;">Included</td>'
          + '</tr>';
      }).join('')
    : '<tr><td colspan="3" style="padding:10px 0;font-size:14px;color:#999;">See project scope below</td></tr>';

  const notesBlock = notes
    ? '<div style="padding:24px 40px 0;">'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Additional Notes</div>'
      + '<div style="font-size:13px;color:#555;line-height:1.7;background:#F7F5FF;border-radius:8px;padding:14px 16px;">' + notes + '</div>'
      + '</div>'
    : '';

  const projectTypeRow = projectType ? '<tr><td style="padding:5px 0;font-size:13px;color:#888;width:40%;">Project Type</td><td style="padding:5px 0;font-size:13px;color:#333;">' + projectType + '</td></tr>' : '';
  const cityRow = city ? '<tr><td style="padding:5px 0;font-size:13px;color:#888;">Location</td><td style="padding:5px 0;font-size:13px;color:#333;">' + city + '</td></tr>' : '';
  const phasesRow = phases ? '<tr><td style="padding:5px 0;font-size:13px;color:#888;">Phases / Buildings</td><td style="padding:5px 0;font-size:13px;color:#333;">' + phases + '</td></tr>' : '';
  const firstName = clientName ? clientName.split(' ')[0] : 'there';

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>'
    + '<body style="margin:0;padding:0;background:#F7F5FF;font-family:Arial,sans-serif;">'
    + '<div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(107,86,200,0.12);">'

    // Header
    + '<div style="background:linear-gradient(135deg,#120F2A,#3D3660);padding:36px 40px;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(196,181,244,0.7);margin-bottom:8px;">Project Quote</div>'
    + '<div style="font-size:28px;font-weight:700;color:white;letter-spacing:0.04em;line-height:1.1;margin-bottom:6px;">' + projectName + '</div>'
    + '<div style="font-size:12px;font-weight:600;letter-spacing:0.1em;color:rgba(196,181,244,0.5);">' + ref + '</div>'
    + '</div>'

    // Greeting
    + '<div style="padding:32px 40px 0;">'
    + '<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 12px;">Hi ' + firstName + ',</p>'
    + '<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">Thank you for your quote request. We\'ve reviewed your project brief and put together the following proposal. Please review the details below &#8212; if you have any questions, reply to this email and we\'ll get back to you promptly.</p>'
    + '</div>'

    // Price Banner - single column stacked for mobile compatibility
    + '<div style="margin:0 40px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#EDE9FF,#DFF6F1);border-radius:12px;">'
    + '<tr><td style="padding:24px 28px 8px 28px;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B56C8;margin-bottom:4px;">Confirmed Project Price</div>'
    + '<div style="font-size:36px;font-weight:700;color:#120F2A;letter-spacing:0.02em;">$' + formattedPrice + '</div>'
    + '</td></tr>'
    + '<tr>'
    + '<td style="padding:0 28px 20px 28px;">'
    + '<table cellpadding="0" cellspacing="0"><tr>'
    + '<td style="padding-right:24px;"><div style="font-size:11px;color:#8880AA;margin-bottom:2px;">Delivery</div><div style="font-size:13px;font-weight:600;color:#333;">' + timelineLabel + '</div></td>'
    + '<td><div style="font-size:11px;color:#8880AA;margin-bottom:2px;">Revision Rounds</div><div style="font-size:13px;font-weight:600;color:#333;">' + revisionRounds + ' included</div></td>'
    + '</tr></table>'
    + '</td>'
    + '</tr>'
    + '</table>'
    + '</div>'

    // Scope
    + '<div style="padding:28px 40px 0;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">Project Scope</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'
    + '<thead><tr>'
    + '<th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:left;border-bottom:2px solid #F0EDF9;">Item</th>'
    + '<th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:center;border-bottom:2px solid #F0EDF9;">Qty</th>'
    + '<th style="padding:8px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#AAA;text-align:right;border-bottom:2px solid #F0EDF9;">Notes</th>'
    + '</tr></thead>'
    + '<tbody>' + renderRows + '</tbody>'
    + '</table>'
    + '</div>'

    // Project Details
    + '<div style="padding:24px 40px 0;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">Project Details</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0">'
    + projectTypeRow + cityRow + phasesRow
    + '<tr><td style="padding:5px 0;font-size:13px;color:#888;">Quality Level</td><td style="padding:5px 0;font-size:13px;color:#333;">' + complexityLabel + '</td></tr>'
    + '<tr><td style="padding:5px 0;font-size:13px;color:#888;">Timeline</td><td style="padding:5px 0;font-size:13px;color:#333;">' + timelineLabel + '</td></tr>'
    + '</table>'
    + '</div>'

    // Whats Included
    + '<div style="padding:24px 40px 0;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9B87E8;margin-bottom:16px;">What\'s Included</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0">'
    + '<tr><td style="padding:6px 0;font-size:13px;color:#333;">&#10003;&nbsp;&nbsp;High-resolution final files (JPEG + PNG)</td></tr>'
    + '<tr><td style="padding:6px 0;font-size:13px;color:#333;">&#10003;&nbsp;&nbsp;' + revisionRounds + ' rounds of structured draft review via ReviewStudio</td></tr>'
    + '<tr><td style="padding:6px 0;font-size:13px;color:#333;">&#10003;&nbsp;&nbsp;Dedicated client portal for project tracking</td></tr>'
    + '<tr><td style="padding:6px 0;font-size:13px;color:#333;">&#10003;&nbsp;&nbsp;100% license-free &#8212; use anywhere, no restrictions</td></tr>'
    + '<tr><td style="padding:6px 0;font-size:13px;color:#333;">&#10003;&nbsp;&nbsp;Direct communication throughout production</td></tr>'
    + '</table>'
    + '</div>'

    + notesBlock

    // CTA
    + '<div style="padding:32px 40px;text-align:center;">'
    + '<p style="font-size:13px;color:#888;margin:0 0 20px;">Ready to move forward? Click below to accept this quote and we\'ll get started right away.</p>'
    + '<a href="' + acceptUrl + '" style="display:inline-block;background:linear-gradient(135deg,#6B56C8,#2BA892);color:white;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em;">Accept This Quote &#8594;</a>'
    + '<p style="font-size:11px;color:#BBB;margin:14px 0 0;">Or reply to this email with any questions before accepting.</p>'
    + '</div>'

    // Footer
    + '<div style="background:#120F2A;padding:24px 40px;text-align:center;">'
    + '<div style="font-size:16px;font-weight:700;letter-spacing:0.12em;color:white;margin-bottom:6px;">FLOORTYPE</div>'
    + '<div style="font-size:12px;color:rgba(255,255,255,0.4);">Architectural Visualization &middot; orders@floortype.com</div>'
    + '<div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:8px;">This quote is valid for 30 days from the date of issue.</div>'
    + '</div>'

    + '</div></body></html>';

  const toList = [clientEmail];
  const ccList = ccEmails
    ? ccEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'))
    : [];

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Floortype <orders@floortype.com>',
        to: toList,
        cc: ccList.length ? ccList : undefined,
        reply_to: 'orders@floortype.com',
        subject: 'Your Floortype Quote \u2014 ' + projectName,
        html
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));

    const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
    const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (sbKey) {
      await fetch(SUPABASE_URL + '/rest/v1/quotes?ref=eq.' + ref, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': sbKey,
          'Authorization': 'Bearer ' + sbKey
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
