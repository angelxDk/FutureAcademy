import { auth } from '../auth';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Tokens may only be sent to this app's API, even if a caller supplies a URL.
  const target = new URL(path, window.location.origin);
  if (target.origin !== window.location.origin || !target.pathname.startsWith('/api/')) throw new Error('Endereço de API inválido.');
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para continuar.');
  const token = await user.getIdToken();
  if (!auth.currentUser || auth.currentUser.uid !== user.uid || auth.currentUser.id !== user.id) throw new Error('Sua conta mudou. Tente novamente.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, { ...options, headers, cache: 'no-store', redirect: 'error', signal: options.signal || AbortSignal.timeout(45000) });
}
