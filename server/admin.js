import { supabaseAdmin } from './supabase.js';
import { createDocumentStore } from './documentStore.js';
let services;
export function adminServices() {
  if (!services) {
    const client = supabaseAdmin();
    services = {
      db: createDocumentStore(client),
      auth: {
        async verifyIdToken(token) {
          // getUser validates this exact JWT against the Auth server and rejects
          // deleted/banned users. Never trust a locally decoded token on its own.
          const { data, error } = await client.auth.getUser(token);
          if (error || !data.user) throw error || new Error('auth/invalid');
          const user = data.user;
          const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
          return {
            uid: user.app_metadata?.legacy_uid || user.id, sub: user.id,
            email: user.email, email_verified: !!user.email_confirmed_at,
            name: user.user_metadata?.display_name || user.user_metadata?.full_name || 'Estudante',
            auth_time: Math.max(0, ...(claims.amr || []).map(entry => Number(entry.timestamp) || 0))
          };
        },
        async deleteUser(uid, authId = uid) {
          const { error } = await client.auth.admin.deleteUser(authId);
          if (error) throw error;
        }
      }
    };
  }
  return services;
}
