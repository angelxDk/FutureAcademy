<template>
  <section class="grid gap-6">
    <div class="glass-card p-6">
      <div class="mb-6">
        <h2 class="text-xl font-bold" style="color: rgb(var(--gold-500))">Pomodoro</h2>
        <p class="text-sm text-gray-400">Mantenha a produtividade com blocos de tempo</p>
      </div>

      <v-row>
        <v-col cols="12" lg="4">
          <div class="pomodoro-timer-box text-center">
            <p class="text-xs uppercase tracking-wider mb-2" style="color: rgb(var(--gold-600))">{{ pomodoroStore.runner.modeLabel }}</p>
            <h3 class="text-6xl font-bold tracking-tight tabular-nums">{{ pomodoroDisplay }}</h3>
          </div>
          <div class="flex flex-wrap gap-3 mt-5 justify-center">
            <v-btn color="accent" @click="pomodoroStore.startPomodoro()" height="44" class="font-semibold">Iniciar</v-btn>
            <v-btn color="secondary" variant="outlined" @click="pomodoroStore.pausePomodoro()" height="44">Pausar</v-btn>
            <v-btn color="error" variant="outlined" @click="pomodoroStore.resetPomodoro()" height="44">Resetar</v-btn>
          </div>
        </v-col>

        <v-col cols="12" lg="8">
          <v-form @submit.prevent="savePomodoroSettings" class="pomodoro-settings-box">
            <p class="text-sm font-semibold mb-4 uppercase tracking-wider" style="color: rgb(var(--gold-500))">Configurações</p>
            <v-row>
              <v-col cols="6" md="3"><v-text-field v-model.number="pomodoroStore.pomodoro.work" type="number" min="1" label="Foco" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="pomodoroStore.pomodoro.shortBreak" type="number" min="1" label="Pausa curta" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="pomodoroStore.pomodoro.longBreak" type="number" min="1" label="Pausa longa" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              <v-col cols="6" md="3"><v-text-field v-model.number="pomodoroStore.pomodoro.cycles" type="number" min="1" label="Ciclos" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details /></v-col>
              
              <v-col cols="12" class="mt-2">
                <v-select v-model="pomodoroStore.pomodoro.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria vinculada" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
              </v-col>
              
              <v-col cols="12" class="mt-2 d-flex justify-end">
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
import { computed } from 'vue';
import { usePomodoroStore } from '../stores/usePomodoroStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';

const pomodoroStore = usePomodoroStore();
const subjectsStore = useSubjectsStore();
const syncStore = useSyncStore();
const appStore = useAppStore();

const pomodoroDisplay = computed(() => {
  const m = Math.floor(pomodoroStore.runner.secondsRemaining / 60).toString().padStart(2, '0');
  const s = (pomodoroStore.runner.secondsRemaining % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const savePomodoroSettings = () => {
  syncStore.persistState();
  appStore.showToast('Configurações Pomodoro salvas.');
  if (!pomodoroStore.runner.running) {
    pomodoroStore.resetPomodoro();
  }
};
</script>

<style scoped>
.pomodoro-timer-box {
  background: rgba(var(--dark-700), 0.4);
  border: 1px solid rgba(var(--dark-600), 0.5);
  border-radius: 16px;
  padding: 32px;
}

.pomodoro-settings-box {
  background: rgba(var(--dark-800), 0.3);
  border: 1px solid rgba(var(--dark-600), 0.3);
  border-radius: 16px;
  padding: 24px;
}
</style>
