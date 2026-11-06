// Date-only deadlines follow the student's local calendar, including DST changes.
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function deadlineState(record, today = dayKey()) {
  if (record.status === 'concluido') return 'done';
  if (!record.dueDate) return 'unscheduled';
  if (record.dueDate < today) return 'overdue';
  return record.dueDate === today ? 'today' : 'upcoming';
}
export function academicTimeline(events, records) {
  return [
    ...events.map(event => ({ ...event, key: `event-${event.id}`, source: 'event' })),
    ...records.filter(record => record.dueDate && record.status !== 'concluido').map(record => ({
      ...record, key: `record-${record.id}`, date: record.dueDate, time: '', source: 'record'
    }))
  ].sort((a, b) => `${a.date || '9999'}T${a.time || '23:59'}`.localeCompare(`${b.date || '9999'}T${b.time || '23:59'}`));
}
export const statusOptions = [
  { title: 'A fazer', value: 'pendente' },
  { title: 'Em andamento', value: 'em_andamento' },
  { title: 'Concluído', value: 'concluido' }
];
export const typeOptions = [
  { title: 'Trabalho', value: 'trabalho' },
  { title: 'Prova', value: 'prova' },
  { title: 'Anotação', value: 'anotacao' }
];
