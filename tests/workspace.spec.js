import { it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
const mounts = vi.hoisted(() => ({ notes: 0, ai: 0 }));
vi.mock('../src/stores/useSyncStore', () => ({ useSyncStore: () => ({ persistState: vi.fn() }) }));
vi.mock('../src/sections/RecordsSection.vue', () => ({ __esModule: true, default: { template: '<textarea v-model="draft" aria-label="Anotação" />', data: () => ({ draft: '' }), mounted() { mounts.notes++; } } }));
vi.mock('../src/sections/AssistantSection.vue', () => ({ __esModule: true, default: { template: '<textarea v-model="question" aria-label="Pergunta" />', data: () => ({ question: '' }), mounted() { mounts.ai++; } } }));
vi.mock('../src/sections/FocusMusicSection.vue', () => ({ __esModule: true, default: { template: '<p>Música persistente</p>' } }));
vi.mock('../src/sections/CommunitiesSection.vue', () => ({ __esModule: true, default: { template: '<p>Comunidade persistente</p>' } }));
import StudyWorkspace from '../src/components/StudyWorkspace.vue';
import { useWorkspaceStore } from '../src/stores/useWorkspaceStore';
import { normalizeWorkspace } from '../src/utils/workspace';
it('preserves the exact module instances and typed content when switching study desk support tools', async () => {
  const pinia = createPinia();
  const router = createRouter({ history: createMemoryHistory(), routes: ['records', 'assistant', 'focus-music', 'communities'].map(name => ({ name, path: `/${name}`, component: { template: '<div />' } })) });
  await router.push('/records'); await router.isReady();
  const workspace = useWorkspaceStore(pinia); workspace.studyPreset(); workspace.setDeskSplit(true);
  const wrapper = mount(StudyWorkspace, { global: { plugins: [pinia, router], stubs: { VIcon: true, VList: true, VListItem: true, VBtn: { template: '<button><slot /></button>' }, VMenu: true } } });
  await flushPromises();
  const note = wrapper.find('textarea[aria-label="Anotação"]');
  const question = wrapper.find('textarea[aria-label="Pergunta"]');
  await note.setValue('Minha anotação não pode desaparecer.');
  await question.setValue('Explique este conceito.');
  const originalElement = note.element;
  workspace.maximized = 'assistant'; await flushPromises();
  expect(note.element.closest('article').classList.contains('binder-panel--hidden')).toBe(true);
  expect(note.element.closest('article').getAttribute('aria-hidden')).toBe('true');
  expect(question.element.closest('article').classList.contains('binder-panel--hidden')).toBe(false);
  workspace.maximized = ''; await flushPromises();
  workspace.open('records', true); await flushPromises();
  expect(note.element.closest('article').classList.contains('binder-panel--hidden')).toBe(false);
  expect(wrapper.find('textarea[aria-label="Anotação"]').element).toBe(originalElement);
  expect(note.element.value).toBe('Minha anotação não pode desaparecer.');
  expect(question.element.value).toBe('Explique este conceito.');
  expect(mounts.notes).toBe(1); expect(mounts.ai).toBe(1);
  workspace.setSupportTool('focus-music'); await flushPromises();
  expect(workspace.visible).toEqual(['records', 'focus-music']);
  expect(question.element.closest('article').classList.contains('binder-panel--hidden')).toBe(true);
  workspace.setSupportTool('assistant'); await flushPromises();
  expect(wrapper.find('textarea[aria-label="Anotação"]').element).toBe(originalElement);
  expect(question.element.value).toBe('Explique este conceito.');
  expect(mounts.notes).toBe(1); expect(mounts.ai).toBe(1);
  expect(workspace.visible).toEqual(['records', 'assistant']);
  wrapper.unmount();
});

it('opens a two-panel desk and restores the previous layout without discarding visited tools', () => {
  const workspace = useWorkspaceStore(createPinia());
  workspace.open('agenda'); workspace.open('timetable', true);
  workspace.ratio = 43; workspace.compactSidebar = false;
  const before = workspace.snapshot();
  workspace.focusMode = true; workspace.maximized = 'agenda';
  workspace.studyPreset();
  expect(workspace.deskMode).toBe(true); expect(workspace.compactSidebar).toBe(true);
  expect(workspace.visible).toEqual(['records']); expect(workspace.ratio).toBe(70);
  expect(workspace.focusMode).toBe(false); expect(workspace.maximized).toBe('');
  expect(workspace.opened).toEqual(expect.arrayContaining(['records', 'assistant', 'pomodoro', 'focus-music', 'communities']));
  workspace.open('subjects', true);
  expect(workspace.visible).toEqual(['subjects']);
  workspace.studyPreset();
  workspace.exitStudyDesk();
  expect(workspace.deskMode).toBe(false);
  expect(workspace.visible).toEqual(before.visible); expect(workspace.active).toBe(before.active);
  expect(workspace.ratio).toBe(43); expect(workspace.compactSidebar).toBe(false);
  expect(workspace.opened).toEqual(expect.arrayContaining([...before.opened, 'records', 'assistant', 'subjects']));
});

it('keeps records on the left and never adds a third desk pane, even with open beside', () => {
  const workspace = useWorkspaceStore(createPinia()); workspace.studyPreset(); workspace.setDeskSplit(true);
  for (const id of ['pomodoro', 'focus-music', 'communities', 'agenda']) {
    workspace.open(id, true);
    expect(workspace.visible).toEqual(['records', id]);
  }
  workspace.open('records');
  expect(workspace.visible).toEqual(['records', 'agenda']); expect(workspace.active).toBe('records');
  workspace.setSupportTool('missing-tool'); workspace.setSupportTool('records');
  expect(workspace.visible).toEqual(['records', 'agenda']);
});

it('persists desk mode but uses a safe standalone notebook when exiting after reload', () => {
  const original = useWorkspaceStore(createPinia()); original.open('agenda'); original.studyPreset();
  original.setSupportTool('pomodoro');
  const snapshot = original.snapshot();
  expect(snapshot.deskMode).toBe(true); expect(snapshot).not.toHaveProperty('_beforeDesk');
  const restored = useWorkspaceStore(createPinia()); restored.restore(snapshot);
  expect(restored.deskMode).toBe(true); expect(restored.visible).toEqual(['pomodoro']);
  restored.exitStudyDesk();
  expect(restored.visible).toEqual(['records']); expect(restored.active).toBe('records');
  expect(restored.compactSidebar).toBe(false); expect(restored.deskMode).toBe(false);
  expect(restored.opened).toEqual(expect.arrayContaining(snapshot.opened));
});

it('normalizes a persisted desk into two valid panes while ordinary layouts retain four-pane support', () => {
  const desk = normalizeWorkspace({ deskMode: true, opened: ['assistant', 'records', 'communities', 'pomodoro'], visible: ['assistant', 'records', 'communities', 'pomodoro'], active: 'communities' });
  expect(desk.visible).toEqual(['communities']); expect(desk.active).toBe('communities'); expect(desk.deskMode).toBe(true); expect(desk.deskSplit).toBe(false);
  expect(desk.ratio).toBe(70);
  const workspace = useWorkspaceStore(createPinia());
  workspace.open('records'); workspace.open('assistant', true); workspace.open('communities', true); workspace.open('pomodoro', true);
  expect(workspace.visible).toHaveLength(2); expect(workspace.deskMode).toBe(false);
});
