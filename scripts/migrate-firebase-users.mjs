// Imports only the private account export. Never sends email and never deletes Firebase users.
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../server/supabase.js';
const source = process.argv[2] || path.join(os.homedir(), '.local/share/future-academy-migration/firebase-users.json');
const { users } = JSON.parse(fs.readFileSync(source, 'utf8'));
const client = supabaseAdmin();
const existing = [];
for (let page = 1; ; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  existing.push(...data.users);
  if (data.users.length < 1000) break;
}
let created = 0, skipped = 0;
for (const user of users) {
  if (!user.email || !/^[\w-]{1,128}$/.test(user.uid)) throw new Error('Unsupported legacy identity; review export privately.');
  const deletion = await client.from('app_documents').select('path').eq('path', `accountDeletions/${user.uid}`).maybeSingle();
  if (deletion.error) throw deletion.error;
  if (deletion.data) { skipped++; continue; } // Never resurrect an account the owner deleted.
  const found = existing.find(item => item.email?.toLowerCase() === user.email.toLowerCase());
  if (found) {
    if (found.app_metadata?.legacy_uid !== user.uid) throw new Error('Existing Supabase account has no matching legacy identity. Resolve privately before continuing.');
    skipped++; continue;
  }
  // Firebase SCRYPT hashes are not portable to Supabase Auth. A fresh, unknown
  // password requires the owner to use recovery; no password is printed or retained.
  const { data, error } = await client.auth.admin.createUser({
    email: user.email, email_confirm: !!user.emailVerified,
    password: randomBytes(48).toString('base64url'),
    ban_duration: user.disabled ? '876000h' : 'none',
    app_metadata: { legacy_uid: user.uid, migrated_from: 'firebase' },
    user_metadata: { display_name: user.displayName || '', avatar_url: user.photoURL || '' }
  });
  if (error) throw error;
  existing.push(data.user); created++;
}
console.log(`Account import finished: ${created} created, ${skipped} already migrated. No emails sent. Firebase preserved.`);
