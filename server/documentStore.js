import { randomUUID } from 'node:crypto';

// A small repository adapter keeps the existing controllers and backup schema intact.
// The database, locking and durable writes are PostgreSQL; no Firebase SDK is used.
export function createDocumentStore(client) {
  const checked = result => { if (result.error) throw result.error; return result.data; };
  const like = value => value.replace(/[\\%_]/g, '\\$&');
  const snapshot = row => ({ exists: !!row, id: row?.path.split('/').at(-1), ref: row ? doc(row.path) : undefined, data: () => row?.data, version: row?.version ?? null });
  async function read(path) { return snapshot(checked(await client.from('app_documents').select('path,data,version').eq('path', path).maybeSingle())); }
  async function commit(reads, writes) { return checked(await client.rpc('app_commit', { p_reads: reads, p_writes: writes })); }
  async function scan(prefix) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      let request = client.from('app_documents').select('path,data,version').order('path').range(offset, offset + 499);
      if (prefix) request = request.like('path', like(prefix) + '%');
      const page = checked(await request); rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  function query(prefix, depth, group, filters = []) {
    return {
      where(field, op, value) { return query(prefix, depth, group, [...filters, [field, op, value]]); },
      async get() {
        const rows = (await scan(prefix)).filter(row => {
          const parts = row.path.split('/');
          if (group ? parts.at(-2) !== group : parts.length !== depth) return false;
          return filters.every(([field, op, value]) => {
            if (op === '==') return row.data[field] === value;
            if (op === 'array-contains') return Array.isArray(row.data[field]) && row.data[field].includes(value);
            throw new Error('Unsupported query operator');
          });
        });
        return { docs: rows.map(snapshot) };
      }
    };
  }
  function doc(path) {
    const parts = path.split('/');
    return {
      path, id: parts.at(-1), get parent() { return collection(parts.slice(0, -1).join('/')); },
      collection(name) { return collection(path + '/' + name); },
      get: () => read(path),
      async set(data, options) { await commit([], [{ path, data, merge: !!options?.merge }]); },
      async update(data) {
        await runTransaction(async tx => { const previous = await tx.get(doc(path)); if (!previous.exists) throw new Error('Document does not exist'); tx.set(doc(path), data, { merge: true }); });
      },
      async delete() { await commit([], [{ path, delete: true }]); }
    };
  }
  function collection(path) {
    const parts = path.split('/');
    return { ...query(path + '/', parts.length + 1), get parent() { return parts.length > 1 ? doc(parts.slice(0, -1).join('/')) : null; }, doc(id = randomUUID()) { return doc(path + '/' + id); } };
  }
  async function runTransaction(callback) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const reads = new Map(), writes = [];
      const result = await callback({
        async get(ref) { const s = await read(ref.path); reads.set(ref.path, s.version); return s; },
        set(ref, data, options) { writes.push({ path: ref.path, data, merge: !!options?.merge }); },
        update(ref, data) { writes.push({ path: ref.path, data, merge: true }); },
        delete(ref) { writes.push({ path: ref.path, delete: true }); }
      });
      if (await commit([...reads].map(([path, version]) => ({ path, version })), writes)) return result;
    }
    throw Object.assign(new Error('Concurrent updates; retry the operation.'), { code: 'store/conflict' });
  }
  return {
    doc, collection, collectionGroup: name => query('', 0, name), runTransaction,
    async recursiveDelete(ref) {
      // Retain the root until all descendants are gone. Deletion markers/removed group
      // membership already prevent browser reads and late personal writes.
      const rows = await scan(ref.path + '/');
      for (let i = 0; i < rows.length; i += 400) await commit([], rows.slice(i, i + 400).map(row => ({ path: row.path, delete: true })));
      await ref.delete();
    }
  };
}
