<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <h2 class="text-xl font-bold text-primary mb-1">Agenda</h2>
      <p class="text-sm text-medium-emphasis mb-5">Organize seus eventos e compromissos</p>
      <v-form @submit.prevent="ctx.addEvent">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model.trim="ctx.eventForm.title" label="Título" variant="outlined" density="comfortable" bg-color="transparent" color="primary" required />
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="ctx.eventForm.type" :items="['prova', 'trabalho', 'aula', 'lembrete']" label="Tipo" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="ctx.eventForm.subjectId" :items="ctx.state.subjects" item-title="name" item-value="id" label="Matéria" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="ctx.eventForm.date" label="Data" type="date" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="6" md="1">
            <v-text-field v-model="ctx.eventForm.time" label="Hora" type="time" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="9">
            <v-text-field v-model.trim="ctx.eventForm.details" label="Detalhes" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model.number="ctx.eventForm.notifyMinutes" label="Lembrete (min)" type="number" min="0" variant="outlined" density="comfortable" bg-color="transparent" color="primary" />
          </v-col>
          <v-col cols="12">
            <v-btn type="submit" color="primary" variant="flat" height="44" class="font-semibold">Salvar evento</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </div>

    <v-row>
      <v-col v-for="event in ctx.orderedEvents" :key="event.id" cols="12" sm="6" lg="4">
        <div class="glass-card p-5" style="height: 100%">
          <h3 class="text-base font-bold text-high-emphasis mb-2">{{ event.title }}</h3>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Tipo</span> {{ event.type }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Matéria</span> {{ ctx.subjectName(event.subjectId) }}</p>
          <p class="text-sm text-medium-emphasis mb-1"><span class="font-semibold text-high-emphasis">Quando</span> {{ ctx.formatDate(event.date) }} {{ event.time }}</p>
          <p class="text-sm text-medium-emphasis mb-4"><span class="font-semibold text-high-emphasis">Detalhes</span> {{ event.details || '---' }}</p>
          <v-btn size="small" color="error" variant="outlined" @click="ctx.removeEvent(event.id)">Remover</v-btn>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script setup>
defineProps({
  ctx: {
    type: Object,
    required: true
  }
});
</script>
