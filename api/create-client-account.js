export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, orderRef } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Use invite endpoint which sends a proper "set your password" email
    // with a redirect back to the portal
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        email,
        data: { 
          full_name: name,
          order_ref: orderRef
        },
        redirect_to: 'https://floortype.com/portal'
      })
    });

    const inviteData = await inviteRes.json();

    // If user already exists that's fine — they already have an account
    if (!inviteRes.ok) {
      const msg = inviteData.msg || inviteData.message || '';
      if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('registered') ||
        inviteData.code === 'email_exists'
      ) {
        return res.status(200).json({ ok: true, existing: true });
      }
      console.error('Invite error:', JSON.stringify(inviteData));
      throw new Error(JSON.stringify(inviteData));
    }

    return res.status(200).json({ ok: true, existing: false });

  } catch(e) {
    console.error('Account creation error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
