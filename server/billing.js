import Stripe from 'stripe';
import { adminServices } from './admin.js';
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('billing/unconfigured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
}
export function hasPro(billing, now = Date.now()) {
  return billing?.plan === 'pro' && billing.validUntil > now && ['active', 'trialing'].includes(billing.status);
}
export async function getBilling(uid) {
  return (await adminServices().db.doc(`billingCustomers/${uid}`).get()).data() || { plan: 'free' };
}
export async function refreshBilling(uid, customerId, stripe = stripeClient()) {
  const { db } = adminServices();
  const startedAt = Date.now();
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  const active = subscriptions.data.filter(s => ['active', 'trialing'].includes(s.status) && s.items.data.some(i => i.price.id === process.env.STRIPE_PRO_PRICE_ID)).sort((a, b) => b.created - a.created)[0];
  const validUntil = active ? Math.max(...active.items.data.filter(i => i.price.id === process.env.STRIPE_PRO_PRICE_ID).map(i => i.current_period_end || 0)) * 1000 : 0;
  const billing = { customerId, plan: active ? 'pro' : 'free', status: active?.status || 'inactive', subscriptionId: active?.id || null, validUntil, cancelAtPeriodEnd: !!active?.cancel_at_period_end, updatedAt: startedAt };
  return db.runTransaction(async tx => {
    const ref = db.doc(`billingCustomers/${uid}`), previous = (await tx.get(ref)).data();
    if (previous?.updatedAt > startedAt || (previous?.customerId && previous.customerId !== customerId)) return previous;
    tx.set(ref, billing, { merge: true }); return billing;
  });
}
export function appOrigin() {
  const url = new URL(process.env.APP_URL || '');
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('billing/origin');
  return url.origin;
}
