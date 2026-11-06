import { beforeEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../src/firebase', () => ({
  auth: {}, googleProvider: {}, facebookProvider: {}, signInWithPopup: vi.fn(), signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), normalizeFirebaseUser: vi.fn(), loadUserData: vi.fn(), saveUserData: vi.fn()
}));
import { signInWithEmailAndPassword } from '../src/firebase';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useAppStore } from '../src/stores/useAppStore';
beforeEach(() => setActivePinia(createPinia()));
it('keeps the login form mounted and the typed email available when authentication fails', async () => {
  let rejectLogin;
  signInWithEmailAndPassword.mockImplementation(() => new Promise((resolve, reject) => { rejectLogin = reject; }));
  const auth = useAuthStore(); auth.authLoading = false;
  auth.authEmail = 'student@example.com'; auth.authPassword = 'example-password';
  const pending = auth.loginWithEmail('login', '', '');
  expect(auth.authBusy).toBe(true);
  expect(auth.authLoading).toBe(false);
  rejectLogin({ code: 'auth/invalid-credential' }); await pending;
  expect(auth.authBusy).toBe(false); expect(auth.authLoading).toBe(false);
  expect(auth.authEmail).toBe('student@example.com'); expect(auth.authUser).toBeNull();
  clearTimeout(useAppStore().toastTimeout);
});
