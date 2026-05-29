export const config = { runtime: 'nodejs' };

const GEM_PACKS = [
  { id: 'pack_60',   gems: 60,   price: 120,  name: '60 Gems' },
  { id: 'pack_350',  gems: 350,  price: 600,  name: '350 Gems' },
  { id: 'pack_1200', gems: 1200, price: 1800, name: '1200 Gems' },
  { id: 'pack_2500', gems: 2500, price: 3500, name: '2500 Gems' },
];

const BOOK_PRICE_ID = 'price_1TcQawDRTdCcXVmV5ru8bken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  const { packId, userId, type } = body || {};
  const origin = 'https://dancer-legend.vercel.app';

  try {
    let session;

    if (type === 'book') {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: 'jpy', product_data: { name: 'ダンスの歴史 大百科', description: 'バレエ・タップ・ソウル・HipHop・House 全ジャンル収録' }, unit_amount: 280 }, quantity: 1 }],
        mode: 'payment',
        success_url: origin + '?payment=book_success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: origin + '?payment=cancel',
        client_reference_id: userId || 'guest',
        metadata: { type: 'book', userId: userId || '' },
      });
    } else {
      const pack = GEM_PACKS.find(p => p.id === packId);
      if (!pack) return res.status(400).json({ error: 'Invalid pack' });
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: 'jpy', product_data: { name: pack.name, description: 'DANCING QUEST gems' }, unit_amount: pack.price }, quantity: 1 }],
        mode: 'payment',
        success_url: origin + '?payment=success&gems=' + pack.gems + '&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: origin + '?payment=cancel',
        client_reference_id: userId || 'guest',
        metadata: { gems: String(pack.gems), userId: userId || '', packId: pack.id },
      });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
