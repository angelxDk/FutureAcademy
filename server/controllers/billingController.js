import { randomUUID } from 'node:crypto';
import { adminServices } from '../admin.js';
import { stripeClient, getBilling, hasPro, refreshBilling, appOrigin } from '../billing.js';
import { reportServerError } from '../security.js';

export async function billingApi(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const uid = req.identity.uid, { db } = adminServices();
    let billing = await getBilling(uid);
    const configured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET && process.env.APP_URL && process.env.ENABLE_PAID_AI === 'true' && process.env.OPENAI_API_KEY);
    if (req.method === 'GET') {
      let price = null;
      if (configured) {
        const p = await stripeClient().prices.retrieve(process.env.STRIPE_PRO_PRICE_ID);
        if (p.active && p.recurring && p.unit_amount != null) price = { amount: p.unit_amount, currency: p.currency, interval: p.recurring.interval, intervalCount: p.recurring.interval_count };
      }
      return res.json({ plan: hasPro(billing) ? 'pro' : 'free', status: billing.status || 'inactive', validUntil: billing.validUntil || null, cancelAtPeriodEnd: !!billing.cancelAtPeriodEnd, configured: configured && !!price, canManage: !!(billing.customerId && process.env.STRIPE_SECRET_KEY && process.env.APP_URL), price });
    }
    const action = req.body?.action;
    if (!['checkout', 'portal', 'refresh'].includes(action)) return res.status(400).json({ error: 'Ação inválida.' });
    if (action === 'checkout' && !configured) return res.status(503).json({ error: 'A contratação do Pro ainda não está disponível.' });
    if (action === 'checkout' && !req.identity.email_verified) return res.status(403).json({ error: 'Verifique seu e-mail antes de contratar.' });
    if (!process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) { if (action === 'refresh') return res.json({ plan: hasPro(billing) ? 'pro' : 'free' }); return res.status(503).json({ error: 'Portal de cobrança indisponível. Entre em contato com o suporte.' }); }
    const stripe = stripeClient(), origin = appOrigin();
    if (action === 'refresh') {
      if (billing.customerId) billing = await refreshBilling(uid, billing.customerId, stripe);
      return res.json({ plan: hasPro(billing) ? 'pro' : 'free' });
    }
    if (!billing.customerId) {
      if (action === 'portal') return res.status(400).json({ error: 'Sua conta ainda não tem uma assinatura.' });
      const customer = await stripe.customers.create({ email: req.identity.email, metadata: { uid } }, { idempotencyKey: `customer:${uid}` });
      await db.doc(`billingCustomers/${uid}`).set({ customerId: customer.id }, { merge: true });
      billing.customerId = customer.id;
    }
    const current = await refreshBilling(uid, billing.customerId, stripe);
    if (action === 'portal' || hasPro(current)) {
      const portal = await stripe.billingPortal.sessions.create({ customer: billing.customerId, return_url: `${origin}/profile`, ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID } : {}) });
      return res.json({ url: portal.url });
    }
    const ref = db.doc(`billingCustomers/${uid}`);
    // Reuse one checkout per customer, including retries after a failed network response.
    const sessionState = await db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data();
      if (data.checkoutExpiresAt > Date.now()) return data;
      const next = { checkoutKey: randomUUID(), checkoutExpiresAt: Date.now() + 3600000 };
      tx.set(ref, next, { merge: true }); return next;
    });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: billing.customerId,
      client_reference_id: uid, metadata: { uid }, subscription_data: { metadata: { uid } },
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/profile?assinatura=confirmada`, cancel_url: `${origin}/profile?assinatura=cancelada`,
      expires_at: Math.floor(sessionState.checkoutExpiresAt / 1000)
    }, { idempotencyKey: `checkout:${uid}:${sessionState.checkoutKey}` });
    return res.json({ url: session.url });
  } catch (error) { return reportServerError(error, res); }
}

export async function stripeWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Cobrança indisponível.' });
  let event, stripe;
  try {
    stripe = stripeClient();
    let raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 1048576) return res.status(413).json({ error: 'Payload muito grande.' }); chunks.push(chunk); }
      raw = Buffer.concat(chunks);
    }
    event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch { return res.status(400).json({ error: 'Assinatura do webhook inválida.' }); }
  try {
    if (!['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed'].includes(event.type)) return res.json({ received: true });
    const { db } = adminServices(), eventRef = db.doc(`stripeEvents/${event.id}`);
    if ((await eventRef.get()).exists) return res.json({ received: true });
    const object = event.data.object, customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      const uid = customer.metadata?.uid;
      if (uid) {
        const stored = await getBilling(uid);
        if (stored.customerId === customerId) await refreshBilling(uid, customerId, stripe);
      }
    }
    await eventRef.set({ processedAt: Date.now(), type: event.type });
    return res.json({ received: true });
  } catch (error) { return reportServerError(error, res); }
}
