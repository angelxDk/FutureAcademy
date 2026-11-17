import { encodeSnapshot, decodeSnapshot, syncConflict } from '../utils/persistence';
import { isObject, validateSnapshot } from '../utils/snapshotValidation';
import { MAX_SYNC_BYTES, MAX_SYNC_CHANGES } from '../types/academic';
import type { AcademicSnapshot, JsonValue, SnapshotEntries, SnapshotMetadata } from '../types/academic';

interface RpcResult { data: unknown; error: { message: string } | null }
export interface PersistenceClient {
  rpc(name: string, params: Record<string, JsonValue>): { abortSignal(signal: AbortSignal): PromiseLike<RpcResult> };
}
interface Baseline { entries: SnapshotEntries; revision: number }

export function createCloudPersistence(getClient: () => PersistenceClient | null) {
  const baselines = new Map<string, Baseline>();
  const loads = new Map<string, number>();
  const sessions = new Map<string, number>();
  function clearUserData(uid: string) {
    baselines.delete(uid);
    loads.set(uid, (loads.get(uid) || 0) + 1);
    sessions.set(uid, (sessions.get(uid) || 0) + 1);
  }
  function clientFor(uid: string): PersistenceClient {
    const client = getClient();
    if (!client) throw new Error('Sincronização indisponível. Sua cópia permanece neste dispositivo.');
    if (!uid) throw new Error('Entre na sua conta para sincronizar.');
    return client;
  }
  async function rpc(client: PersistenceClient, name: string, params: Record<string, JsonValue>): Promise<unknown> {
    const { data, error } = await client.rpc(name, params).abortSignal(AbortSignal.timeout(8000));
    if (error) {
      if (error.message.includes('sync/conflict')) throw syncConflict();
      throw new Error(error.message.includes('account/deleting') ? 'Exclusão de conta em andamento.' : 'Não foi possível sincronizar. Sua cópia local foi preservada.');
    }
    return data;
  }
  async function loadUserData(uid: string): Promise<AcademicSnapshot | null> {
    const generation = (loads.get(uid) || 0) + 1;
    loads.set(uid, generation);
    const data = await rpc(clientFor(uid), 'app_load_snapshot', { p_uid: uid });
    if (data === null) {
      if (loads.get(uid) === generation && !baselines.get(uid)?.revision) baselines.set(uid, { entries: {}, revision: 0 });
      return null;
    }
    if (!isObject(data) || !isObject(data.metadata)) throw new Error('Acervo remoto inválido. Sua cópia local foi preservada.');
    if (data.metadata.schemaVersion !== 2) return { ...validateSnapshot(data.metadata), remoteRevision: 0 };
    if (!isObject(data.entries) || !Number.isSafeInteger(data.metadata.revision) || Number(data.metadata.revision) < 0 || !Number.isSafeInteger(data.metadata.savedAt) || Number(data.metadata.savedAt) < 0) throw new Error('Acervo remoto inválido. Sua cópia local foi preservada.');
    const metadata = data.metadata as unknown as SnapshotMetadata;
    const snapshot = decodeSnapshot(Object.values(data.entries), metadata);
    if (loads.get(uid) === generation && metadata.revision >= (baselines.get(uid)?.revision || 0)) {
      // Re-encode validated entries instead of trusting remote object keys.
      baselines.set(uid, { entries: encodeSnapshot(snapshot), revision: metadata.revision });
    }
    return snapshot;
  }
  async function saveUserData(uid: string, data: AcademicSnapshot): Promise<number> {
    const client = clientFor(uid);
    const session = sessions.get(uid) || 0;
    // Detach the baseline from reactive objects that can change during an RPC.
    const entries: SnapshotEntries = JSON.parse(JSON.stringify(encodeSnapshot(data)));
    const revision = data.remoteRevision || 0;
    // An offline startup may only have a local revision. Read the baseline before
    // retrying so deletions are computed safely and unchanged notes are preserved.
    if (!baselines.has(uid) && revision > 0) await loadUserData(uid);
    const baseline = baselines.get(uid) || { entries: {}, revision: 0 };
    if (baseline.revision !== revision) throw syncConflict();
    const changed = Object.fromEntries(Object.keys(entries).filter(key => JSON.stringify(entries[key]) !== JSON.stringify(baseline.entries[key])).map(key => [key, entries[key]]));
    const removed = Object.keys(baseline.entries).filter(key => !(key in entries));
    if (Object.keys(changed).length + removed.length > MAX_SYNC_CHANGES || new TextEncoder().encode(JSON.stringify(changed)).length + new TextEncoder().encode(JSON.stringify(removed)).length > MAX_SYNC_BYTES) throw new Error('O acervo excede o limite de sincronização (10 mil alterações ou 20 MB). Exporte uma cópia antes de reduzir o conteúdo.');
    const next = await rpc(client, 'app_save_snapshot', { p_uid: uid, p_revision: revision, p_saved_at: data.savedAt ?? Date.now(), p_changed: changed, p_removed: removed });
    if (typeof next !== 'number' || !Number.isSafeInteger(next) || next !== revision + 1) throw new Error('Resposta de sincronização inválida. Sua cópia local foi preservada.');
    if ((sessions.get(uid) || 0) === session && next >= (baselines.get(uid)?.revision || 0)) baselines.set(uid, { entries, revision: next });
    return next;
  }
  return { loadUserData, saveUserData, clearUserData };
}
