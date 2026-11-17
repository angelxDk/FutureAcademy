export const WORKSPACE_TOOLS = [
  { id: 'dashboard', label: 'Visão geral', icon: 'mdi-view-dashboard-outline' },
  { id: 'timetable', label: 'Grade semanal', icon: 'mdi-calendar-week' },
  { id: 'records', label: 'Caderno', icon: 'mdi-notebook-outline' },
  { id: 'assistant', label: 'IA de estudo', icon: 'mdi-auto-fix' },
  { id: 'focus-music', label: 'Sons & música', icon: 'mdi-headphones' },
  { id: 'communities', label: 'Comunidade', icon: 'mdi-account-group-outline' },
  { id: 'agenda', label: 'Agenda', icon: 'mdi-calendar-check-outline' },
  { id: 'pomodoro', label: 'Pomodoro', icon: 'mdi-timer-outline' },
  { id: 'subjects', label: 'Disciplinas', icon: 'mdi-bookshelf' },
  { id: 'profile', label: 'Meu perfil', icon: 'mdi-account-outline' }
];
export const STUDY_DESK_TOOLS = ['records', 'assistant', 'pomodoro', 'focus-music', 'communities'];
const valid = id => WORKSPACE_TOOLS.some(tool => tool.id === id);
export function normalizeWorkspace(raw = {}) {
  raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const requestedVisible = [...new Set((Array.isArray(raw.visible) ? raw.visible : []).filter(valid))];
  // Old saved layouts otherwise reopen the four cramped quadrants forever,
  // including when a local recovery copy is waiting on a cloud conflict.
  const legacyGrid = requestedVisible.length > 2;
  const deskMode = raw.deskMode === true || legacyGrid;
  const deskSplit = deskMode && !legacyGrid && raw.deskSplit === true;
  const opened = [...new Set((Array.isArray(raw.opened) ? raw.opened : ['dashboard']).filter(valid))];
  if (legacyGrid) opened.push(...requestedVisible.filter(id => !opened.includes(id)));
  if (!opened.length) opened.push('dashboard');
  let visible = requestedVisible.filter(id => opened.includes(id));
  if (!visible.length) visible.push(opened[0]);
  let active = visible.includes(raw.active) ? raw.active : visible[0];
  if (deskMode) {
    opened.push(...STUDY_DESK_TOOLS.filter(id => !opened.includes(id)));
    if (deskSplit) {
      const support = active !== 'records' ? active : visible.find(id => id !== 'records') || 'assistant';
      visible = ['records', support];
    } else visible = [active];
  } else visible = visible.slice(0, 2);
  active = visible.includes(active) ? active : visible[0];
  return { layoutVersion: 3, deskMode, deskSplit, compactSidebar: deskMode || !!raw.compactSidebar, opened, visible, active, ratio: Math.min(70, Math.max(deskMode ? 50 : 30, Number(raw.ratio) || (deskMode ? 70 : 50))) };
}
