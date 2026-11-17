import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
test('PostgreSQL enforces account isolation, atomic revisions, member reads and private server writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant execute on all functions in schema auth to anon, authenticated, service_role;`);
    for (const migration of (await fs.readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
      await db.exec(await fs.readFile(`supabase/migrations/${migration}`, 'utf8'));
    }
    async function identity(uid, metadata = {}) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: uid, app_metadata: metadata })]);
      await db.exec('set role authenticated');
    }
    const save = (uid, revision, changed = {}, removed = []) => db.query('select public.app_save_snapshot($1,$2,$3,$4,$5) as revision', [uid, revision, Date.now(), JSON.stringify(changed), JSON.stringify(removed)]);
    const load = uid => db.query('select public.app_load_snapshot($1) as snapshot', [uid]);
    await identity(alice);
    assert.equal((await save(alice, 0, { note: { kind: 'records', value: { id: 'note', content: 'private note' } } })).rows[0].revision, 1);
    await assert.rejects(save(alice, 0, { note: { kind: 'records', value: { content: 'stale overwrite' } } }), /sync\/conflict/);
    assert.equal((await load(alice)).rows[0].snapshot.entries.note.value.content, 'private note');
    await assert.rejects(db.query('select * from public.app_documents'), /permission denied/);
    await assert.rejects(db.query("select public.app_commit('[]','[]')"), /permission denied/);
    await assert.rejects(save(alice, 1, { 'bad/path': { kind: 'records', value: {} } }), /invalid-entry/);
    // A failed transaction cannot advance metadata or partially apply another entry.
    assert.equal((await load(alice)).rows[0].snapshot.metadata.revision, 1);
    const library = Object.fromEntries(Array.from({ length: 600 }, (_, index) => [`records~r${index}`, { kind: 'records', value: { id: `r${index}`, content: 'Restored note' } }]));
    assert.equal((await save(alice, 1, library)).rows[0].revision, 2);
    assert.equal(Object.keys((await load(alice)).rows[0].snapshot.entries).length, 601);
    // Limits are checked in PostgreSQL too; bypassing the browser cannot partly
    // apply a restore or advance the revision on an invalid/oversized request.
    const tooMany = Object.fromEntries(Array.from({ length: 10001 }, (_, index) => [`n${index}`, { kind: 'records', value: {} }]));
    await assert.rejects(save(alice, 2, tooMany), /snapshot\/too-large/);
    const tooLarge = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`n${index}`, { kind: 'records', value: { content: 'x'.repeat(750000) } }]));
    await assert.rejects(save(alice, 2, tooLarge), /snapshot\/too-large/);
    await assert.rejects(save(alice, 2, { 'a-valid': { kind: 'records', value: { id: 'new' } }, 'z/bad': { kind: 'records', value: {} } }), /invalid-entry/);
    assert.equal((await load(alice)).rows[0].snapshot.metadata.revision, 2);
    assert.equal((await load(alice)).rows[0].snapshot.entries['a-valid'], undefined);
    await identity(bob);
    await assert.rejects(load(alice), /auth\/required/);
    await assert.rejects(save(alice, 1), /auth\/required/);
    assert.equal((await save(bob, 0)).rows[0].revision, 1);
    await db.exec('reset role');
    await db.query(`insert into public.app_documents(path,data) values
      ('communities/g1', $1), ('communities/g1/messages/m1', $2),
      ('communities/g2', $3), ('communities/g2/messages/m2', $4)`, [
      JSON.stringify({ memberIds: [alice], ownerId: alice }), JSON.stringify({ text: 'member only', createdAt: 1 }),
      JSON.stringify({ memberIds: [bob], ownerId: bob }), JSON.stringify({ text: 'bob only', createdAt: 1 })]);
    await identity(alice);
    const groups = await db.query('select public.app_read_communities() as groups');
    assert.deepEqual(groups.rows[0].groups.map(g => g.id), ['g1']);
    await assert.rejects(db.query("select public.app_read_communities('g2')"), /forbidden/);
    assert.equal((await db.query("select public.app_read_communities('g1') as messages")).rows[0].messages[0].text, 'member only');
    // An imported user keeps the old cache/account key, controlled by server-only app_metadata.
    await identity(alice, { legacy_uid: 'firebase-alice' });
    await save('firebase-alice', 0);
    assert.equal((await load('firebase-alice')).rows[0].snapshot.metadata.revision, 1);
    await db.exec('reset role');
    await db.query("insert into public.app_documents(path,data) values ('accountDeletions/firebase-alice','{}')");
    await identity(alice, { legacy_uid: 'firebase-alice' });
    await assert.rejects(save('firebase-alice', 1), /account\/deleting/);
    await db.exec('reset role');
    await db.exec('set role anon');
    await assert.rejects(load(alice), /permission denied/);
    // CAS checks all read versions and does not apply writes after a conflict.
    await db.exec('reset role'); await db.exec('set role service_role');
    const original = (await db.query("select version from public.app_documents where path=$1", [`users/${alice}/data/state`])).rows[0].version;
    const committed = await db.query('select public.app_commit($1,$2) as ok', [JSON.stringify([{ path: `users/${alice}/data/state`, version: original }]), JSON.stringify([{ path: 'server/test', data: { value: 1 } }])]);
    assert.equal(committed.rows[0].ok, true);
    const rejected = await db.query('select public.app_commit($1,$2) as ok', [JSON.stringify([{ path: 'server/test', version: null }]), JSON.stringify([{ path: 'server/test', data: { value: 999 } }])]);
    assert.equal(rejected.rows[0].ok, false);
    assert.equal((await db.query("select data from public.app_documents where path='server/test'")).rows[0].data.value, 1);
  } finally { await db.close(); }
});
