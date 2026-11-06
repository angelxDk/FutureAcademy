<template>
  <div class="binder-workspace" :class="{ 'binder-workspace--multiple': workspace.visible.length > 1 }">
    <div class="binder-toolbar">
      <div class="binder-toolbar__title"><v-icon icon="mdi-notebook-outline" size="20" /><div><h1>{{ toolInfo(workspace.active).label }}</h1><p>{{ toolDescription }}</p></div></div>
      <div class="flex gap-2 items-center flex-wrap">
        <v-btn size="small" variant="text" prepend-icon="mdi-view-grid-outline" @click="workspace.studyPreset(); workspace.compactSidebar = true">Mesa de estudo</v-btn>
        <v-btn v-if="workspace.visible.length > 1" size="small" variant="text" @click="workspace.solo()">Uma página</v-btn>
        <v-menu :close-on-content-click="true"><template #activator="{ props }"><v-btn v-bind="props" size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" :disabled="workspace.visible.length >= 4">Abrir ao lado</v-btn></template><v-list density="compact"><v-list-item v-for="tool in availableTools" :key="tool.id" :title="tool.label" :prepend-icon="tool.icon" @click="workspace.open(tool.id, true)" /></v-list></v-menu>
      </div>
    </div>
    <nav v-if="workspace.visible.length > 1" class="binder-tabs" aria-label="Páginas abertas do fichário">
      <button v-for="id in workspace.visible" :key="id" class="binder-tab" :class="{ 'binder-tab--active': workspace.active === id, 'binder-tab--visible': workspace.visible.includes(id) }" :aria-current="workspace.active === id ? 'page' : undefined" @click="activate(id)"><v-icon :icon="toolInfo(id).icon" size="16" />{{ toolInfo(id).label }}<span v-if="workspace.visible.includes(id)" class="binder-tab__dot" /></button>
    </nav>
    <div v-if="workspace.visible.length > 1 && !workspace.maximized" class="workspace-resize"><label for="pane-width">Divisão das colunas</label><input id="pane-width" v-model.number="workspace.ratio" type="range" min="30" max="70" aria-label="Largura da coluna esquerda" /><span>{{ workspace.ratio }} / {{ 100 - workspace.ratio }}</span></div>
    <div class="binder-panels" :class="[`binder-panels--${workspace.visible.length}`, { 'binder-panels--maximized': workspace.maximized }]" :style="{ '--pane-ratio': `${workspace.ratio}%` }">
      <!-- One stable instance per tool. Hiding, maximizing and changing the layout never remount it. -->
      <article v-for="id in mountedTools" :key="id" class="binder-panel" :class="{ 'binder-panel--active': workspace.active === id, 'binder-panel--hidden': !workspace.visible.includes(id) || (workspace.maximized && workspace.maximized !== id) }" :aria-hidden="!workspace.visible.includes(id) || !!(workspace.maximized && workspace.maximized !== id)" :style="panelPosition(id)" :aria-label="toolInfo(id).label" @focusin="workspace.active = id" @pointerdown="workspace.active = id">
        <div class="binder-panel__bar"><span><v-icon :icon="toolInfo(id).icon" size="16" />{{ toolInfo(id).label }}</span><div><v-btn v-if="workspace.visible.length > 1" size="x-small" variant="text" :icon="workspace.maximized === id ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'" :aria-label="workspace.maximized === id ? 'Restaurar espaços' : `Ampliar ${toolInfo(id).label}`" @click="workspace.maximized = workspace.maximized === id ? '' : id" /><v-btn v-if="workspace.visible.length > 1" size="x-small" variant="text" icon="mdi-minus" :aria-label="`Ocultar ${toolInfo(id).label}`" @click="workspace.hide(id)" /></div></div>
        <div @wheel="scrollWorkspace($event, $event.currentTarget)" class="binder-panel__content" :tabindex="workspace.visible.length > 1 ? 0 : undefined" role="region" :aria-label="`Conteúdo de ${toolInfo(id).label}`">
          <component :is="components[id]" :key="id" />
        </div>
      </article>
    </div>
    <p v-if="workspace.visible.length > 1" class="workspace-hint"><v-icon icon="mdi-information-outline" size="14" /> As páginas abertas continuam no lugar ao alternar. No celular, os espaços ficam um abaixo do outro.</p>
  </div>
</template>
<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useSyncStore } from '../stores/useSyncStore';
import { scrollWorkspace } from '../utils/workspaceScroll';
import { WORKSPACE_TOOLS } from '../utils/workspace';
const route = useRoute(), router = useRouter(), workspace = useWorkspaceStore(), sync = useSyncStore();
const components = {
  dashboard: defineAsyncComponent(() => import('../sections/DashboardSection.vue')),
  records: defineAsyncComponent(() => import('../sections/RecordsSection.vue')),
  assistant: defineAsyncComponent(() => import('../sections/AssistantSection.vue')),
  timetable: defineAsyncComponent(() => import('../sections/TimetableSection.vue')),
  'focus-music': defineAsyncComponent(() => import('../sections/FocusMusicSection.vue')),
  communities: defineAsyncComponent(() => import('../sections/CommunitiesSection.vue')),
  agenda: defineAsyncComponent(() => import('../sections/AgendaSection.vue')),
  pomodoro: defineAsyncComponent(() => import('../sections/PomodoroSection.vue')),
  subjects: defineAsyncComponent(() => import('../sections/SubjectsSection.vue')),
  profile: defineAsyncComponent(() => import('../sections/ProfileSection.vue'))
};
const toolInfo = id => WORKSPACE_TOOLS.find(t => t.id === id) || WORKSPACE_TOOLS[0];
const loadedTools = ref([...workspace.visible]);
const mountedTools = computed(() => workspace.opened.filter(id => loadedTools.value.includes(id)));
watch(() => [...workspace.visible], ids => { loadedTools.value = [...new Set([...loadedTools.value, ...ids])]; }, { immediate: true });
const descriptions = { dashboard: 'Seu dia, suas prioridades e o próximo passo.', records: 'Um lugar para escrever, conectar ideias e aprender.', timetable: 'Uma semana organizada abre espaço para aprender.', assistant: 'Pergunte, explore e estude no seu próprio ritmo.', 'focus-music': 'Prepare um ambiente confortável para se concentrar.', communities: 'Reúna seus grupos e registros de estudo.', agenda: 'Seus compromissos e entregas em um só lugar.', pomodoro: 'Uma tarefa de cada vez. Uma pausa quando precisar.', subjects: 'Organize as disciplinas da sua jornada.', profile: 'Um espaço com a sua identidade.' };
const toolDescription = computed(() => descriptions[workspace.active] || 'Seu espaço pessoal de aprendizado.');
const availableTools = computed(() => WORKSPACE_TOOLS.filter(t => !workspace.visible.includes(t.id)));
function activate(id) { workspace.open(id); if (route.name !== id) router.push({ name: id }); }
function panelPosition(id) {
  if (workspace.maximized || workspace.visible.length === 1) return { gridArea: '1 / 1 / -1 / -1' };
  const index = workspace.visible.indexOf(id);
  return { gridRow: workspace.visible.length === 3 && index === 0 ? '1 / 3' : String(Math.floor(index / 2) + 1), gridColumn: String(workspace.visible.length === 3 && index === 2 ? 2 : index % 2 + 1) };
}
watch(() => [route.name, route.query.edit, route.query.new], () => workspace.open(route.name), { immediate: true });
watch(() => workspace.snapshot(), () => sync.persistState(), { deep: true });
</script>
<style scoped>
.binder-workspace { min-width:0; }
.binder-toolbar { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; padding:5px 0 22px; }
.binder-toolbar__title { display:flex; align-items:center; gap:14px; }
.binder-toolbar__title > .v-icon { display:grid; place-items:center; box-sizing:content-box; padding:11px; border-radius:13px; background:rgb(var(--gold-500) / .08); color:rgb(var(--gold-500)); }
.binder-toolbar__title h1 { font-size:25px; line-height:1.4; font-weight:750; letter-spacing:-.6px; color:var(--app-text); }
.binder-toolbar__title p { margin-top:4px; color:var(--app-muted); font-size:12px; line-height:1.6; }
.binder-tabs { display:flex; gap:5px; overflow-x:auto; overflow-y:hidden; padding:6px; border:1px solid var(--surface-border); border-radius:13px; background:rgb(var(--dark-700) / .14); scrollbar-width:thin; }
.binder-tab { flex-shrink:0; display:flex; gap:8px; align-items:center; padding:10px 13px; border:1px solid transparent; border-radius:8px; color:var(--app-muted); font-size:12px; line-height:1.5; background:transparent; cursor:pointer; transition:background .15s,color .15s; }
.binder-tab:hover { background:rgb(var(--gold-500) / .04); color:var(--app-text); }
.binder-tab--active { background:var(--surface); border-color:var(--surface-border); color:rgb(var(--gold-500)); font-weight:700; box-shadow:0 2px 4px #00000003; }
.binder-tab__dot { width:4px; height:4px; background:currentColor; border-radius:50%; }
.binder-tab:focus-visible { outline:2px solid rgb(var(--gold-500)); outline-offset:-2px; }
.binder-panels { display:grid; gap:16px; padding-top:20px; grid-template-columns:minmax(0,1fr); }
.binder-panels--2,.binder-panels--3,.binder-panels--4 { grid-template-columns:minmax(0,var(--pane-ratio)) minmax(0,1fr); grid-template-rows:minmax(0,1fr); height:max(480px,calc(100dvh - 285px)); }
.binder-panels--3,.binder-panels--4 { grid-template-rows:repeat(2,minmax(0,1fr)); height:max(580px,calc(100dvh - 285px)); }
.binder-panels--maximized { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr); }
.binder-panel { min-width:0; min-height:0; border:1px solid var(--surface-border); border-radius:16px; background:var(--notebook-paper); display:flex; flex-direction:column; overflow:clip; container-type:inline-size; }
.binder-panel--hidden { display:none !important; }
.binder-panel--active { border-color:rgb(var(--gold-500) / .35); }
.binder-panel__bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 15px; background:rgb(var(--gold-500) / .025); border-bottom:1px solid var(--surface-border); flex-shrink:0; }
.binder-panel__bar > span { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:650; color:var(--app-muted); }
.binder-panel--active .binder-panel__bar > span { color:rgb(var(--gold-500)); }
.binder-panel__content { padding:20px; overflow-x:auto; overflow-y:auto; flex:1 1 0; min-height:0; overscroll-behavior:auto; scrollbar-width:thin; scrollbar-color:rgb(var(--gold-500) / .3) transparent; }
.binder-panel__content:focus-visible { outline:2px solid rgb(var(--gold-500)); outline-offset:-3px; }
/* A single page belongs to the document scroll. It must never create a nested wheel trap. */
.binder-panels--1 { height:auto; padding-top:0; }
.binder-panels--1 .binder-panel { overflow:visible; border:0; border-radius:0; background:transparent; }
.binder-panels--1 .binder-panel__bar { display:none; }
.binder-panels--1 .binder-panel__content { padding:4px 0 24px; overflow:visible; flex:none; }
.workspace-resize { display:flex; justify-content:flex-end; align-items:center; gap:10px; padding-top:15px; color:var(--app-muted); font-size:11px; }
.workspace-resize input { width:100px; accent-color:rgb(var(--gold-500)); cursor:ew-resize; }
.workspace-hint { display:flex; align-items:center; gap:6px; color:var(--app-muted); font-size:11px; line-height:1.6; margin-top:13px; }
@media(max-width:760px) { .binder-toolbar { padding-top:0; gap:12px; } .binder-toolbar__title h1 { font-size:22px; } .binder-toolbar__title p { font-size:11px; } .binder-panels--2,.binder-panels--3,.binder-panels--4 { display:flex; flex-direction:column; height:auto; } .binder-panel { min-height:0; overflow:visible; } .binder-panel__content { overflow:visible; flex:none; } .binder-panel__bar { border-radius:16px 16px 0 0; } .workspace-resize { display:none; } .binder-panel__content { padding:14px; } }
</style>
