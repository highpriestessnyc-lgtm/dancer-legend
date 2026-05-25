import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const GEM_PACKS = [
  { id: 'pack_60',   gems: 60,   price: 120,  name: '💎 60ジェム' },
  { id: 'pack_350',  gems: 350,  price: 600,  name: '💎 350ジェム' },
  { id: 'pack_1200', gems: 1200, price: 1800, name: '💎 1,200ジェム' },
  { id: 'pack_2500', gems: 2500, price: 3500, name: '💎 2,500ジェム' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { packId, userId } = req.body;

  const pack = GEM_PACKS.find(p => p.id === packId);
  if (!pack) {
    return res.status(400).json({ error: 'Invalid pack' });
  }

  const origin = req.headers.origin || 'https://dancer-legend.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: pack.name,
            description: `DANCING QUEST ゲーム内通貨`,
          },
          unit_amount: pack.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}?payment=success&gems=${pack.gems}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?payment=cancel`,
      client_reference_id: userId || 'guest',
      metadata: {
        gems: String(pack.gems),
        userId: userId || '',
        packId: pack.id,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}
