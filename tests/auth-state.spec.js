import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../src/auth', () => ({
  auth: {}, sendPasswordResetEmail: vi.fn(), sendEmailVerification: vi.fn(), resendSignupConfirmation: vi.fn(), googleProvider: {}, facebookProvider: {}, signInWithPopup: vi.fn(), signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), normalizeUser: vi.fn(), loadUserData: vi.fn(), saveUserData: vi.fn()
}));
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, resendSignupConfirmation, sendPasswordResetEmail, normalizeUser } from '../src/auth';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useAppStore } from '../src/stores/useAppStore';
beforeEach(() => { vi.resetAllMocks(); setActivePinia(createPinia()); });
afterEach(() => { clearTimeout(useAppStore().toastTimeout); });
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
  useAppStore().toast.visible = false;
  expect(auth.authFeedback).toContain('E-mail ou senha incorretos');
  expect(auth.authFeedbackType).toBe('error'); expect(auth.authCanResendConfirmation).toBe(false);
  clearTimeout(useAppStore().toastTimeout);
});
it('sends a password reset without exposing whether the email has an account', async () => {
  const { sendPasswordResetEmail } = await import('../src/auth');
  sendPasswordResetEmail.mockResolvedValueOnce();
  const auth = useAuthStore(); await auth.resetPassword('student@example.com');
  expect(sendPasswordResetEmail).toHaveBeenCalled();
  expect(useAppStore().toast.message).toContain('Se houver uma conta elegível');
  expect(auth.authRecoveryRequested).toBe(true); expect(auth.authFeedbackType).toBe('info');
  expect(auth.authFeedback).toContain('código');
  clearTimeout(useAppStore().toastTimeout);
});
it('hydrates once when Supabase repeats a signed-in event for the same session', async () => {
  const { onAuthStateChanged, normalizeUser } = await import('../src/auth');
  const { useSyncStore } = await import('../src/stores/useSyncStore');
  let notify, finish;
  onAuthStateChanged.mockImplementation((_auth, callback) => { notify = callback; return () => {}; });
  normalizeUser.mockImplementation(user => ({ uid: user.uid, name: 'Estudante' }));
  const load = vi.spyOn(useSyncStore(), 'loadStateFromCloud').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const auth = useAuthStore(); auth.initAuth();
  const first = notify({ uid: 'alice' });
  expect(auth.dataLoading).toBe(true);
  await notify({ uid: 'alice' });
  expect(load).toHaveBeenCalledTimes(1); expect(auth.dataLoading).toBe(true);
  finish(); await first;
  expect(auth.dataLoading).toBe(false);
});

it('keeps confirmation instructions visible after signup without a session', async () => {
  createUserWithEmailAndPassword.mockResolvedValueOnce({ user: null, needsConfirmation: true });
  const auth = useAuthStore(); auth.authEmail = ' student@example.com '; auth.authPassword = 'test-password-123';
  await auth.loginWithEmail('register', 'Estudante', 'test-password-123');
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'student@example.com', 'test-password-123', 'Estudante');
  expect(auth.authUser).toBeNull(); expect(auth.authBusy).toBe(false);
  expect(auth.authFeedback).toContain('confirmar o cadastro'); expect(auth.authFeedbackType).toBe('info');
  expect(auth.authCanResendConfirmation).toBe(true); expect(auth.authConfirmationEmail).toBe('student@example.com');
  expect(updateProfile).not.toHaveBeenCalled();
  useAppStore().toast.visible = false;
  expect(auth.authFeedback).toContain('confirmar o cadastro');
});

it('offers confirmation resend for an unconfirmed account login', async () => {
  signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'email_not_confirmed' });
  const auth = useAuthStore(); auth.authEmail = 'student@example.com'; auth.authPassword = 'test-password-123';
  await auth.loginWithEmail('login', '', '');
  expect(auth.authFeedback).toBe('Confirme seu e-mail antes de entrar.'); expect(auth.authFeedbackType).toBe('error');
  expect(auth.authCanResendConfirmation).toBe(true); expect(auth.authConfirmationEmail).toBe('student@example.com');
  expect(auth.authBusy).toBe(false);
});

it('resends confirmation only to the current matching email and releases the busy state after failure', async () => {
  const auth = useAuthStore(); auth.authCanResendConfirmation = true; auth.authConfirmationEmail = 'student@example.com';
  let fail;
  resendSignupConfirmation.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  const pending = auth.resendConfirmation(' student@example.com ');
  expect(auth.authBusy).toBe(true);
  expect(resendSignupConfirmation).toHaveBeenCalledWith('student@example.com');
  await auth.resendConfirmation('student@example.com'); expect(resendSignupConfirmation).toHaveBeenCalledTimes(1);
  fail({ code: 'over_email_send_rate_limit' }); await pending;
  expect(auth.authBusy).toBe(false); expect(auth.authFeedbackType).toBe('error');
  expect(auth.authFeedback).toContain('Aguarde'); expect(auth.authCanResendConfirmation).toBe(true);
});

it('does not resend confirmation to a different or unvalidated email', async () => {
  const auth = useAuthStore(); auth.authCanResendConfirmation = true; auth.authConfirmationEmail = 'old@example.com';
  await auth.resendConfirmation('new@example.com');
  expect(resendSignupConfirmation).not.toHaveBeenCalled();
  expect(auth.authFeedback).toContain('O e-mail foi alterado'); expect(auth.authCanResendConfirmation).toBe(false);
  await auth.resendConfirmation('invalid');
  expect(resendSignupConfirmation).not.toHaveBeenCalled(); expect(auth.authBusy).toBe(false);
});

it('uses the email currently supplied for recovery and keeps the result private', async () => {
  const auth = useAuthStore(); auth.authEmail = 'stale@example.com';
  await auth.resetPassword(' current@example.com ');
  expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'current@example.com');
  const message = auth.authFeedback;
  sendPasswordResetEmail.mockRejectedValueOnce({ code: 'user_not_found' });
  await auth.resetPassword('unknown@example.com');
  expect(auth.authFeedback).toBe(message); expect(auth.authFeedbackType).toBe('info');
  expect(auth.authRecoveryRequested).toBe(true); expect(auth.authBusy).toBe(false);
});

it('clears previous feedback and recovery actions before a new successful login', async () => {
  const auth = useAuthStore(); auth.authFeedback = 'Old failure'; auth.authCanResendConfirmation = true;
  auth.authConfirmationEmail = 'old@example.com'; auth.authRecoveryRequested = true;
  signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'alice' } });
  normalizeUser.mockReturnValueOnce({ uid: 'alice', name: 'Estudante' });
  auth.authEmail = 'student@example.com'; auth.authPassword = 'test-password-123';
  await auth.loginWithEmail('login', '', '');
  expect(auth.authFeedback).toBe(''); expect(auth.authCanResendConfirmation).toBe(false);
  expect(auth.authConfirmationEmail).toBe(''); expect(auth.authRecoveryRequested).toBe(false);
  expect(auth.authUser.uid).toBe('alice'); expect(auth.authBusy).toBe(false);
});

it('clears stale confirmation and recovery actions when switching forms', () => {
  const auth = useAuthStore(); auth.authFeedback = 'Old failure'; auth.authCanResendConfirmation = true;
  auth.authConfirmationEmail = 'old@example.com'; auth.authRecoveryRequested = true;
  auth.clearAuthFeedback();
  expect(auth.authFeedback).toBe(''); expect(auth.authFeedbackType).toBe('info');
  expect(auth.authCanResendConfirmation).toBe(false); expect(auth.authConfirmationEmail).toBe(''); expect(auth.authRecoveryRequested).toBe(false);
});
