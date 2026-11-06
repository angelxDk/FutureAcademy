import test from 'node:test';
import assert from 'node:assert/strict';
import { academicTimeline, deadlineState, dayKey } from '../src/utils/academic.js';

test('date-only deadlines stay open throughout their local due day', () => {
  assert.equal(dayKey(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(deadlineState({ dueDate: '2026-11-05' }, '2026-11-05'), 'today');
  assert.equal(deadlineState({ dueDate: '2026-11-04' }, '2026-11-05'), 'overdue');
  assert.equal(deadlineState({ dueDate: '2026-11-04', status: 'concluido' }, '2026-11-05'), 'done');
  assert.equal(deadlineState({}, '2026-11-05'), 'unscheduled');
});
test('timeline merges events and unfinished deadlines without mutating or duplicating data', () => {
  const events = [{ id: 'same', date: '2026-11-06', time: '08:00', title: 'Aula' }];
  const records = [
    { id: 'same', dueDate: '2026-11-06', status: 'pendente' },
    { id: 'done', dueDate: '2026-11-04', status: 'concluido' },
    { id: 'note', dueDate: '', status: 'pendente' },
    { id: 'early', dueDate: '2026-11-05', status: 'em_andamento' }
  ];
  const before = JSON.stringify({ events, records });
  const timeline = academicTimeline(events, records);
  assert.deepEqual(timeline.map(i => i.key), ['record-early', 'event-same', 'record-same']);
  assert.equal(new Set(timeline.map(i => i.key)).size, 3);
  assert.equal(JSON.stringify({ events, records }), before);
  assert.deepEqual(academicTimeline([], []), []);
});
