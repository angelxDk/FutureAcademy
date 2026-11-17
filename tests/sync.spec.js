import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../src/auth', () => ({ loadUserData: vi.fn(async () => null), saveUserData: vi.fn(async () => {}) }));
import { useSyncStore } from '../src/stores/useSyncStore';
import { useSubjectsStore } from '../src/stores/useSubjectsStore';
import { useRecordsStore } from '../src/stores/useRecordsStore';
import { useAgendaStore } from '../src/stores/useAgendaStore';
import { useCommunitiesStore } from '../src/stores/useCommunitiesStore';
import { useWorkspaceStore } from '../src/stores/useWorkspaceStore';
import { saveUserData, loadUserData } from '../src/auth';
beforeEach(() => {
  vi.clearAllMocks();
  loadUserData.mockReset().mockResolvedValue(null);
  saveUserData.mockReset().mockResolvedValue(undefined);
  setActivePinia(createPinia()); localStorage.clear(); vi.useFakeTimers();
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('persists reactive community data, notebook draft and workspace immediately to the correct local account', () => {
  const sync = useSyncStore(); sync._currentUid = 'student-a'; sync._isHydrated = true;
  useCommunitiesStore().communities.push({ id: 'group', name: 'Study', messages: [{ text: 'Hello' }] });
  useRecordsStore().draft = { editId: '', form: { title: 'Minha ideia' }, html: '<p>Conteúdo</p>' };
  useWorkspaceStore().studyPreset();
  sync.persistState();
  const saved = JSON.parse(localStorage.getItem('fa_state_student-a'));
  expect(saved.recordDraft.form.title).toBe('Minha ideia');
  expect(saved.communities[0].messages[0].text).toBe('Hello');
  expect(saved.workspace.visible).toEqual(['records']);
  expect(saved.workspace.deskMode).toBe(true);
  expect(saved.workspace.deskSplit).toBe(false);
  expect(saved.workspace.layoutVersion).toBe(3);
});
it('restores a notes-only offline account and cancels pending writes when the session resets', async () => {
  loadUserData.mockRejectedValueOnce(new Error('Network unavailable'));
  localStorage.setItem('fa_state_student-a', JSON.stringify({ records: [{ id: 'note', title: 'Offline' }], recordDraft: { form: { title: 'Rascunho' }, html: '<p>R</p>' }, savedAt: 10 }));
  const sync = useSyncStore(); await sync.loadStateFromCloud('student-a');
  expect(useRecordsStore().records[0].title).toBe('Offline');
  expect(useRecordsStore().draft.form.title).toBe('Rascunho');
  sync.persistState(); sync.resetToDefault();
  await vi.advanceTimersByTimeAsync(2000);
  expect(saveUserData).not.toHaveBeenCalled();
  expect(useRecordsStore().records).toHaveLength(0);
});
it('moves a legacy local copy to an empty new database without losing its notes', async () => {
  localStorage.setItem('fa_state_legacy-id', JSON.stringify({ remoteRevision: 12, records: [{ id: 'r', title: 'Before migration' }], savedAt: 10 }));
  loadUserData.mockResolvedValueOnce(null); saveUserData.mockResolvedValueOnce(1);
  const sync = useSyncStore(); await sync.loadStateFromCloud('legacy-id'); await sync.flushPersist();
  expect(saveUserData).toHaveBeenCalledWith('legacy-id', expect.objectContaining({ remoteRevision: 0, records: [expect.objectContaining({ title: 'Before migration' })] }));
  expect(sync.remoteRevision).toBe(1);
  expect(JSON.parse(localStorage.getItem('fa_state_legacy-id')).records[0].title).toBe('Before migration');
});
it('does not reset a cached revision when the new service is unreachable', async () => {
  localStorage.setItem('fa_state_legacy-id', JSON.stringify({ remoteRevision: 12, records: [{ id: 'r', title: 'Keep me' }] }));
  loadUserData.mockRejectedValueOnce(new Error('Network unavailable'));
  const sync = useSyncStore(); await sync.loadStateFromCloud('legacy-id');
  expect(sync.remoteRevision).toBe(12); expect(saveUserData).not.toHaveBeenCalled();
});
it('removing a discipline preserves student-authored notes and events', () => {
  const subjects = useSubjectsStore(), records = useRecordsStore(), agenda = useAgendaStore();
  subjects.subjects = [{ id: 'math', name: 'Math' }];
  records.records = [{ id: 'work', subjectId: 'math', content: 'Minha pesquisa' }];
  agenda.events = [{ id: 'event', subjectId: 'math', title: 'Entrega' }];
  useSyncStore().removeSubject('math');
  expect(subjects.subjects).toHaveLength(0);
  expect(records.records[0]).toMatchObject({ content: 'Minha pesquisa', subjectId: '' });
  expect(agenda.events[0].title).toBe('Entrega');
});
it('preserves local changes and reports a revision conflict instead of silently marking them saved', async () => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  useRecordsStore().records = [{ id: 'r', title: 'Local version' }];
  saveUserData.mockRejectedValueOnce(Object.assign(new Error('Remote changes'), { code: 'sync/conflict' }));
  sync.persistState(); await sync.flushPersist();
  expect(sync.status).toBe('conflict'); expect(sync.pending).toBe(true);
  expect(JSON.parse(localStorage.getItem('fa_state_alice')).records[0].title).toBe('Local version');
});
it('retries after a transient save failure without discarding notes', async () => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  saveUserData.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce(2);
  sync.persistState(); await sync.flushPersist(); expect(sync.status).toBe('error');
  await sync.flushPersist(); expect(sync.status).toBe('synced'); expect(sync.remoteRevision).toBe(2);
  expect(JSON.parse(localStorage.getItem('fa_state_alice')).syncPending).toBe(false);
});
it('serializes edits during an in-flight save against the returned revision', async () => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  let complete; saveUserData.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; })).mockResolvedValueOnce(2);
  sync.persistState(); const first = sync.flushPersist();
  useRecordsStore().records = [{ id: 'r', title: 'Typed while saving' }]; sync.persistState();
  const second = sync.flushPersist(); complete(1); await first; await second;
  expect(sync.remoteRevision).toBe(2); expect(sync.pending).toBe(false);
});
it('captures form changes locally before a hard navigation can cancel a UI timer', async () => {
  const { useDebouncedPersist } = await import('../src/composables/useDebouncedPersist');
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  useSubjectsStore().subjects = [{ id: 'math', name: 'Matemática' }];
  useDebouncedPersist(500)();
  expect(JSON.parse(localStorage.getItem('fa_state_alice')).subjects[0].name).toBe('Matemática');
  expect(sync.status).toBe('pending');
});

it('prefers a newer server revision even when device clocks disagree', async () => {
  localStorage.setItem('fa_state_alice', JSON.stringify({ remoteRevision: 1, savedAt: 999999, records: [{ id: 'r', title: 'Old cached version' }] }));
  loadUserData.mockResolvedValueOnce({ remoteRevision: 2, savedAt: 1, records: [{ id: 'r', title: 'New remote version' }] });
  const sync = useSyncStore(); await sync.loadStateFromCloud('alice');
  expect(sync.remoteRevision).toBe(2); expect(useRecordsStore().records[0].title).toBe('New remote version');
});

it('clears the previous account before loading an uncached account with an older revision', async () => {
  const sync = useSyncStore();
  loadUserData.mockResolvedValueOnce({ remoteRevision: 10, records: [{ id: 'a', title: 'Alice only' }] });
  await sync.loadStateFromCloud('alice');
  loadUserData.mockResolvedValueOnce({ remoteRevision: 1, records: [{ id: 'b', title: 'Bob only' }] });
  await sync.loadStateFromCloud('bob');
  expect(sync.remoteRevision).toBe(1);
  expect(useRecordsStore().records).toEqual([{ id: 'b', title: 'Bob only' }]);
  sync.persistState(); await sync.flushPersist();
  expect(saveUserData).toHaveBeenLastCalledWith('bob', expect.objectContaining({ records: [{ id: 'b', title: 'Bob only' }] }));
});

it.each(['success', 'failure'])('ignores an older hydration %s for the same account', async outcome => {
  let resolveOld, rejectOld;
  loadUserData.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }));
  const sync = useSyncStore(), oldLoad = sync.loadStateFromCloud('alice');
  loadUserData.mockResolvedValueOnce({ remoteRevision: 4, savedAt: 20, records: [{ id: 'new', title: 'Latest load' }] });
  await sync.loadStateFromCloud('alice');
  if (outcome === 'success') resolveOld({ remoteRevision: 9, savedAt: 30, records: [{ id: 'old', title: 'Superseded load' }] });
  else rejectOld(new Error('Superseded failure'));
  await oldLoad;
  expect(sync.remoteRevision).toBe(4);
  expect(sync.status).toBe('synced'); expect(sync.error).toBe('');
  expect(useRecordsStore().records[0].title).toBe('Latest load');
});

it.each(['alice', 'bob'])('keeps the new session save queue independent from an old request when entering %s', async nextUid => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  let completeOld, completeNew;
  saveUserData.mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { completeNew = resolve; }))
    .mockResolvedValueOnce(3);
  useRecordsStore().records = [{ id: 'old', title: 'Old session' }];
  sync.persistState(); const oldSave = sync.flushPersist();
  sync.resetToDefault();
  localStorage.setItem(`fa_state_${nextUid}`, JSON.stringify({ remoteRevision: 1, records: [], syncPending: false }));
  loadUserData.mockResolvedValueOnce({ remoteRevision: 1, records: [] });
  await sync.loadStateFromCloud(nextUid);
  useRecordsStore().records = [{ id: 'new', title: 'New session' }];
  sync.persistState(); const newSave = sync.flushPersist();
  const activeRequest = sync._saving;
  expect(saveUserData).toHaveBeenCalledTimes(2);
  completeOld(99); await oldSave;
  expect(sync._saving).toBe(activeRequest);
  expect(sync.remoteRevision).toBe(1);
  expect(sync.status).toBe('saving');
  useRecordsStore().records[0].title = 'Typed during the new save';
  sync.persistState();
  completeNew(2); await newSave;
  expect(saveUserData).toHaveBeenCalledTimes(3);
  expect(saveUserData).toHaveBeenLastCalledWith(nextUid, expect.objectContaining({ remoteRevision: 2, records: [{ id: 'new', title: 'Typed during the new save' }] }));
  expect(sync.remoteRevision).toBe(3); expect(sync.pending).toBe(false);
  expect(JSON.parse(localStorage.getItem(`fa_state_${nextUid}`)).records[0].title).toBe('Typed during the new save');
});

it('keeps the latest explicit cloud reload when earlier reloads complete later', async () => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true;
  let completeOld;
  loadUserData.mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve; }));
  const oldLoad = sync.loadCloudVersion();
  loadUserData.mockResolvedValueOnce({ remoteRevision: 3, records: [{ id: 'new', title: 'Latest cloud version' }] });
  await sync.loadCloudVersion();
  completeOld({ remoteRevision: 2, records: [{ id: 'old', title: 'Old cloud version' }] });
  await oldLoad;
  expect(sync.remoteRevision).toBe(3);
  expect(useRecordsStore().records[0].title).toBe('Latest cloud version');
});

it('validates an entire snapshot before touching the current stores', () => {
  useRecordsStore().records = [{ id: 'keep', title: 'My original note' }];
  expect(() => useSyncStore().hydrateStores({ records: [{ id: 'new' }], workspace: { opened: 'broken' } })).toThrow('inválido');
  expect(useRecordsStore().records[0].title).toBe('My original note');
});

it('preserves edits made while an explicit cloud replacement is loading', async () => {
  const sync = useSyncStore(); sync._currentUid = 'alice'; sync._isHydrated = true; sync.status = 'conflict';
  let finish;
  loadUserData.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const loading = sync.loadCloudVersion();
  useRecordsStore().records = [{ id: 'local', title: 'Typed after requesting the cloud' }];
  sync.persistState();
  finish({ remoteRevision: 7, records: [{ id: 'remote', title: 'Cloud copy' }] });
  await loading;
  expect(useRecordsStore().records[0].title).toBe('Typed after requesting the cloud');
  expect(sync.pending).toBe(true); expect(sync.status).toBe('conflict');
  expect(JSON.parse(localStorage.getItem('fa_state_alice')).records[0].id).toBe('local');
});
