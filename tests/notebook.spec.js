import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NotebookEditor from '../src/components/NotebookEditor.vue';
import WeeklyTimetable from '../src/components/WeeklyTimetable.vue';
import { normalizeEditorHtml } from '../src/utils/text';
import { useWorkspaceStore } from '../src/stores/useWorkspaceStore';
import { timetableSlots, timetableCell, timetableIcs } from '../src/utils/timetable';

describe('notebook editor', () => {
  it('edits a rich document, supports undo and loads an existing document without emitting a new edit', async () => {
    const wrapper = mount(NotebookEditor, { props: { modelValue: '<h1>Aula de hoje</h1><p>Conteúdo salvo</p>' }, global: { stubs: { VIcon: true } } });
    await vi.waitFor(() => expect(wrapper.find('.tiptap').exists()).toBe(true));
    expect(wrapper.find('.tiptap').text()).toContain('Conteúdo salvo');
    wrapper.vm.editor.commands.insertContent('<p>Nova ideia</p>');
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toContain('Nova ideia');
    wrapper.vm.editor.commands.undo();
    expect(wrapper.vm.editor.getText()).not.toContain('Nova ideia');
    const count = wrapper.emitted('update:modelValue').length;
    await wrapper.setProps({ modelValue: '<p>Outro trabalho</p>' });
    expect(wrapper.find('.tiptap').text()).toBe('Outro trabalho');
    expect(wrapper.emitted('update:modelValue').length).toBe(count);
    wrapper.unmount();
  });
  it('removes executable pasted HTML and preserves checklists and emphasis', () => {
    const result = normalizeEditorHtml('<p onclick="alert(1)"><strong>Seguro</strong><img src=x onerror=alert(1)></p><script>alert(1)</script><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Revisar</p></li></ul>');
    expect(result).not.toMatch(/onclick|onerror|<script|<img/);
    expect(result).toContain('<strong>Seguro</strong>');
    expect(result).toContain('data-checked="true"');
  });
});

describe('binder workspace', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('supports four distinct panes, keeps hidden tabs, and does not close the last pane', () => {
    const store = useWorkspaceStore();
    store.studyPreset();
    expect(store.visible).toEqual(['records', 'assistant', 'focus-music', 'communities']);
    store.open('assistant', true);
    expect(store.visible).toHaveLength(4);
    store.hide('assistant');
    expect(store.opened).toContain('assistant');
    store.open('assistant', true);
    expect(store.visible).toHaveLength(4);
    store.solo('records'); store.hide('records');
    expect(store.visible).toEqual(['records']);
    store.restore({ opened: ['records', 'bad', 'records'], visible: ['bad'], ratio: 200 });
    expect(store.visible).toEqual(['records']); expect(store.ratio).toBe(70);
  });
});

describe('weekly notebook', () => {
  const entries = [
    { id: 'a', subjectId: 'math', day: 1, start: '07:00', end: '09:00', place: 'Sala A' },
    { id: 'b', subjectId: 'math', day: 2, start: '08:00', end: '09:00' },
    { id: 'c', subjectId: 'math', day: 0, start: '19:00', end: '20:00' }
  ];
  const subjects = [{ id: 'math', name: 'Matemática', color: '#448877' }];
  it('uses real morning/night slots and merges long lessons without repeating cells', () => {
    const slots = timetableSlots(entries);
    expect(slots).toEqual([{ start: '07:00', end: '08:00' }, { start: '08:00', end: '09:00' }, { start: '19:00', end: '20:00' }]);
    expect(timetableCell(entries, slots, 1, slots[0]).span).toBe(2);
    expect(timetableCell(entries, slots, 1, slots[1]).hidden).toBe(true);
    expect(timetableCell(entries, slots, 2, slots[0]).entry).toBeNull();
  });
  it('renders weekdays as columns and emits edit/create actions from notebook cells', async () => {
    const wrapper = mount(WeeklyTimetable, { props: { entries, subjects, weekends: true }, global: { stubs: { VIcon: true } } });
    expect(wrapper.findAll('thead th')).toHaveLength(8);
    expect(wrapper.text()).toContain('Domingo');
    expect(wrapper.findAll('.notebook-lesson')).toHaveLength(3);
    await wrapper.find('.notebook-lesson').trigger('click');
    expect(wrapper.emitted('edit')[0]).toEqual(['a']);
    await wrapper.find('.notebook-empty').trigger('click');
    expect(wrapper.emitted('create')[0][0]).toMatchObject({ start: '07:00', end: '08:00' });
    wrapper.unmount();
  });
  it('exports recurring lessons and escapes calendar separators', () => {
    const result = timetableIcs(entries, [{ id: 'math', name: 'Matemática; Álgebra, I' }], new Date(2026, 10, 5));
    expect(result).toContain('RRULE:FREQ=WEEKLY');
    expect(result).toContain('SUMMARY:Matemática\\; Álgebra\\, I');
    expect(result).toContain('DTSTART:20261108T190000');
    expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });
});
