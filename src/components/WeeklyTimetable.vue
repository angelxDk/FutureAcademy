<template>
  <div class="notebook-page" id="weekly-notebook">
    <div class="notebook-rings" aria-hidden="true"><i v-for="i in 6" :key="i" /></div>
    <div class="notebook-page__inside">
      <div class="notebook-caption"><div><p class="eyebrow">MEU PLANEJAMENTO</p><h2>Minha semana<span>.</span></h2><p>Uma página para cada nova possibilidade.</p></div><span class="notebook-stamp">{{ new Date().getFullYear() }}<small>GRADE DE AULAS</small></span></div>
      <div class="week-scroll"><table class="notebook-week"><thead><tr><th scope="col" class="week-hour">Horário</th><th v-for="day in days" :key="day.value" scope="col" :class="{ 'week-today': day.value === currentDay }"><span>{{ day.label }}</span><small>{{ day.value === currentDay ? 'HOJE' : ' ' }}</small></th></tr></thead><tbody>
        <tr v-for="slot in slots" :key="slot.start"><th scope="row" class="week-hour"><strong>{{ slot.start }}</strong><small>{{ slot.end }}</small></th><template v-for="day in days" :key="day.value"><td v-if="!cell(day.value, slot).hidden" :rowspan="cell(day.value, slot).span" :class="{ 'week-today-cell': day.value === currentDay }">
          <button v-if="cell(day.value, slot).entry" class="notebook-lesson" :style="lessonStyle(cell(day.value, slot).entry)" @click="$emit('edit', cell(day.value, slot).entry.id)"><span class="notebook-lesson__time">{{ cell(day.value, slot).entry.start }} — {{ cell(day.value, slot).entry.end }}</span><strong>{{ subject(cell(day.value, slot).entry.subjectId).name || 'Sem disciplina' }}</strong><small>{{ subject(cell(day.value, slot).entry.subjectId).professorName }}</small><span v-if="cell(day.value, slot).entry.place" class="notebook-lesson__place"><v-icon icon="mdi-map-marker-outline" size="12" />{{ cell(day.value, slot).entry.place }}</span><v-icon class="lesson-edit" icon="mdi-pencil-outline" size="14" /></button>
          <button v-else class="notebook-empty" :aria-label="`Adicionar aula: ${day.label}, ${slot.start}`" @click="$emit('create', { day: day.value, start: slot.start, end: slot.end })"><span>+</span></button>
        </td></template></tr>
      </tbody></table></div>
      <div class="notebook-footer"><span><v-icon icon="mdi-cursor-default-click-outline" size="14" /> Toque em uma aula para editar; em um espaço vazio para adicionar.</span><span>{{ entries.length }} aulas · {{ subjects.length }} disciplinas</span></div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { DAY_OPTIONS } from '../utils/constants';
import { timetableSlots, timetableCell } from '../utils/timetable';
const props = defineProps({ entries: { type: Array, default: () => [] }, subjects: { type: Array, default: () => [] }, weekends: Boolean });
defineEmits(['edit', 'create']);
const days = computed(() => DAY_OPTIONS.filter(d => props.weekends || (d.value >= 1 && d.value <= 5)));
const slots = computed(() => timetableSlots(props.entries));
const currentDay = new Date().getDay();
const cell = (day, slot) => timetableCell(props.entries, slots.value, day, slot);
const subject = id => props.subjects.find(s => s.id === id) || {};
function lessonStyle(entry) { const value = subject(entry.subjectId).color; const color = /^#[\da-f]{6}$/i.test(value || '') ? value : '#8c735b'; return { '--lesson-color': color }; }
</script>
<style scoped>
.notebook-page { position:relative; background:var(--notebook-paper); border:1px solid var(--surface-border); border-radius:5px 18px 18px 5px; box-shadow:3px 4px 0 var(--notebook-paper),4px 5px 0 var(--surface-border),7px 8px 0 var(--notebook-paper),8px 9px 0 var(--surface-border),0 15px 45px #00000008; }
.notebook-page__inside { padding:32px 24px 20px 46px; border-left:1px solid rgba(191,102,99,.25); margin-left:22px; }
.notebook-rings { position:absolute; top:90px; bottom:45px; left:-10px; width:28px; display:flex; flex-direction:column; justify-content:space-between; z-index:1; }
.notebook-rings i { width:27px; height:12px; border:3px solid var(--ring-color); background:var(--app-bg); border-radius:10px; box-shadow:inset 0 2px 2px #0002,0 2px 3px #0002; }
.notebook-caption { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; gap:12px; }
.notebook-caption h2 { font-size:34px; font-weight:800; letter-spacing:-1.3px; line-height:1.1; }
.notebook-caption h2 span { color:rgb(var(--gold-500)); }
.notebook-caption p:last-child { color:var(--app-muted); font-size:12px; margin-top:8px; }
.notebook-stamp { font-size:26px; font-weight:300; color:var(--app-muted); border:1px solid var(--surface-border); border-radius:8px; padding:10px 15px; text-align:center; transform:rotate(3deg); }
.notebook-stamp small { display:block; font-size:8px; letter-spacing:1.5px; }
.week-scroll { overflow:auto; }
.notebook-week { border-collapse:separate; border-spacing:0; width:100%; table-layout:fixed; min-width:650px; }
.notebook-week thead th { padding:12px 6px; border-bottom:2px solid var(--surface-border); text-align:center; font-size:12px; }
.notebook-week thead th small { display:block; font-size:8px; height:12px; margin-top:5px; letter-spacing:1.8px; color:rgb(var(--gold-500)); }
.notebook-week td { padding:5px; border-right:1px solid var(--notebook-rule); border-bottom:1px solid var(--notebook-rule); vertical-align:top; height:95px; }
.notebook-week th.week-hour { width:75px; text-align:left; font-size:10px; color:var(--app-muted); padding:12px 6px; border-bottom:1px solid var(--notebook-rule); }
.week-hour strong, .week-hour small { display:block; font-variant-numeric:tabular-nums; }
.week-hour strong { font-size:12px; margin-bottom:5px; }
.week-hour small { opacity:.7; font-weight:500; }
.week-today { border-top:2px solid rgb(var(--gold-500)); border-radius:6px 6px 0 0; background:rgb(var(--gold-500) / .07); }
.week-today-cell { background:rgb(var(--gold-500) / .025); }
.notebook-lesson { width:100%; height:100%; min-height:83px; text-align:left; display:flex; flex-direction:column; align-items:flex-start; gap:7px; border-left:3px solid var(--lesson-color); border-radius:6px; background:color-mix(in srgb,var(--lesson-color) 13%,var(--notebook-paper)); padding:11px 9px; cursor:pointer; position:relative; color:var(--app-text); transition:box-shadow .2s; }
.notebook-lesson:hover { box-shadow:0 0 0 1px var(--lesson-color); }
.notebook-lesson strong { font-size:11px; line-height:1.5; overflow-wrap:anywhere; }
.notebook-lesson small { font-size:9px; color:var(--app-muted); }
.notebook-lesson__time { font-size:9px; color:var(--app-muted); font-weight:600; }
.notebook-lesson__place { font-size:9px; color:var(--app-muted); display:flex; align-items:center; gap:3px; }
.lesson-edit { position:absolute; bottom:6px; right:6px; opacity:0; }
.notebook-lesson:hover .lesson-edit { opacity:1; }
.notebook-empty { width:100%; height:100%; min-height:83px; cursor:pointer; border-radius:6px; color:var(--app-muted); }
.notebook-empty span { opacity:.15; font-size:20px; }
.notebook-empty:hover { background:rgb(var(--gold-500) / .06); }
.notebook-empty:hover span { opacity:1; }
.notebook-footer { display:flex; gap:12px; justify-content:space-between; flex-wrap:wrap; font-size:10px; color:var(--app-muted); padding-top:18px; }
@container(max-width:650px) { .notebook-page__inside { padding:20px 12px 16px 15px; margin-left:16px; } .notebook-caption h2 { font-size:27px; } .notebook-stamp { display:none; } }
@media print { .notebook-page { box-shadow:none; } .notebook-rings { display:none; } .notebook-page__inside { margin:0; padding:0; border:0; } .notebook-footer { display:none; } .notebook-lesson { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style>
