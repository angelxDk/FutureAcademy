<template>
  <section class="grid gap-6">

    <!-- Stats cards -->
    <div class="glass-card p-6">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-primary">Painel</h2>
        <p class="text-sm text-medium-emphasis">Visão geral da rotina</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div
          v-for="stat in ctx.statsCards"
          :key="stat.label"
          class="bg-dark-700 bg-opacity-50 rounded-xl p-4 border border-dark-600 border-opacity-50"
        >
          <p class="text-xs uppercase tracking-wider text-medium-emphasis mb-1 font-semibold">{{ stat.label }}</p>
          <div class="flex items-center gap-3">
            <div class="text-primary" v-html="stat.icon"></div>
            <h3 class="text-2xl font-bold text-high-emphasis">{{ stat.value }}</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Grade semanal -->
    <div class="glass-card overflow-hidden">
      <div class="px-6 pt-5 pb-3 flex items-baseline gap-3">
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
                <span class="block font-mono text-[11px] text-medium-emphasis">{{ slot.start }}</span>
                <span class="block font-mono text-[11px] text-medium-emphasis">{{ slot.end }}</span>
              </td>
              <td v-for="d in weekDays" :key="d.value" class="td-cell">
                <template v-for="entry in getCell(d.value, slot.start, slot.end)" :key="entry.id">
                  <div
                    class="cell-chip"
                    :style="{ borderLeftColor: subjectColor(entry.subjectId) }"
                    :title="'Clique para editar: ' + ctx.subjectName(entry.subjectId)"
                    @click="openEdit(entry)"
                  >
                    <span
                      class="text-[11px] font-semibold leading-tight block truncate"
                      :style="{ color: subjectColor(entry.subjectId) }"
                    >
                      {{ ctx.subjectName(entry.subjectId) }}
                    </span>
                    <span class="text-[10px] text-medium-emphasis leading-tight block truncate">
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
      <v-form class="flex flex-wrap gap-3 items-end" @submit.prevent="ctx.addQuickStudySession">
        <v-select
          v-model="ctx.quickStudy.subjectId"
          :items="ctx.state.subjects"
          item-title="name"
          item-value="id"
          label="Matéria"
          variant="outlined"
          density="comfortable"
          bg-color="transparent"
          color="primary"
          class="min-w-[200px] flex-1"
        />
        <v-text-field
          v-model.number="ctx.quickStudy.minutes"
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

  </section>

  <!-- Edit Timetable Dialog -->
  <v-dialog v-model="editDialog" max-width="480" persistent>
    <v-card rounded="xl" class="pa-2">
      <v-card-title class="text-base font-bold pt-4 px-4 pb-1">Editar Horário</v-card-title>
      <v-card-text class="px-4 pt-2" v-if="editEntry">
        <div class="grid gap-3">
          <v-select
            v-model="editEntry.subjectId"
            :items="ctx.state.subjects"
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
            :items="ctx.dayOptions"
            item-title="label"
            item-value="value"
            label="Dia"
            variant="outlined"
            density="comfortable"
            color="primary"
            bg-color="transparent"
          />
          <div class="flex gap-3">
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
import { ref } from 'vue';

const props = defineProps({
  ctx: { type: Object, required: true }
});

const editDialog = ref(false);
const editEntry = ref(null);

function openEdit(entry) {
  editEntry.value = { ...entry };
  editDialog.value = true;
}

function saveEdit() {
  if (!editEntry.value) return;
  const idx = props.ctx.state.timetable.findIndex(e => e.id === editEntry.value.id);
  if (idx !== -1) {
    Object.assign(props.ctx.state.timetable[idx], editEntry.value);
    props.ctx.persistState();
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

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getCell(day, slotStart, slotEnd) {
  const sStart = toMin(slotStart);
  const sEnd   = toMin(slotEnd);
  return (props.ctx.state.timetable || []).filter(entry => {
    if (entry.day !== day) return false;
    const eStart = toMin(entry.start);
    const eEnd   = toMin(entry.end);
    return eStart <= sStart && eEnd >= sEnd;
  });
}

function subjectColor(subjectId) {
  const sub = (props.ctx.state.subjects || []).find(s => s.id === subjectId);
  return sub?.color || '#8C5E43';
}

function professorName(subjectId) {
  const sub = (props.ctx.state.subjects || []).find(s => s.id === subjectId);
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
</style>
