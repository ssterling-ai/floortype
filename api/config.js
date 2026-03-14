export default async function handler(req, res) {
  res.status(200).json({ stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
}
