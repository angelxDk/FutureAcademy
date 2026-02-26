<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-gold-500">Pomodoro</h2>
        <p class="text-sm text-gray-400">Mantenha a produtividade com blocos de tempo</p>
      </div>

      <v-row>
        <v-col cols="12" lg="4">
          <div class="bg-dark-700 bg-opacity-40 rounded-2xl p-8 text-center border border-dark-600 border-opacity-50">
            <p class="text-xs uppercase tracking-wider text-gold-600 font-semibold mb-2">{{ ctx.pomodoro.modeLabel }}</p>
            <h3 class="text-6xl font-bold text-white tracking-tight tabular-nums">{{ ctx.pomodoroDisplay }}</h3>
          </div>
          <div class="flex flex-wrap gap-3 mt-5 justify-center">
            <v-btn color="accent" @click="ctx.startPomodoro" height="44" class="font-semibold rounded-lg px-6">Iniciar</v-btn>
            <v-btn color="secondary" variant="outlined" @click="ctx.pausePomodoro" height="44" class="rounded-lg">Pausar</v-btn>
            <v-btn color="error" variant="outlined" @click="ctx.resetPomodoro" height="44" class="rounded-lg">Resetar</v-btn>
          </div>
        </v-col>

        <v-col cols="12" lg="8">
          <v-form @submit.prevent="ctx.savePomodoroSettings" class="bg-dark-800 bg-opacity-30 rounded-2xl p-6 border border-dark-600 border-opacity-30">
            <p class="text-sm font-semibold text-gold-500 mb-4 uppercase tracking-wider">Configurações</p>
            <v-row>
              <v-col cols="6" md="3"><v-text-field v-model.number="ctx.pomodoroConfig.work" type="number" min="1" label="Foco" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="ctx.pomodoroConfig.shortBreak" type="number" min="1" label="Pausa curta" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="ctx.pomodoroConfig.longBreak" type="number" min="1" label="Pausa longa" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="ctx.pomodoroConfig.cycles" type="number" min="1" label="Ciclos" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              
              <v-col cols="12" class="mt-2">
                <v-select v-model="ctx.pomodoroConfig.subjectId" :items="ctx.state.subjects" item-title="name" item-value="id" label="Matéria vinculada" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
              </v-col>
              
              <v-col cols="12" class="mt-2 flex justify-end">
                <v-btn type="submit" color="primary" height="44" class="font-semibold px-6">Salvar configuração</v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>
      </v-row>
    </div>
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
