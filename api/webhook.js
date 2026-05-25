import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // RLSをbypassするためservice roleキーを使用
);

export const config = {
  api: { bodyParser: false }, // Stripe署名検証のため必須
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const gems = parseInt(session.metadata?.gems || '0');

    if (!userId || !gems) {
      console.log('Missing userId or gems in metadata');
      return res.status(200).json({ received: true });
    }

    try {
      // 現在のキャラデータを取得
      const { data, error } = await supabase
        .from('characters')
        .select('data')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Character not found:', userId, error);
        return res.status(200).json({ received: true });
      }

      // ジェムを追加
      const charData = data.data;
      charData.gems = (charData.gems || 0) + gems;

      const { error: updateError } = await supabase
        .from('characters')
        .update({ data: charData, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
      } else {
        console.log(`✅ Added ${gems} gems to user ${userId}. Total: ${charData.gems}`);
      }
    } catch (err) {
      console.error('Error adding gems:', err);
    }
  }

  res.status(200).json({ received: true });
}
