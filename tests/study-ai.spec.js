import { it, expect, vi, afterEach } from 'vitest';
import { studyAi } from '../server/controllers/studyAiController';
afterEach(() => vi.unstubAllGlobals());
const response = () => ({ status: vi.fn(function() { return this; }), json: vi.fn(function() { return this; }) });
it('lists local Ollama models without requiring API credentials', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ models: [{ name: 'model:small' }] }) })); vi.stubGlobal('fetch', fetch);
  const res = response(); await studyAi({ method: 'GET' }, res);
  expect(res.json).toHaveBeenCalledWith({ models: ['model:small'] });
  expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/tags');
});
it('rejects malformed conversation data before contacting Ollama', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const res = response(); await studyAi({ method: 'POST', body: { model: 'm', messages: [{ role: 'tool', content: 'x' }] } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(fetch).not.toHaveBeenCalled();
});
it('returns the local model response and explains connection failure', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ message: { content: 'Uma explicação.' } }) })); vi.stubGlobal('fetch', fetch);
  const res = response(); const req = { method: 'POST', body: { model: 'm', messages: [{ role: 'user', content: 'Explique' }] } };
  await studyAi(req, res); expect(res.json).toHaveBeenCalledWith({ text: 'Uma explicação.' });
  expect(JSON.parse(fetch.mock.calls[0][1].body).stream).toBe(false);
  fetch.mockRejectedValue(new Error('ECONNREFUSED')); const errorRes = response(); await studyAi(req, errorRes);
  expect(errorRes.status).toHaveBeenCalledWith(503);
  expect(errorRes.json.mock.calls[0][0].error).toContain('Ollama não está acessível');
});
