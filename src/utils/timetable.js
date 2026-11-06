export function timetableSlots(entries) {
  const valid = entries.filter(e => /^\d{2}:\d{2}$/.test(e.start) && /^\d{2}:\d{2}$/.test(e.end) && e.start < e.end);
  const times = [...new Set(valid.flatMap(e => [e.start, e.end]))].sort();
  if (!times.length) return [{ start: '08:00', end: '09:00' }, { start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' }];
  return times.slice(0, -1).map((start, i) => ({ start, end: times[i + 1] })).filter(slot => valid.some(e => e.start <= slot.start && e.end >= slot.end));
}
export function timetableCell(entries, slots, day, slot) {
  const entry = entries.find(e => Number(e.day) === day && e.start <= slot.start && e.end >= slot.end);
  if (!entry) return { entry: null, span: 1, hidden: false };
  return { entry, hidden: entry.start < slot.start, span: slots.filter(s => s.start >= entry.start && s.end <= entry.end).length };
}
export function timetableIcs(entries, subjects, now = new Date()) {
  const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const compact = date => `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Future Academy//Fichario//PT-BR', 'CALSCALE:GREGORIAN'];
  entries.forEach(e => {
    const date = new Date(now); date.setDate(date.getDate() + (Number(e.day) - date.getDay() + 7) % 7);
    const key = compact(date);
    lines.push('BEGIN:VEVENT', `UID:${escape(e.id)}@future-academy`, `DTSTAMP:${stamp}`, `DTSTART:${key}T${e.start.replace(':','')}00`, `DTEND:${key}T${e.end.replace(':','')}00`, 'RRULE:FREQ=WEEKLY', `SUMMARY:${escape(subjects.find(s => s.id === e.subjectId)?.name || 'Aula')}`, `LOCATION:${escape(e.place)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  // Fold by UTF-8 octets so accented names import correctly in calendar clients.
  return lines.map(line => {
    let result = '', bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 73) { result += '\r\n '; bytes = 1; }
      result += char; bytes += size;
    }
    return result;
  }).join('\r\n') + '\r\n';
}
