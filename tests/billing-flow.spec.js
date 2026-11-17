import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ docs: new Map(), deleteUser: vi.fn(), stripe: { customers: { create: vi.fn(), retrieve: vi.fn(), del: vi.fn() }, subscriptions: { list: vi.fn(), cancel: vi.fn() }, prices: { retrieve: vi.fn() }, checkout: { sessions: { create: vi.fn() } }, billingPortal: { sessions: { create: vi.fn() } } } }));
vi.mock('../server/admin', () => {
  const doc = path => ({ path, delete: async () => mocks.docs.delete(path), get: async () => ({ exists: mocks.docs.has(path), data: () => mocks.docs.get(path) }), set: async (data, options) => { mocks.docs.set(path, options?.merge ? { ...mocks.docs.get(path), ...data } : data); } });
  const emptyQuery = { where() { return this; }, get: async () => ({ docs: [] }) };
  return { adminServices: () => ({ auth: { deleteUser: mocks.deleteUser }, db: { doc, collection: () => emptyQuery, collectionGroup: () => emptyQuery, recursiveDelete: vi.fn(async () => {}), runTransaction: async fn => fn({ get: ref => ref.get(), set: (ref, data, options) => ref.set(data, options) }) } }) };
});
vi.mock('stripe', () => ({ default: class { constructor() { return mocks.stripe; } } }));
import { billingApi } from '../server/controllers/billingController';
import { deleteAccount } from '../server/controllers/accountController';
import { refreshBilling } from '../server/billing';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
beforeEach(() => {
  mocks.docs.clear(); vi.clearAllMocks();
  for (const [key, value] of Object.entries({ STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_PRO_PRICE_ID: 'price_server', STRIPE_WEBHOOK_SECRET: 'whsec_fake', APP_URL: 'https://academy.example.com', ENABLE_PAID_AI: 'true', OPENAI_API_KEY: 'test-only' })) vi.stubEnv(key, value);
  mocks.stripe.customers.retrieve.mockResolvedValue({ id: 'cus_alice' });
  mocks.stripe.customers.del.mockResolvedValue({ deleted: true });
  mocks.stripe.subscriptions.cancel.mockResolvedValue({ status: 'canceled' });
  mocks.stripe.customers.create.mockResolvedValue({ id: 'cus_alice' });
  mocks.stripe.subscriptions.list.mockResolvedValue({ data: [] });
  mocks.stripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  mocks.stripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
});
afterEach(() => vi.unstubAllEnvs());
it('binds checkout to the verified account and configured price and reuses an idempotent session', async () => {
  const req = { method: 'POST', identity: { uid: 'alice', email: 'alice@example.com', email_verified: true }, body: { action: 'checkout', uid: 'bob', price: 'price_attacker', customer: 'cus_bob', plan: 'pro' } };
  const res = response(); await billingApi(req, res); expect(res.statusCode).toBe(200);
  const [params, options] = mocks.stripe.checkout.sessions.create.mock.calls[0];
  expect(params.customer).toBe('cus_alice'); expect(params.line_items).toEqual([{ price: 'price_server', quantity: 1 }]); expect(params.client_reference_id).toBe('alice');
  await billingApi(req, response()); expect(mocks.stripe.checkout.sessions.create.mock.calls[1][1].idempotencyKey).toBe(options.idempotencyKey);
  expect(mocks.docs.get('billingCustomers/alice').plan).toBe('free');
});
it('keeps the cancellation portal available when new purchases and cloud AI are disabled', async () => {
  vi.stubEnv('STRIPE_PORTAL_CONFIGURATION_ID', 'bpc_future_academy');
  vi.stubEnv('ENABLE_PAID_AI', 'false'); vi.stubEnv('OPENAI_API_KEY', '');
  mocks.docs.set('billingCustomers/alice', { customerId: 'cus_alice' });
  const res = response(); await billingApi({ method: 'POST', identity: { uid: 'alice', email_verified: false }, body: { action: 'portal' } }, res);
  expect(res.body.url).toContain('billing.stripe.com');
  expect(mocks.stripe.billingPortal.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ configuration: 'bpc_future_academy' }));
});
it('refreshes entitlement from the current Stripe subscription instead of trusting event order or client data', async () => {
  mocks.stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_active', created: 100, status: 'active', items: { data: [{ price: { id: 'price_server' }, current_period_end: Math.floor(Date.now() / 1000) + 3600 }] } }] });
  expect((await refreshBilling('alice', 'cus_alice', mocks.stripe)).plan).toBe('pro');
  mocks.stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_active', created: 100, status: 'past_due', items: { data: [] } }] });
  expect((await refreshBilling('alice', 'cus_alice', mocks.stripe)).plan).toBe('free');
});

it('requires a recent login and cancels subscriptions before deleting an account', async () => {
  const expired = response(); await deleteAccount({ method: 'DELETE', identity: { uid: 'alice', auth_time: 1 } }, expired);
  expect(expired.statusCode).toBe(401); expect(mocks.deleteUser).not.toHaveBeenCalled();
  mocks.docs.set('billingCustomers/alice', { customerId: 'cus_alice' });
  mocks.stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_active', status: 'active' }] });
  const res = response(); await deleteAccount({ method: 'DELETE', identity: { uid: 'alice', auth_time: Math.floor(Date.now() / 1000) } }, res);
  expect(res.body).toEqual({ ok: true }); expect(mocks.stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_active'); expect(mocks.deleteUser).toHaveBeenCalledWith('alice', 'alice');
  expect(mocks.stripe.subscriptions.cancel.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteUser.mock.invocationCallOrder[0]);
  expect(mocks.docs.has('accountDeletions/alice')).toBe(true);
});
