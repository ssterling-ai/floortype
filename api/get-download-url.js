export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = 'https://ompbigbvlsrlrqncfaag.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcGJpZ2J2bHNybHJxbmNmYWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjAzMjEsImV4cCI6MjA4NzEzNjMyMX0.rlFyDdgeXHWmqbN_Pu3YHcbWoNqS_gdnuEEv4XyK9yM';

  try {
    const { filePath, userToken } = req.body;
    if (!filePath) return res.status(400).json({ error: 'filePath required' });

    // Verify the user token is valid before generating download URL
    if (userToken) {
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${userToken}`
        }
      });
      if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a signed URL valid for 1 hour (3600 seconds)
    const signRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/deliverables/${filePath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({ expiresIn: 3600 })
      }
    );

    const signData = await signRes.json();
    if (!signRes.ok) throw new Error(JSON.stringify(signData));

    return res.status(200).json({ 
      url: `${SUPABASE_URL}/storage/v1${signData.signedURL}` 
    });
  } catch(e) {
    console.error('Download URL error:', e);
    return res.status(500).json({ error: e.message });
  }
}
