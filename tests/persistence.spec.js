import { it, expect } from 'vitest';
import { encodeSnapshot, decodeSnapshot } from '../src/utils/persistence';
import { validateBackup } from '../src/utils/backup';
const data = () => ({ subjects: [], timetable: [], events: [], records: [{ id: 'a/b', title: 'Note', content: 'text' }], studySessions: [], communities: [], recordDrafts: { 'a/b': { html: 'draft' } }, profile: { name: 'Student' }, remoteRevision: 3 });
it('stores individual notes and drafts with reversible safe document keys', () => {
  const snapshot = data(); const entries = encodeSnapshot(snapshot);
  expect(entries['records~a%2Fb'].value.content).toBe('text');
  const decoded = decodeSnapshot(Object.values(entries), { revision: 4, savedAt: 12 });
  expect(decoded.records).toEqual(snapshot.records); expect(decoded.recordDrafts).toEqual(snapshot.recordDrafts); expect(decoded.remoteRevision).toBe(4);
});
it('rejects oversized notes and malicious or duplicate backup data before hydration', () => {
  const huge = data(); huge.records[0].content = 'a'.repeat(800001); expect(() => encodeSnapshot(huge)).toThrow('limite');
  const wrap = data => ({ format: 'future-academy-backup', version: 1, data });
  expect(validateBackup(wrap(data())).profile.name).toBe('Student');
  const duplicate = data(); duplicate.records.push(duplicate.records[0]); expect(() => validateBackup(wrap(duplicate))).toThrow('duplicados');
  const malicious = data(); malicious.profile = JSON.parse('{"__proto__":{"polluted":true}}'); expect(() => validateBackup(wrap(malicious))).toThrow('inválido');
});

it('rejects malformed nested structures and preserves valid partial legacy snapshots', () => {
  const wrap = data => ({ format: 'future-academy-backup', version: 1, data });
  const malformed = data(); malformed.records[0].title = { html: 'invalid' };
  expect(() => validateBackup(wrap(malformed))).toThrow('inválido');
  for (const workspace of [{ opened: 'records' }, { visible: [null] }]) {
    expect(() => validateBackup(wrap({ ...data(), workspace }))).toThrow('inválido');
  }
  expect(() => encodeSnapshot({ records: [{ id: 'a' }, { id: 'a' }] })).toThrow('duplicados');
  expect(() => decodeSnapshot([{ kind: 'setting', key: 'records', value: 'not an array' }], { revision: 1, savedAt: 10 })).toThrow('inválido');
  expect(() => decodeSnapshot([{ kind: 'recordDrafts', key: '__proto__', value: { polluted: true } }], { revision: 1, savedAt: 10 })).toThrow('inválido');
  expect(encodeSnapshot({ records: [{ id: 'legacy', content: 'Preserved' }] })['records~legacy'].value.content).toBe('Preserved');
});
