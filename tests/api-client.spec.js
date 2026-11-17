import { it, expect, vi, afterEach } from 'vitest';
vi.mock('../src/auth', () => ({ auth: { currentUser: null } }));
import { auth } from '../src/auth';
import { apiFetch } from '../src/services/api';
afterEach(() => { vi.unstubAllGlobals(); auth.currentUser = null; });
it('refuses anonymous API calls and attaches a fresh identity token to authenticated calls', async () => {
  const fetch = vi.fn(async () => ({ ok: true })); vi.stubGlobal('fetch', fetch);
  await expect(apiFetch('/api/study-ai')).rejects.toThrow('Entre na sua conta'); expect(fetch).not.toHaveBeenCalled();
  auth.currentUser = { getIdToken: vi.fn(async () => 'signed-token') };
  await apiFetch('/api/study-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const options = fetch.mock.calls[0][1]; expect(options.headers.get('Authorization')).toBe('Bearer signed-token'); expect(options.headers.get('Content-Type')).toBe('application/json');
  expect(options.cache).toBe('no-store'); expect(options.redirect).toBe('error');
});

it.each(['https://outside.example/api/private', '//outside.example/api/private', '/api/../private', '/api/../../api/../private'])('does not send an identity token to an untrusted target: %s', async path => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const token = vi.fn(async () => 'private-token'); auth.currentUser = { getIdToken: token };
  await expect(apiFetch(path)).rejects.toThrow('inválido');
  expect(fetch).not.toHaveBeenCalled(); expect(token).not.toHaveBeenCalled();
});

it('cancels a request if the account changes while refreshing its token', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  let finish;
  auth.currentUser = { uid: 'alice', id: 'alice', getIdToken: () => new Promise(resolve => { finish = resolve; }) };
  const pending = apiFetch('/api/account');
  auth.currentUser = { uid: 'bob', id: 'bob', getIdToken: async () => 'another-account' };
  finish('previous-token');
  await expect(pending).rejects.toThrow('conta mudou');
  expect(fetch).not.toHaveBeenCalled();
});

it('allows a refreshed session object for the same account', async () => {
  const fetch = vi.fn(async () => ({ ok: true })); vi.stubGlobal('fetch', fetch);
  auth.currentUser = { uid: 'alice', id: 'alice', getIdToken: async () => {
    auth.currentUser = { uid: 'alice', id: 'alice', getIdToken: async () => 'fresh-token' };
    return 'fresh-token';
  } };
  await apiFetch('/api/account');
  expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer fresh-token');
});
