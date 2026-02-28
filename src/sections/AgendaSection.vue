<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Agenda</h2>
      <p class="text-sm text-medium-emphasis mb-5">Organize seus eventos e compromissos</p>
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

    <v-row>
      <v-col v-for="event in agendaStore.orderedEvents" :key="event.id" cols="12" sm="6" lg="4">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-bold text-high-emphasis mb-2">{{ event.title }}</h3>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Tipo</span> {{ event.type }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Matéria</span> {{ subjectName(event.subjectId) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Quando</span> {{ formatDate(event.date) }} {{ event.time }}</p>
          <p class="text-sm text-medium-emphasis mb-4"><span class="font-semibold text-high-emphasis">Detalhes</span> {{ event.details || '---' }}</p>
          <v-btn size="small" color="error" variant="outlined" @click="removeEvent(event.id)">Remover</v-btn>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useAgendaStore } from '../stores/useAgendaStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { uid } from '../utils/helpers';
import { todayISO, nowTimeISO } from '../utils/date';

const agendaStore = useAgendaStore();
const subjectsStore = useSubjectsStore();
const syncStore = useSyncStore();
const appStore = useAppStore();

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
  if (!eventForm.value.title) {
    appStore.showToast('Preencha o título do evento.');
    return;
  }
  agendaStore.addEvent({
    ...eventForm.value,
    createdAt: new Date().toISOString()
  });
  syncStore.persistState();
  eventForm.value = createEventForm();
};

const removeEvent = (id) => {
  agendaStore.removeEvent(id);
  syncStore.persistState();
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
