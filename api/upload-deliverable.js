export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    const { orderRef, fileName, fileBase64, mimeType } = req.body;
    if (!orderRef || !fileName || !fileBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(fileBase64, 'base64');
    const filePath = `${orderRef}/${fileName}`;

    // Upload to Supabase Storage bucket 'deliverables'
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/deliverables/${filePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': mimeType || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: buffer
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(err);
    }

    // Save file record to order_files table
    await fetch(`${SUPABASE_URL}/rest/v1/order_files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        order_ref: orderRef,
        file_name: fileName,
        file_path: filePath,
        file_type: mimeType,
        file_size: buffer.length,
        category: 'deliverable'
      })
    });

    return res.status(200).json({ ok: true, path: filePath });
  } catch(e) {
    console.error('Upload error:', e);
    return res.status(500).json({ error: e.message });
  }
}
