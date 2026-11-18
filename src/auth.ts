import type { User } from '@supabase/supabase-js';
import { supabase, requireSupabase } from './services/supabase';
import { createCloudPersistence } from './services/cloudPersistence';
const cloudPersistence = createCloudPersistence(() => supabase);

export interface AcademicUser extends User {
  uid: string;
  displayName: string;
  emailVerified: boolean;
  getIdToken(): Promise<string>;
}

function wrapUser(user: User | null | undefined): AcademicUser | null {
  if (!user) return null;
  const legacyUid: unknown = user.app_metadata?.legacy_uid;
  const name: unknown = user.user_metadata?.display_name || user.user_metadata?.full_name;
  return { ...user, uid: typeof legacyUid === 'string' && legacyUid ? legacyUid : user.id,
    displayName: typeof name === 'string' ? name : '',
    emailVerified: !!user.email_confirmed_at,
    async getIdToken() {
      const { data, error } = await requireSupabase().auth.getSession();
      if (error || !data.session || data.session.user.id !== user.id) throw error || new Error('Sua sessão expirou. Entre novamente.');
      return data.session.access_token;
    }
  };
}
export const auth: { currentUser: AcademicUser | null } = { currentUser: null };
function setCurrentUser(user: User | null | undefined) {
  const next = wrapUser(user);
  if (auth.currentUser && auth.currentUser.uid !== next?.uid) cloudPersistence.clearUserData(auth.currentUser.uid);
  auth.currentUser = next;
  return next;
}
export const googleProvider = 'google';
export function normalizeUser(user: AcademicUser | null) {
  if (!user) return null;
  const avatar: unknown = user.user_metadata?.avatar_url;
  const provider: unknown = user.app_metadata?.provider;
  return { uid: user.uid, emailVerified: user.emailVerified, name: user.displayName || user.email?.split('@')[0] || 'Usuário',
    email: user.email || '', photo: typeof avatar === 'string' && avatar ? avatar : `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email || 'user')}&backgroundColor=b6e3f4`,
    provider: typeof provider === 'string' ? provider : 'email' };
}
export function onAuthStateChanged(_auth: unknown, callback: (user: AcademicUser | null) => unknown) {
  if (!supabase) { queueMicrotask(() => callback(null)); return () => {}; }
  let active = true;
  // The SDK emits INITIAL_SESSION. Do not await other auth operations inside its lock.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentUser(session?.user);
    const user = auth.currentUser;
    setTimeout(() => { if (active) void callback(user); }, 0);
  });
  return () => { active = false; data.subscription.unsubscribe(); };
}
export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: setCurrentUser(data.user) };
}
export async function createUserWithEmailAndPassword(_auth: unknown, email: string, password: string, displayName = '') {
  const { data, error } = await requireSupabase().auth.signUp({ email, password, options: {
    data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/`
  } });
  if (error) throw error;
  if (!data.session) return { user: null, needsConfirmation: true };
  return { user: setCurrentUser(data.user) };
}
export async function updateProfile(_user: unknown, profile: { displayName: string }) {
  const { data, error } = await requireSupabase().auth.updateUser({ data: { display_name: profile.displayName } });
  if (error) throw error; setCurrentUser(data.user);
}
export async function signInWithPopup(_auth: unknown, provider: 'google') {
  const { error } = await requireSupabase().auth.signInWithOAuth({ provider, options: {
    redirectTo: `${window.location.origin}/`
  } });
  if (error) throw error;
  return { redirected: true };
}
export async function signOut(_auth?: unknown) {
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error; setCurrentUser(null);
}
export async function sendPasswordResetEmail(_auth: unknown, email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
  if (error) throw error;
}
export async function sendEmailVerification(user: Pick<User, 'email'>) {
  if (!user.email) throw new Error('Informe o e-mail da conta.');
  await resendSignupConfirmation(user.email);
}
export async function resendSignupConfirmation(email: string) {
  const { error } = await requireSupabase().auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/` } });
  if (error) throw error;
}
export const { loadUserData, saveUserData } = cloudPersistence;
