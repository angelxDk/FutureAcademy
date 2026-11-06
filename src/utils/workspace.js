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
const valid = id => WORKSPACE_TOOLS.some(tool => tool.id === id);
export function normalizeWorkspace(raw = {}) {
  const opened = [...new Set((raw.opened || ['dashboard']).filter(valid))];
  if (!opened.length) opened.push('dashboard');
  const visible = [...new Set((raw.visible || [opened[0]]).filter(id => opened.includes(id)))].slice(0, 4);
  if (!visible.length) visible.push(opened[0]);
  return { compactSidebar: !!raw.compactSidebar, opened, visible, active: visible.includes(raw.active) ? raw.active : visible[0], ratio: Math.min(70, Math.max(30, Number(raw.ratio) || 50)) };
}
