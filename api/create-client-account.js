export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, orderRef } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // First check if user already exists
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );

    const listData = await listRes.json();
    const existingUser = listData?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(200).json({ ok: true, existing: true });
    }

    // Create new user with a magic link / invite
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        email,
        email_confirm: false,
        user_metadata: {
          full_name: name,
          order_ref: orderRef
        }
      })
    });

    const createText = await createRes.text();
    let createData;
    try { createData = JSON.parse(createText); }
    catch(e) { throw new Error('Supabase returned unexpected response: ' + createText.slice(0, 200)); }

    if (!createRes.ok) {
      const msg = createData.msg || createData.message || createData.error_description || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return res.status(200).json({ ok: true, existing: true });
      }
      throw new Error(msg || 'Account creation failed');
    }

    // Send password reset email as the "set your password" mechanism
    const resetRes = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        email,
        redirect_to: 'https://floortype.com/portal'
      })
    });

    console.log('Password reset email sent, status:', resetRes.status);
    return res.status(200).json({ ok: true, existing: false });

  } catch(e) {
    console.error('Account creation error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
