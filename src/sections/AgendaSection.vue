<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Agenda</h2>
      <p class="text-sm text-medium-emphasis mb-5">Eventos e prazos dos seus trabalhos, reunidos em um só lugar.</p>
      <v-form @submit.prevent="submitEvent">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="eventForm.title" label="Título" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="eventForm.type" :items="['prova', 'trabalho', 'aula', 'lembrete']" label="Tipo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="eventForm.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="eventForm.date" label="Data" type="date" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="6" md="1">
            <v-text-field v-model="eventForm.time" label="Hora" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="9">
            <v-text-field v-model.trim="eventForm.details" label="Detalhes" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model.number="eventForm.notifyMinutes" label="Lembrete (min)" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12">
            <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Salvar evento</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <div class="glass-card p-6">
      <div class="section-heading"><h2 class="text-xl">Linha do tempo</h2><v-switch v-model="showPast" label="Incluir anteriores" color="primary" hide-details density="compact" /></div>
      <p v-if="!timeline.length" class="empty-copy">Nenhum compromisso neste período. Adicione um evento ou defina o prazo de um trabalho.</p>
      <div v-for="item in timeline" :key="item.key" class="academic-row">
        <div class="calendar-tile"><strong>{{ Number(item.date.slice(8)) }}</strong><small>{{ new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }) }}</small></div>
        <div class="academic-row__body"><strong>{{ item.title }}</strong><span>{{ subjectName(item.subjectId) }} · {{ item.source === 'record' ? 'Entrega de trabalho' : item.time }}</span></div>
        <v-btn v-if="item.source === 'record'" :to="{ name: 'records', query: { edit: item.id } }" color="primary" variant="tonal" size="small">Abrir trabalho</v-btn>
        <v-btn v-else size="small" variant="text" color="error" @click="removeEvent(item.id)">Remover</v-btn>
      </div>
    </div>

  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAgendaStore } from '../stores/useAgendaStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useAppStore } from '../stores/useAppStore';
import { uid } from '../utils/helpers';
import { todayISO, nowTimeISO } from '../utils/date';
import { useDebouncedPersist } from '../composables/useDebouncedPersist';

import { useRecordsStore } from '../stores/useRecordsStore';
import { academicTimeline, dayKey } from '../utils/academic';
const recordsStore = useRecordsStore();
const showPast = ref(false);
const timeline = computed(() => academicTimeline(agendaStore.events, recordsStore.records).filter(item => showPast.value || item.date >= dayKey()));

const agendaStore = useAgendaStore();
const subjectsStore = useSubjectsStore();
const appStore = useAppStore();
const persist = useDebouncedPersist(500);

const createEventForm = () => ({
  title: '',
  type: 'prova',
  subjectId: '',
  date: todayISO(),
  time: nowTimeISO(),
  details: '',
  notifyMinutes: 30
});

const eventForm = ref(createEventForm());

const submitEvent = () => {
  if (!eventForm.value.title || !eventForm.value.date || !eventForm.value.time) {
    appStore.showToast('Preencha título, data e horário do evento.');
    return;
  }
  agendaStore.addEvent({
    ...eventForm.value,
    createdAt: new Date().toISOString()
  });
  persist();
  eventForm.value = createEventForm();
};

const removeEvent = (id) => {
  agendaStore.removeEvent(id);
  persist();
};

const subjectName = (id) => {
  return subjectsStore.subjects.find(s => s.id === id)?.name || 'Sem matéria';
};

const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : isoStr;
};
</script>
