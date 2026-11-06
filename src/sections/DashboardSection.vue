<template>
  <section class="grid gap-6">
    <div class="workspace-hero">
      <div>
        <p class="eyebrow">SEU ESPAÇO DE APRENDIZADO</p>
        <h1>Um passo de cada vez,<br><span>{{ firstName }}.</span></h1>
        <p class="text-medium-emphasis mt-3">{{ dateLabel }} · Organize o dia. Dê espaço às suas ideias.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <v-btn to="/records?new=1" color="primary" size="large" prepend-icon="mdi-plus">Novo trabalho</v-btn>
        <v-btn to="/pomodoro" variant="outlined" size="large" prepend-icon="mdi-timer-outline">Começar a estudar</v-btn>
      </div>
    </div>
    <v-progress-linear v-if="auth.dataLoading" indeterminate color="primary" aria-label="Carregando dados" />
    <template v-else>
      <div v-if="!subjects.subjects.length" class="glass-card p-6 onboarding-card">
        <div><p class="eyebrow">VAMOS COMEÇAR</p><h2 class="text-xl">Sua rotina começa com uma disciplina</h2><p class="text-medium-emphasis mt-2">Cadastre suas matérias, monte a grade e escreva seu primeiro trabalho aqui.</p></div>
        <v-btn to="/subjects" color="primary" variant="tonal" prepend-icon="mdi-book-plus-outline">Adicionar disciplina</v-btn>
      </div>
      <div class="overview-grid">
        <div v-for="stat in stats" :key="stat.label" class="glass-card overview-stat">
          <v-icon :icon="stat.icon" color="primary" size="22" /><span class="text-medium-emphasis text-sm">{{ stat.label }}</span><strong>{{ stat.value }}</strong>
        </div>
      </div>
      <div class="workspace-columns">
        <div class="grid gap-6" style="align-content:start">
          <div class="glass-card p-6">
            <div class="section-heading"><div><p class="eyebrow">PRÓXIMO PASSO</p><h2 class="text-xl">O que precisa de atenção</h2></div><v-btn to="/records" variant="text" color="primary">Ver trabalhos</v-btn></div>
            <div v-if="!priorities.length" class="empty-state"><v-icon icon="mdi-check-circle-outline" size="36" color="primary" /><h3>Nenhuma pendência por aqui</h3><p>Adicione um trabalho ou uma prova para acompanhar os prazos.</p><v-btn to="/records?new=1" variant="tonal" color="primary">Criar primeiro trabalho</v-btn></div>
            <div v-for="record in priorities" :key="record.id" class="academic-row">
              <v-btn icon="mdi-check" size="small" variant="outlined" :aria-label="`Concluir ${record.title}`" @click="complete(record)" />
              <router-link :to="{ name: 'records', query: { edit: record.id } }" class="academic-row__body"><strong>{{ record.title }}</strong><span>{{ subjectName(record.subjectId) }} · {{ statusLabel(record.status) }}</span></router-link>
              <v-chip size="small" :color="deadlineState(record, today) === 'overdue' ? 'error' : 'primary'" variant="tonal">{{ dueLabel(record) }}</v-chip>
            </div>
          </div>
          <div class="glass-card p-6">
            <div class="section-heading"><div><p class="eyebrow">SUA ROTINA</p><h2 class="text-xl">Aulas de hoje</h2></div><v-btn to="/timetable" variant="text" color="primary">Ver grade</v-btn></div>
            <p v-if="!todayClasses.length" class="empty-copy">Sem aulas cadastradas para hoje. Aproveite para revisar ou adiantar um trabalho.</p>
            <div v-for="lesson in todayClasses" :key="lesson.id" class="academic-row"><div class="lesson-time">{{ lesson.start }}<small>{{ lesson.end }}</small></div><div class="academic-row__body"><strong>{{ subjectName(lesson.subjectId) }}</strong><span>{{ lesson.place || 'Local não informado' }}</span></div><span class="subject-dot" :style="{ background: subjectColor(lesson.subjectId) }" /></div>
          </div>
        </div>
        <div class="grid gap-6" style="align-content:start">
          <div class="glass-card p-6">
            <div class="section-heading"><div><p class="eyebrow">NO HORIZONTE</p><h2 class="text-xl">Próximos compromissos</h2></div><v-btn to="/agenda" icon="mdi-arrow-top-right" variant="text" aria-label="Abrir agenda" /></div>
            <p v-if="!upcoming.length" class="empty-copy">Seus eventos e prazos aparecerão aqui, juntos.</p>
            <router-link v-for="item in upcoming" :key="item.key" :to="item.source === 'record' ? { name: 'records', query: { edit: item.id } } : '/agenda'" class="academic-row timeline-link"><div class="calendar-tile"><strong>{{ Number(item.date.slice(8)) }}</strong><small>{{ monthLabel(item.date) }}</small></div><div class="academic-row__body"><strong>{{ item.title }}</strong><span>{{ item.source === 'record' ? 'Entrega' : item.time }} · {{ subjectName(item.subjectId) }}</span></div></router-link>
          </div>
          <div class="glass-card p-6">
            <p class="eyebrow">CONSTÂNCIA CONTA</p><h2 class="text-xl mb-2">Seu estudo nesta semana</h2><div class="study-total">{{ weekMinutes }} <span>minutos</span></div><p class="text-sm text-medium-emphasis mb-4">Registre também o estudo feito fora do cronômetro.</p>
            <v-form @submit.prevent="logStudy" class="grid gap-3">
              <v-select v-model="quick.subjectId" :items="subjects.subjects" item-title="name" item-value="id" label="Disciplina" variant="outlined" hide-details />
              <v-text-field v-model.number="quick.minutes" type="number" min="1" max="1440" label="Minutos estudados" variant="outlined" hide-details />
              <v-btn type="submit" color="primary" variant="tonal">Registrar sessão</v-btn>
            </v-form>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useUserStore } from '../stores/useUserStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useRecordsStore } from '../stores/useRecordsStore';
import { useAgendaStore } from '../stores/useAgendaStore';
import { useTimetableStore } from '../stores/useTimetableStore';
import { usePomodoroStore } from '../stores/usePomodoroStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { academicTimeline, dayKey, deadlineState, statusOptions } from '../utils/academic';
import { uid } from '../utils/helpers';
defineOptions({ name: 'DashboardSection' });
const auth = useAuthStore(), user = useUserStore(), subjects = useSubjectsStore(), records = useRecordsStore(), agenda = useAgendaStore(), timetable = useTimetableStore(), pomodoro = usePomodoroStore(), sync = useSyncStore(), app = useAppStore();
const now = ref(new Date());
let clock;
onMounted(() => { clock = setInterval(() => { now.value = new Date(); }, 60000); });
onUnmounted(() => clearInterval(clock));
const today = computed(() => dayKey(now.value));
const firstName = computed(() => (user.profile.name || auth.authUser?.name || 'estudante').split(' ')[0]);
const dateLabel = computed(() => now.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
const pending = computed(() => records.orderedRecords.filter(r => r.type !== 'anotacao' && r.status !== 'concluido'));
const priorities = computed(() => pending.value.slice(0, 5));
const todayClasses = computed(() => timetable.timetable.filter(t => Number(t.day) === now.value.getDay()).sort((a,b) => a.start.localeCompare(b.start)));
const upcoming = computed(() => academicTimeline(agenda.events, records.records).filter(i => i.date >= today.value).slice(0, 4));
const weekMinutes = computed(() => {
  const start = new Date(now.value); start.setDate(start.getDate() - (start.getDay() + 6) % 7); start.setHours(0,0,0,0);
  return pomodoro.studySessions.filter(s => new Date(s.createdAt) >= start && new Date(s.createdAt) <= now.value).reduce((sum,s) => sum + (Number(s.minutes) || 0), 0);
});
const stats = computed(() => [
  { label: 'Disciplinas', value: subjects.subjects.length, icon: 'mdi-book-open-page-variant-outline' },
  { label: 'Trabalhos em aberto', value: pending.value.length, icon: 'mdi-file-document-outline' },
  { label: 'Prazos atrasados', value: pending.value.filter(r => deadlineState(r, today.value) === 'overdue').length, icon: 'mdi-clock-alert-outline' },
  { label: 'Concluídos', value: records.records.filter(r => r.status === 'concluido').length, icon: 'mdi-check-circle-outline' }
]);
const subjectName = id => subjects.subjects.find(s => s.id === id)?.name || 'Sem disciplina';
const subjectColor = id => subjects.subjects.find(s => s.id === id)?.color || 'rgb(var(--gold-500))';
const statusLabel = status => statusOptions.find(s => s.value === status)?.title || 'A fazer';
const monthLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' });
function dueLabel(r) { const state = deadlineState(r, today.value); return state === 'overdue' ? 'Atrasado' : state === 'today' ? 'Hoje' : r.dueDate ? new Date(`${r.dueDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Sem prazo'; }
function complete(r) { records.updateRecord(r.id, { status: 'concluido', updatedAt: new Date().toISOString() }); sync.persistState(); }
const quick = ref({ subjectId: '', minutes: 25 });
function logStudy() {
  const minutes = Number(quick.value.minutes);
  if (!subjects.subjects.some(s => s.id === quick.value.subjectId) || !Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) { app.showToast('Selecione uma disciplina e informe entre 1 e 1440 minutos.'); return; }
  pomodoro.studySessions.push({ id: uid(), subjectId: quick.value.subjectId, minutes, source: 'manual', createdAt: new Date().toISOString() }); sync.persistState(); app.showToast('Sessão registrada. Bom estudo!');
}
</script>
