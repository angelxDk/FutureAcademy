import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';

test('discipline editing updates the existing item; timetable rejects collisions', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    setActivePinia(createPinia());
    const { useSubjectsStore } = await server.ssrLoadModule('/src/stores/useSubjectsStore.js');
    const { useTimetableStore } = await server.ssrLoadModule('/src/stores/useTimetableStore.js');
    const { useAppStore } = await server.ssrLoadModule('/src/stores/useAppStore.js');
    const subjects = useSubjectsStore(), timetable = useTimetableStore();
    assert.equal(subjects.addSubject({ name: '  ' }), false);
    assert.equal(subjects.addSubject({ name: 'Cálculo' }), true);
    const subjectId = subjects.subjects[0].id;
    assert.equal(subjects.addSubject({ name: 'Cálculo II' }, subjectId), true);
    assert.equal(subjects.subjects.length, 1);
    assert.equal(subjects.subjects[0].name, 'Cálculo II');
    const lesson = { subjectId, day: 1, start: '08:00', end: '09:00' };
    assert.equal(timetable.addTimetable(lesson), true);
    assert.equal(timetable.addTimetable({ ...lesson, start: '08:30', end: '09:30' }), false);
    assert.equal(timetable.addTimetable({ ...lesson, start: '09:00', end: '10:00' }), true);
    assert.equal(timetable.addTimetable({ ...lesson, end: '07:00' }), false);
    assert.equal(timetable.addTimetable({ ...lesson, day: 2 }, timetable.timetable[0].id), true);
    assert.equal(timetable.timetable.length, 2);
    clearTimeout(useAppStore().toastTimeout);
  } finally { await server.close(); }
});
