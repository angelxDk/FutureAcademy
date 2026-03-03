<template>
  <section class="grid gap-6">

    <!-- Skeleton: exibido enquanto os dados do Firestore não chegaram -->
    <template v-if="authStore.dataLoading">

      <!-- Stats cards — mesma altura do .stat-card real (80px) -->
      <div class="glass-card p-6">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-primary">Painel</h2>
          <p class="text-sm text-medium-emphasis">Carregando seus dados...</p>
        </div>
        <div class="stats-grid mt-4">
          <v-skeleton-loader
            v-for="n in 4" :key="n"
            type="list-item-two-line"
            class="stat-card"
            style="background: transparent; height: 80px; border-radius: 12px;"
          />
        </div>
      </div>

      <!-- Grade semanal — altura exata: timeSlots.length * 52px por linha + 48px de header -->
      <div class="glass-card overflow-hidden">
        <div class="px-6 pt-5 pb-3">
          <p class="text-sm font-semibold text-primary uppercase tracking-wider">Grade Semanal</p>
        </div>
        <v-skeleton-loader
          :type="`table-row-divider@${timeSlots.length}`"
          :height="expectedTableHeight"
          style="background: transparent;"
        />
      </div>

      <!-- Formulário rápido — altura igual ao form real (44px btn + inputs) -->
      <div class="glass-card p-6" style="min-height: 100px;">
        <v-skeleton-loader
          type="button-avatar-text@2"
          style="background: transparent;"
        />
      </div>

    </template>

    <!-- Conteúdo real: exibido após hydratação completa -->
    <template v-else>

    <!-- Stats cards -->
    <div class="glass-card p-6">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-primary">Painel</h2>
        <p class="text-sm text-medium-emphasis">Visão geral da rotina</p>
      </div>
      <div class="stats-grid mt-4">
        <div
          v-for="stat in statsCards"
          :key="stat.label"
          class="stat-card"
        >
          <p class="text-xs uppercase tracking-wider text-medium-emphasis mb-1 font-semibold">{{ stat.label }}</p>
          <div class="d-flex align-center ga-3">
            <div class="text-primary" v-html="stat.icon"></div>
            <h3 class="text-2xl font-bold text-high-emphasis">{{ stat.value }}</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Grade semanal -->
    <div class="glass-card overflow-hidden">
      <div class="px-6 pt-5 pb-3 d-flex align-baseline ga-3">
        <p class="text-sm font-semibold text-primary uppercase tracking-wider">Grade Semanal</p>
        <p class="text-xs text-medium-emphasis">1ª Série · 2026/B</p>
      </div>
      <div class="overflow-x-auto">
        <table class="dash-tt w-full">
          <thead>
            <tr>
              <th class="th-hora">Horário</th>
              <th v-for="d in weekDays" :key="d.value">{{ d.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.start">
              <td class="td-hora">
                <span class="block font-mono text-medium-emphasis" style="font-size: 11px">{{ slot.start }} – {{ slot.end }}</span>
              </td>
              <td v-for="d in weekDays" :key="d.value" class="td-cell">
                <template v-for="entry in getCell(d.value, slot.start, slot.end)" :key="entry.id">
                  <div
                    class="cell-chip"
                    :style="{ borderLeftColor: subjectColor(entry.subjectId) }"
                    :title="'Clique para editar: ' + subjectName(entry.subjectId)"
                    @click="openEdit(entry)"
                  >
                    <span
                      class="cell-name"
                      :style="{ color: subjectColor(entry.subjectId) }"
                    >
                      {{ subjectName(entry.subjectId) }}
                    </span>
                    <span class="cell-prof text-medium-emphasis">
                      {{ professorName(entry.subjectId) }}
                    </span>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Novo registro de estudo -->
    <div class="glass-card p-6">
      <p class="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">Novo Registro de Estudo</p>
      <v-form class="d-flex flex-wrap ga-3 align-end" @submit.prevent="addQuickStudySession">
        <v-select
          v-model="quickStudy.subjectId"
          :items="subjectsStore.subjects"
          item-title="name"
          item-value="id"
          label="Matéria"
          variant="outlined"
          density="comfortable"
          bg-color="transparent"
          color="primary"
          style="min-width: 200px; flex: 1"
        />
        <v-text-field
          v-model.number="quickStudy.minutes"
          label="Minutos estudados"
          type="number"
          min="1"
          variant="outlined"
          density="comfortable"
          bg-color="transparent"
          color="primary"
          style="max-width: 160px"
        />
        <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">
          Registrar
        </v-btn>
      </v-form>
    </div>

    </template>
  </section>

  <!-- Edit Timetable Dialog -->
  <v-dialog v-model="editDialog" max-width="480" persistent>
    <v-card rounded="xl" class="pa-2">
      <v-card-title class="text-base font-bold pt-4 px-4 pb-1">Editar Horário</v-card-title>
      <v-card-text class="px-4 pt-2" v-if="editEntry">
        <div class="grid gap-3">
          <v-select
            v-model="editEntry.subjectId"
            :items="subjectsStore.subjects"
            item-title="name"
            item-value="id"
            label="Matéria"
            variant="outlined"
            density="comfortable"
            color="primary"
            bg-color="transparent"
          />
          <v-select
            v-model.number="editEntry.day"
            :items="DAY_OPTIONS"
            item-title="label"
            item-value="value"
            label="Dia"
            variant="outlined"
            density="comfortable"
            color="primary"
            bg-color="transparent"
          />
          <div class="d-flex ga-3">
            <v-text-field
              v-model="editEntry.start"
              label="Início"
              type="time"
              variant="outlined"
              density="comfortable"
              color="primary"
              bg-color="transparent"
              class="flex-1"
            />
            <v-text-field
              v-model="editEntry.end"
              label="Fim"
              type="time"
              variant="outlined"
              density="comfortable"
              color="primary"
              bg-color="transparent"
              class="flex-1"
            />
          </div>
          <v-text-field
            v-model="editEntry.place"
            label="Local"
            variant="outlined"
            density="comfortable"
            color="primary"
            bg-color="transparent"
          />
        </div>
      </v-card-text>
      <v-card-actions class="justify-end px-4 pb-4" style="gap: 8px">
        <v-btn variant="text" @click="editDialog = false">Cancelar</v-btn>
        <v-btn variant="flat" color="primary" class="font-semibold" @click="saveEdit">Salvar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineOptions({ name: 'DashboardSection' });
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useTimetableStore } from '../stores/useTimetableStore';
import { useAgendaStore } from '../stores/useAgendaStore';
import { useRecordsStore } from '../stores/useRecordsStore';
import { usePomodoroStore } from '../stores/usePomodoroStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { DAY_OPTIONS } from '../utils/constants';
import { parseDateTime } from '../utils/date';
import { safeNumber, uid } from '../utils/helpers';

const subjectsStore = useSubjectsStore();
const timetableStore = useTimetableStore();
const agendaStore = useAgendaStore();
const recordsStore = useRecordsStore();
const pomodoroStore = usePomodoroStore();
const syncStore = useSyncStore();
const appStore = useAppStore();
const authStore = useAuthStore();

const editDialog = ref(false);
const editEntry = ref(null);

const quickStudy = ref({ subjectId: '', minutes: 25 });

const statsCards = computed(() => {
  const pendingRecords = recordsStore.records.filter((item) => item.status !== 'concluido').length;
  const upcomingEvents = agendaStore.events.filter((event) => {
    const when = parseDateTime(event.date, event.time);
    return when && when.getTime() >= Date.now();
  }).length;
  const totalMinutes = pomodoroStore.studySessions.reduce(
    (sum, item) => sum + safeNumber(item.minutes, 0),
    0
  );

  return [
    {
      label: 'Matérias',
      value: subjectsStore.subjects.length,
      color: 'gold',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
    },
    {
      label: 'Eventos futuros',
      value: upcomingEvents,
      color: 'secondary',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    },
    {
      label: 'Pendências',
      value: pendingRecords,
      color: 'primary',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    },
    {
      label: 'Min. estudados',
      value: totalMinutes,
      color: 'accent',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    }
  ];
});

function subjectName(subjectId) {
  return subjectsStore.subjects.find((item) => item.id === subjectId)?.name || 'Sem matéria';
}

function addQuickStudySession() {
  if (!quickStudy.value.subjectId) {
    appStore.showToast('Selecione uma matéria.');
    return;
  }
  const minutes = safeNumber(quickStudy.value.minutes, 0);
  if (minutes <= 0) {
    appStore.showToast('Informe minutos válidos.');
    return;
  }
  pomodoroStore.studySessions.push({
    id: uid(),
    subjectId: quickStudy.value.subjectId,
    minutes,
    source: 'manual',
    createdAt: new Date().toISOString()
  });
  syncStore.persistState();
  quickStudy.value.minutes = 25;
  appStore.showToast('Sessão de estudo registrada.');
}

function openEdit(entry) {
  editEntry.value = { ...entry };
  editDialog.value = true;
}

function saveEdit() {
  if (!editEntry.value) return;
  const idx = timetableStore.timetable.findIndex(e => e.id === editEntry.value.id);
  if (idx !== -1) {
    Object.assign(timetableStore.timetable[idx], editEntry.value);
    syncStore.persistState();
  }
  editDialog.value = false;
}

const weekDays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça'   },
  { value: 3, label: 'Quarta'  },
  { value: 4, label: 'Quinta'  },
  { value: 5, label: 'Sexta'   }
];

const timeSlots = [
  { start: '19:00', end: '19:50' },
  { start: '19:50', end: '20:40' },
  { start: '20:50', end: '21:40' },
  { start: '21:40', end: '22:30' },
  { start: '22:30', end: '23:20' }
];

// Altura fixa do skeleton da grade = mesma da tabela real → sem CLS
// 52px por linha (td height) + 48px do header (thead)
const expectedTableHeight = computed(() => timeSlots.length * 52 + 48);

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getCell(day, slotStart, slotEnd) {
  const sStart = toMin(slotStart);
  const sEnd   = toMin(slotEnd);
  return (timetableStore.timetable || []).filter(entry => {
    if (entry.day !== day) return false;
    const eStart = toMin(entry.start);
    const eEnd   = toMin(entry.end);
    return eStart <= sStart && eEnd >= sEnd;
  });
}

function subjectColor(subjectId) {
  const sub = (subjectsStore.subjects || []).find(s => s.id === subjectId);
  return sub?.color || '#8C5E43';
}

function professorName(subjectId) {
  const sub = (subjectsStore.subjects || []).find(s => s.id === subjectId);
  return sub?.professorName || '';
}
</script>

<style scoped>
.dash-tt {
  border-collapse: collapse;
  background: transparent;
}

.dash-tt thead th {
  padding: 8px 10px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--dark-600), 0.8);
  border-bottom: 1px solid rgba(var(--dark-600), 0.25);
}

.dash-tt thead th.th-hora {
  text-align: left;
  min-width: 78px;
  padding-left: 16px;
}

.dash-tt tbody td {
  padding: 6px 8px;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--dark-600), 0.12);
}

.dash-tt tbody td + td {
  border-left: 1px solid rgba(var(--dark-600), 0.1);
}

.td-hora {
  padding: 8px 8px 8px 16px !important;
  min-width: 78px;
  border-right: 1px solid rgba(var(--dark-600), 0.25) !important;
}

.td-cell {
  min-width: 130px;
  max-width: 180px;
}

.cell-chip {
  border-left: 3px solid;
  padding: 4px 7px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.18);
  max-width: 170px;
  overflow: hidden;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.15s ease;
}

.cell-chip:hover {
  background: rgba(0, 0, 0, 0.32);
  transform: scale(1.03);
}

/* Substituindo classes Tailwind removidas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
}
@media (min-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}

.stat-card {
  background: rgba(var(--dark-700), 0.5);
  border: 1px solid rgba(var(--dark-600), 0.5);
  border-radius: 12px;
  padding: 16px;
}

.cell-name {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-prof {
  font-size: 10px;
  line-height: 1.3;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
