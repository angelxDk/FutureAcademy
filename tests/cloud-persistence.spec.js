import { beforeEach, expect, it, vi } from 'vitest';
import { createCloudPersistence } from '../src/services/cloudPersistence';
import { encodeSnapshot } from '../src/utils/persistence';

let request, persistence;
const snapshot = (records = [], remoteRevision = 0) => ({ records, savedAt: 10, remoteRevision });
const remote = (records, revision) => ({ metadata: { schemaVersion: 2, revision, savedAt: 10 }, entries: encodeSnapshot(snapshot(records, revision)) });
beforeEach(() => {
  request = vi.fn();
  persistence = createCloudPersistence(() => ({ rpc: (name, params) => ({ abortSignal: signal => request(name, params, signal) }) }));
});

it('restores over 450 notes atomically and only sends later changes and removals', async () => {
  request.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: 1, error: null }).mockResolvedValueOnce({ data: 2, error: null });
  await persistence.loadUserData('alice');
  const notes = Array.from({ length: 600 }, (_, i) => ({ id: `n${i}`, content: 'My note' }));
  expect(await persistence.saveUserData('alice', snapshot(notes))).toBe(1);
  expect(Object.keys(request.mock.calls[1][1].p_changed)).toHaveLength(600);
  notes[0].content = 'Edited';
  await persistence.saveUserData('alice', snapshot(notes.slice(0, -1), 1));
  expect(Object.keys(request.mock.calls[2][1].p_changed)).toEqual(['records~n0']);
  expect(request.mock.calls[2][1].p_removed).toEqual(['records~n599']);
});

it('keeps the current baseline when an earlier load completes after a newer one', async () => {
  let finishOld;
  request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({ data: remote([{ id: 'new', title: 'New' }], 2), error: null })
    .mockResolvedValueOnce({ data: 3, error: null });
  const old = persistence.loadUserData('alice');
  await persistence.loadUserData('alice');
  finishOld({ data: remote([{ id: 'old', title: 'Old' }], 1), error: null });
  await old;
  await persistence.saveUserData('alice', snapshot([], 2));
  expect(request.mock.calls[2][1].p_removed).toEqual(['records~new']);
});

it('preserves the baseline after an RPC conflict and retries against the same revision', async () => {
  request.mockResolvedValueOnce({ data: remote([{ id: 'keep', title: 'Original' }], 4), error: null })
    .mockResolvedValueOnce({ data: null, error: { message: 'sync/conflict' } })
    .mockResolvedValueOnce({ data: 5, error: null });
  await persistence.loadUserData('alice');
  await expect(persistence.saveUserData('alice', snapshot([], 4))).rejects.toMatchObject({ code: 'sync/conflict' });
  await persistence.saveUserData('alice', snapshot([], 4));
  expect(request.mock.calls[2][1]).toMatchObject({ p_revision: 4, p_removed: ['records~keep'] });
});

it('loads the remote baseline before retrying a cached offline revision', async () => {
  request.mockResolvedValueOnce({ data: remote([{ id: 'removed', title: 'Old note' }], 7), error: null })
    .mockResolvedValueOnce({ data: 8, error: null });
  await persistence.saveUserData('alice', snapshot([], 7));
  expect(request.mock.calls[1][1]).toMatchObject({ p_revision: 7, p_removed: ['records~removed'] });
});

it('rejects malformed remote data and oversized writes before changing the baseline', async () => {
  request.mockResolvedValueOnce({ data: { metadata: { schemaVersion: 2, revision: 1, savedAt: 10 }, entries: { bad: { kind: 'setting', key: 'records', value: 'not a list' } } }, error: null });
  await expect(persistence.loadUserData('alice')).rejects.toThrow('inválido');
  const notes = Array.from({ length: 10001 }, (_, i) => ({ id: `n${i}` }));
  await expect(persistence.saveUserData('alice', snapshot(notes))).rejects.toThrow('limite');
  expect(request).toHaveBeenCalledTimes(1);
});

it('releases the account baseline on logout even if an old read finishes later', async () => {
  let finishOld;
  const original = remote([{ id: 'private', content: 'Old session note' }], 4);
  request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({ data: original, error: null })
    .mockResolvedValueOnce({ data: 5, error: null });
  const oldLoad = persistence.loadUserData('alice');
  persistence.clearUserData('alice');
  finishOld({ data: original, error: null });
  await oldLoad;
  await persistence.saveUserData('alice', snapshot([], 4));
  expect(request.mock.calls.map(call => call[0])).toEqual(['app_load_snapshot', 'app_load_snapshot', 'app_save_snapshot']);
});
