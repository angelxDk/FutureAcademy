import { it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), deleteUser: vi.fn() }));
vi.mock('../server/supabase', () => ({ supabaseAdmin: () => ({ auth: { getUser: mocks.getUser, admin: { deleteUser: mocks.deleteUser } } }) }));
import { adminServices } from '../server/admin';
const token = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
beforeEach(() => vi.clearAllMocks());
it('validates the token remotely and uses only server-controlled legacy identity metadata', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'supabase-id', email: 'student@example.com', email_confirmed_at: '2026-11-13', app_metadata: { legacy_uid: 'old-firebase-id' }, user_metadata: { legacy_uid: 'attacker', display_name: 'Estudante' } } } });
  const jwt = token({ amr: [{ timestamp: 123, method: 'password' }], iat: 999 });
  const identity = await adminServices().auth.verifyIdToken(jwt);
  expect(mocks.getUser).toHaveBeenCalledWith(jwt);
  expect(identity).toMatchObject({ uid: 'old-firebase-id', sub: 'supabase-id', email_verified: true, auth_time: 123 });
});
it('does not treat a refreshed JWT issue time as recent reauthentication and rejects invalid sessions', async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'id', app_metadata: {} } } });
  expect((await adminServices().auth.verifyIdToken(token({ iat: Date.now() / 1000 }))).auth_time).toBe(0);
  mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') });
  await expect(adminServices().auth.verifyIdToken(token({}))).rejects.toThrow('invalid');
});
