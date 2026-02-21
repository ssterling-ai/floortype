export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ref, name, email, company, role, projectName, projectType, city, phases, renders, complexity, timeline, estimateLow, estimateHigh, totalFiles, sharedLink, notes } = req.body;

  const renderLines = renders && Object.keys(renders).length
    ? Object.entries(renders).map(([type, val]) => {
        const label = { interior:'Interior', exterior:'Exterior', aerial:'Aerial', tour:'360° Tour', flythrough:'Fly-Through' }[type] || type;
        return `<tr><td style="padding:4px 0;color:#666;font-size:13px;">${label}</td><td style="padding:4px 0;font-size:13px;">${val?.views || 1} view${(val?.views||1)>1?'s':''}</td></tr>`;
      }).join('')
    : '<tr><td colspan="2" style="color:#999;font-size:13px;">Not specified</td></tr>';

  const complexityLabel = { standard:'Standard', premium:'Premium', luxury:'Luxury' }[complexity] || complexity || '—';
  const timelineLabel = { standard:'Standard', expedited:'Expedited (+20%)', urgent:'Urgent (+40%)' }[timeline] || timeline || '—';

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#F7F5FF;font-family:'DM Sans',Arial,sans-serif;">
    <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,86,200,0.1);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4B2EC5,#2AB5A0);padding:28px 32px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">New Quote Request</div>
        <div style="font-size:26px;font-weight:700;color:white;letter-spacing:0.04em;">${ref}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${projectName}</div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">

          <!-- Client -->
          <tr><td colspan="2" style="padding-bottom:6px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Client</div>
          </td></tr>
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Name</td><td style="padding:4px 0;font-weight:600;font-size:13px;">${name}</td></tr>
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Email</td><td style="padding:4px 0;font-size:13px;"><a href="mailto:${email}" style="color:#4B2EC5;">${email}</a></td></tr>
          ${company ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Company</td><td style="padding:4px 0;font-size:13px;">${company}</td></tr>` : ''}
          ${role ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Role</td><td style="padding:4px 0;font-size:13px;">${role}</td></tr>` : ''}

          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>

          <!-- Project -->
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Project</div>
          </td></tr>
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Name</td><td style="padding:4px 0;font-weight:600;font-size:13px;">${projectName}</td></tr>
          ${projectType ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Type</td><td style="padding:4px 0;font-size:13px;">${projectType}</td></tr>` : ''}
          ${city ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Location</td><td style="padding:4px 0;font-size:13px;">${city}</td></tr>` : ''}
          ${phases > 1 ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Phases</td><td style="padding:4px 0;font-size:13px;">${phases}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Complexity</td><td style="padding:4px 0;font-size:13px;">${complexityLabel}</td></tr>
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Timeline</td><td style="padding:4px 0;font-size:13px;">${timelineLabel}</td></tr>

          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>

          <!-- Renderings -->
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Renderings Requested</div>
          </td></tr>
          ${renderLines}

          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>

          <!-- Estimate & Files -->
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:12px;">Scope</div>
          </td></tr>
          ${estimateLow ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;">Estimate Range</td><td style="padding:4px 0;font-weight:600;font-size:13px;">$${estimateLow.toLocaleString()} – $${estimateHigh.toLocaleString()}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:13px;">Reference Files</td><td style="padding:4px 0;font-size:13px;">${totalFiles || 0} uploaded${sharedLink ? ` · <a href="${sharedLink}" style="color:#4B2EC5;">Shared link</a>` : ''}</td></tr>

          ${notes ? `
          <tr><td colspan="2" style="padding:20px 0 6px;"><div style="border-top:1px solid #F0EDF9;"></div></td></tr>
          <tr><td colspan="2">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9B87E8;margin-bottom:8px;">Notes</div>
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
        from: 'Floortype Quotes <quotes@floortype.com>',
        to: [process.env.ADMIN_EMAIL || 'hello@floortype.com'],
        subject: `New Quote Request ${ref} — ${projectName} (${name})`,
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
