export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, orderRef } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Check if user already exists by trying to list users
    // Use admin API to invite user — sends "Set your password" email
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        email,
        email_confirm: false, // sends confirmation/invite email
        user_metadata: { full_name: name, order_ref: orderRef },
        options: {
          data: { full_name: name }
        }
      })
    });

    const inviteData = await inviteRes.json();

    // If user already exists (duplicate), that's fine — don't error
    if (!inviteRes.ok) {
      if (inviteData.msg?.includes('already been registered') || 
          inviteData.code === 'email_exists' ||
          inviteData.message?.includes('already registered')) {
        return res.status(200).json({ ok: true, existing: true });
      }
      throw new Error(JSON.stringify(inviteData));
    }

    return res.status(200).json({ ok: true, existing: false });

  } catch(e) {
    console.error('Account creation error:', e);
    return res.status(500).json({ error: e.message });
  }
}
