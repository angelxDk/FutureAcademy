import { collectionKeys, settingKeys, MAX_ENTRY_BYTES } from '../types/academic';
import type { AcademicItem, AcademicSnapshot, CollectionKey, JsonObject, SettingKey, SnapshotEntries, SnapshotEntry, SnapshotMetadata } from '../types/academic';
import { assertSafeJson, isObject, validateSnapshot } from './snapshotValidation';

const lists: ReadonlySet<string> = new Set(collectionKeys);
const settings: ReadonlySet<string> = new Set(settingKeys);

export function encodeSnapshot(input: unknown): SnapshotEntries {
  const snapshot = validateSnapshot(input);
  const entries: SnapshotEntries = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (lists.has(key) && Array.isArray(value)) {
      for (const item of value as AcademicItem[]) entries[`${key}~${encodeURIComponent(item.id)}`] = { kind: key as CollectionKey, value: item };
    } else if (key === 'recordDrafts' && isObject(value)) {
      for (const [id, draft] of Object.entries(value)) entries[`recordDrafts~${encodeURIComponent(id)}`] = { kind: key, key: id, value: draft as JsonObject };
    } else if (settings.has(key)) entries[key] = { kind: 'setting', key: key as SettingKey, value: value ?? null };
  }
  for (const [key, entry] of Object.entries(entries)) {
    if (key.length > 1400 || new TextEncoder().encode(JSON.stringify(entry)).length > MAX_ENTRY_BYTES) throw new Error('Um documento excede o limite de sincronização. Exporte uma cópia antes de reduzir o conteúdo.');
  }
  return entries;
}

export function decodeSnapshot(entries: unknown, metadata: SnapshotMetadata): AcademicSnapshot {
  assertSafeJson(entries);
  if (!Array.isArray(entries)) throw new Error('Acervo remoto inválido. Sua cópia local foi preservada.');
  const snapshot: JsonObject = Object.fromEntries(collectionKeys.map(key => [key, []]));
  const drafts: JsonObject = {};
  snapshot.recordDrafts = drafts;
  const seen = new Set<string>();
  for (const raw of entries) {
    if (!isObject(raw)) throw new Error('Documento remoto inválido.');
    // The discriminant is checked at runtime: RPC data is untrusted JSON.
    const entry = raw as unknown as SnapshotEntry;
    let identity: string;
    if (entry.kind === 'setting' && settings.has(entry.key)) {
      identity = entry.key;
      snapshot[entry.key] = entry.value;
    } else if (entry.kind === 'recordDrafts' && typeof entry.key === 'string') {
      identity = `recordDrafts~${entry.key}`;
      drafts[entry.key] = entry.value;
    } else if (lists.has(entry.kind) && 'value' in entry && isObject(entry.value)) {
      identity = `${entry.kind}~${entry.value.id}`;
      (snapshot[entry.kind] as JsonObject[]).push(entry.value);
    } else throw new Error('Documento remoto inválido.');
    if (seen.has(identity)) throw new Error('O conteúdo contém identificadores duplicados.');
    seen.add(identity);
  }
  return validateSnapshot({ ...snapshot, savedAt: metadata.savedAt, remoteRevision: metadata.revision, syncPending: false });
}

export function syncConflict(): Error & { code: 'sync/conflict' } {
  return Object.assign(new Error('Há alterações de outro dispositivo. Exporte sua cópia local antes de carregar a versão da nuvem.'), { code: 'sync/conflict' as const });
}
