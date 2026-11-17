import { it, expect, vi, afterEach } from 'vitest';
import { authorize } from '../server/security';
import { chatAssistant } from '../server/controllers/aiController';
vi.mock('../server/billing', () => ({ getBilling: vi.fn(async () => ({ plan: 'pro', status: 'active', validUntil: Date.now() + 100000 })), hasPro: b => b.plan === 'pro' }));
const response = () => ({ status: vi.fn(function() { return this; }), json: vi.fn(function() { return this; }), setHeader: vi.fn() });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('rejects missing and invalid bearer tokens before consuming quota', async () => {
  const quota = vi.fn(), verify = vi.fn(async () => { throw new Error('invalid'); });
  const missing = response(); expect(await authorize({ headers: {} }, missing, { verify, quota })).toBe(false);
  expect(missing.status).toHaveBeenCalledWith(401); expect(verify).not.toHaveBeenCalled();
  const invalid = response(); expect(await authorize({ headers: { authorization: 'Bearer fake' } }, invalid, { verify, quota })).toBe(false);
  expect(invalid.status).toHaveBeenCalledWith(401); expect(quota).not.toHaveBeenCalled();
});
it('enforces quota and fails closed when shared quota is unavailable', async () => {
  const verify = vi.fn(async () => ({ uid: 'alice' }));
  const req = { headers: { authorization: 'Bearer token' }, url: '/api/openai' };
  const limited = response(); expect(await authorize(req, limited, { verify, quota: async () => false })).toBe(false);
  expect(limited.status).toHaveBeenCalledWith(429);
  const unavailable = response(); expect(await authorize(req, unavailable, { verify, quota: async () => { throw new Error('offline'); } })).toBe(false);
  expect(unavailable.status).toHaveBeenCalledWith(503);
  const ok = response(); expect(await authorize(req, ok, { verify, quota: async () => true })).toBe(true);
  expect(req.identity.uid).toBe('alice'); expect(ok.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});
it('disables paid AI by default and pins model and output budget to server configuration', async () => {
  vi.stubEnv('ENABLE_PAID_AI', 'false'); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const denied = response(); await chatAssistant({ method: 'POST', identity: { uid: 'alice' }, body: { prompt: 'Question' } }, denied);
  expect(denied.status).toHaveBeenCalledWith(403); expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('ENABLE_PAID_AI', 'true'); vi.stubEnv('OPENAI_MODEL', 'configured-model'); vi.stubEnv('OPENAI_API_KEY', 'test-only');
  fetch.mockResolvedValue({ ok: true, json: async () => ({ output_text: 'Answer' }) });
  await chatAssistant({ method: 'POST', identity: { uid: 'alice' }, body: { prompt: 'Question', model: 'expensive-untrusted' } }, response());
  const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body.model).toBe('configured-model'); expect(body.max_output_tokens).toBe(1024);
});
