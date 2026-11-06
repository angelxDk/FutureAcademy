<template>
  <aside id="academy-sidebar" class="academy-sidebar" :class="{ 'academy-sidebar--collapsed': workspace.compactSidebar && !header, 'academy-navigation--header': header }" aria-label="Navegação da academia">
    <div v-if="!header" class="sidebar-heading">
      <div v-if="!workspace.compactSidebar" class="sidebar-heading__copy"><span>SEU ESPAÇO</span><strong>Biblioteca pessoal</strong></div>
      <button class="sidebar-toggle" type="button" :aria-label="workspace.compactSidebar ? 'Expandir menu lateral' : 'Recolher menu lateral'" :title="workspace.compactSidebar ? 'Expandir menu lateral' : 'Recolher menu lateral'" :aria-expanded="!workspace.compactSidebar" aria-controls="academy-navigation" @click="toggle">
        <v-icon :icon="workspace.compactSidebar ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left'" size="20" />
      </button>
    </div>
    <nav id="academy-navigation" class="sidebar-navigation" aria-label="Ferramentas da academia">
      <div v-for="group in groups" :key="group.title" class="sidebar-group">
        <p v-if="!workspace.compactSidebar && !header" class="sidebar-group__title">{{ group.title }}</p>
        <router-link v-for="id in group.tools" :key="id" :to="{ name: id }" class="sidebar-link" :class="{ 'sidebar-link--active': workspace.active === id }" :aria-current="workspace.active === id ? 'page' : undefined" :aria-label="tool(id).label" :title="tool(id).label">
          <v-icon :icon="tool(id).icon" size="20" /><span v-if="header || !workspace.compactSidebar">{{ tool(id).label }}</span><span v-if="workspace.active === id && !workspace.compactSidebar" class="sidebar-active-dot" aria-hidden="true" />
        </router-link>
      </div>
    </nav>
    <div v-if="!header && !workspace.compactSidebar" class="sidebar-footer"><v-icon icon="mdi-book-open-page-variant-outline" size="19" /><p>Uma ideia de cada vez.<span>Este espaço é seu.</span></p></div>
  </aside>
</template>
<script setup>
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useSyncStore } from '../stores/useSyncStore';
import { WORKSPACE_TOOLS } from '../utils/workspace';
defineProps({ header: Boolean });
const workspace = useWorkspaceStore(), sync = useSyncStore();
const groups = [
  { title: 'Organizar', tools: ['dashboard', 'subjects', 'timetable', 'agenda'] },
  { title: 'Aprender', tools: ['records', 'assistant', 'pomodoro', 'focus-music'] },
  { title: 'Conectar', tools: ['communities'] }
];
const tool = id => WORKSPACE_TOOLS.find(item => item.id === id);
function toggle() { workspace.compactSidebar = !workspace.compactSidebar; sync.persistState(); }
</script>
<style scoped>
.academy-sidebar { position:sticky; top:20px; align-self:start; background:var(--surface); border:1px solid var(--surface-border); border-radius:18px; padding:17px 12px 12px; max-height:calc(100dvh - 40px); overflow-y:auto; overscroll-behavior-y:auto; scrollbar-width:thin; }
.sidebar-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 5px 19px; }
.sidebar-heading__copy { min-width:0; display:flex; flex-direction:column; gap:5px; }
.sidebar-heading__copy > span { font-size:9px; font-weight:700; letter-spacing:1.5px; color:var(--app-muted); }
.sidebar-heading__copy strong { font-size:13px; font-weight:700; color:var(--app-text); }
.sidebar-toggle { display:grid; place-items:center; width:32px; height:32px; flex-shrink:0; border:1px solid var(--surface-border); border-radius:9px; background:var(--app-bg); color:var(--app-muted); cursor:pointer; }
.sidebar-toggle:hover { color:rgb(var(--gold-500)); border-color:rgb(var(--gold-500) / .4); }
.sidebar-toggle:focus-visible,.sidebar-link:focus-visible { outline:2px solid rgb(var(--gold-500)); outline-offset:3px; }
.sidebar-group + .sidebar-group { margin-top:21px; }
.sidebar-group__title { margin:0 12px 8px; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--app-muted); }
.sidebar-link { display:flex; align-items:center; gap:11px; min-height:42px; margin:3px 0; padding:9px 12px; border-radius:10px; text-decoration:none; color:var(--app-muted); font-size:12px; line-height:1.5; transition:background .15s,color .15s; }
.sidebar-link:hover { background:rgb(var(--gold-500) / .05); color:var(--app-text); }
.sidebar-link--active { background:rgb(var(--gold-500) / .1); color:rgb(var(--gold-500)); font-weight:700; }
.sidebar-link > .sidebar-active-dot { margin-left:auto; width:5px; height:5px; background:currentColor; border-radius:50%; }
.sidebar-footer { display:flex; align-items:center; gap:10px; margin:22px 6px 0; padding:17px 7px 5px; border-top:1px solid var(--surface-border); color:var(--app-muted); }
.sidebar-footer p { font-size:11px; line-height:1.7; }
.sidebar-footer span { display:block; font-size:10px; opacity:.8; }
.academy-sidebar--collapsed { padding:14px 6px; }
.academy-sidebar--collapsed .sidebar-heading { justify-content:center; padding:0 0 16px; }
.academy-sidebar--collapsed .sidebar-link { justify-content:center; padding:10px 0; }
.academy-sidebar--collapsed .sidebar-group + .sidebar-group { margin-top:14px; padding-top:12px; border-top:1px solid var(--surface-border); }
@media(max-width:760px) { .academy-sidebar { position:static; max-height:none; padding:12px; margin-bottom:16px; } .sidebar-heading { padding-bottom:10px; } .sidebar-navigation { display:flex; gap:6px; overflow-x:auto; padding:2px; } .sidebar-group { display:contents; } .sidebar-group__title,.sidebar-footer { display:none; } .sidebar-link { white-space:nowrap; margin:0; padding:9px 12px; } .academy-sidebar--collapsed .sidebar-navigation { display:none; } .academy-sidebar--collapsed .sidebar-heading { justify-content:flex-start; padding-bottom:0; } .academy-sidebar--collapsed .sidebar-heading::after { content:'Menu recolhido · expanda para navegar'; color:var(--app-muted); font-size:11px; margin-left:10px; } }

.academy-navigation--header { position:static; padding:5px; border-radius:13px; max-height:none; overflow:visible; background:transparent; min-width:0; }
.academy-navigation--header .sidebar-navigation { display:flex; align-items:center; gap:3px; overflow-x:auto; scrollbar-width:thin; padding:2px; }
.academy-navigation--header .sidebar-group { display:flex; align-items:center; gap:3px; margin:0; padding:0; border:0; }
.academy-navigation--header .sidebar-group + .sidebar-group { border-left:1px solid var(--surface-border); padding-left:7px; margin-left:4px; }
.academy-navigation--header .sidebar-link { justify-content:center; padding:10px; margin:0; min-height:40px; flex-shrink:0; white-space:nowrap; gap:7px; }
.academy-navigation--header .sidebar-link > span { display:none; }
.academy-navigation--header .sidebar-active-dot { display:none !important; }
@media(min-width:1700px) { .academy-navigation--header .sidebar-link > span:not(.sidebar-active-dot) { display:inline; } .academy-navigation--header .sidebar-link { font-size:11px; padding:10px 9px; } }
@media(max-width:1100px) { .academy-navigation--header { width:100%; order:3; margin:0; } .academy-navigation--header .sidebar-navigation { justify-content:flex-start; } .academy-navigation--header .sidebar-link > span:not(.sidebar-active-dot) { display:inline; font-size:11px; } }
</style>
