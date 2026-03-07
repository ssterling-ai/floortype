export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, name, email, ref } = req.body;

  if (!amount || amount < 50) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const params = new URLSearchParams({
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      'payment_method_types[]': 'card',
      'metadata[ref]': ref || '',
      'metadata[client_name]': name || '',
      'metadata[client_email]': email || '',
      description: `Floortype deposit — ${ref}`,
      receipt_email: email || '',
    });

    const r = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Stripe error');

    res.status(200).json({ clientSecret: data.client_secret });

  } catch(e) {
    console.error('Payment intent error:', e);
    res.status(500).json({ error: e.message });
  }
}
