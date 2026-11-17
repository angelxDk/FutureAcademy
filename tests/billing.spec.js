import { it, expect, vi, afterEach } from 'vitest';
import Stripe from 'stripe';
import { hasPro } from '../server/billing';
import { sanitizeMonitoringEvent } from '../src/utils/monitoring';
const stripe = new Stripe('sk_test_not_a_real_key');
vi.mock('../server/admin', () => ({ adminServices: () => ({ db: { doc: vi.fn(() => ({ get: async () => ({ exists: true }) })) } }) }));
vi.mock('../server/billing', async importOriginal => ({ ...await importOriginal(), stripeClient: () => stripe }));
import { stripeWebhook } from '../server/controllers/billingController';
const res = () => ({ status: vi.fn(function() { return this; }), json: vi.fn(function() { return this; }) });
afterEach(() => vi.unstubAllEnvs());
it('grants Pro only for a confirmed active subscription before expiration', () => {
  expect(hasPro({ plan: 'pro', status: 'active', validUntil: 200 }, 100)).toBe(true);
  expect(hasPro({ plan: 'pro', status: 'past_due', validUntil: 200 }, 100)).toBe(false);
  expect(hasPro({ plan: 'pro', status: 'active', validUntil: 100 }, 100)).toBe(false);
  expect(hasPro({ plan: 'free', status: 'active', validUntil: 200 }, 100)).toBe(false);
});
it('verifies the raw Stripe payload and accepts a previously processed event without applying it again', async () => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_only');
  const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated', data: { object: { customer: 'cus_test' } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_only' });
  const valid = res(); await stripeWebhook({ method: 'POST', body: Buffer.from(payload), headers: { 'stripe-signature': signature } }, valid);
  expect(valid.json).toHaveBeenCalledWith({ received: true });
  const invalid = res(); await stripeWebhook({ method: 'POST', body: Buffer.from(payload + ' '), headers: { 'stripe-signature': signature } }, invalid);
  expect(invalid.status).toHaveBeenCalledWith(400);
});
it('removes personal content, request credentials and raw messages from diagnostics', () => {
  const clean = sanitizeMonitoringEvent({ user: { email: 'private@example.com' }, request: { headers: { authorization: 'secret' } }, breadcrumbs: [{ message: 'student text' }], exception: { values: [{ type: 'Error', value: 'secret content', stacktrace: { frames: [{ filename: '/Users/private/app.js?token=secret', lineno: 7 }] } }] } });
  const json = JSON.stringify(clean); expect(json).not.toContain('secret'); expect(json).not.toContain('private'); expect(json).not.toContain('student text'); expect(json).toContain('app.js');
});
