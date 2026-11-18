import { it, expect, vi } from 'vitest';
const { signInWithOAuth } = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock('../src/services/supabase', () => ({ supabase: null, requireSupabase: () => ({ auth: { signInWithOAuth } }) }));
import { signInWithPopup } from '../src/auth';
it.each(['google'])('starts %s login and returns to the current origin', async provider => {
  signInWithOAuth.mockResolvedValue({ error: null });
  await expect(signInWithPopup(null, provider)).resolves.toEqual({ redirected: true });
  expect(signInWithOAuth).toHaveBeenLastCalledWith({ provider, options: {
    redirectTo: `${window.location.origin}/`
  } });
});
it('propagates provider errors instead of reporting a successful redirect', async () => {
  signInWithOAuth.mockResolvedValue({ error: new Error('Provider unavailable') });
  await expect(signInWithPopup(null, 'google')).rejects.toThrow('Provider unavailable');
});
