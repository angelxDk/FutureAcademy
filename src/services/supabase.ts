import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
}) : null;
export function requireSupabase() {
  if (!supabase) throw new Error('O serviço de contas ainda está sendo configurado. Tente novamente em breve.');
  return supabase;
}
export async function availableSocialProviders() {
  if (!url || !key) return { google: false };
  try {
    const response = await fetch(new URL('/auth/v1/settings', url), { headers: { apikey: key }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { google: false };
    const settings = await response.json();
    return { google: settings.external?.google === true };
  } catch { return { google: false }; }
}
