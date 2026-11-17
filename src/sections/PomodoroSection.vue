<template>
  <section class="grid gap-6 pomodoro-section" :class="{ 'pomodoro-section--desk': workspace.deskMode }">
    <div class="glass-card p-6">
      <div class="mb-6 pomodoro-intro">
        <h2 class="text-xl font-bold" style="color: rgb(var(--gold-500))">Pomodoro</h2>
        <p class="text-sm text-gray-400">Mantenha a produtividade com blocos de tempo</p>
      </div>

      <div class="pomodoro-layout">
        <div class="pomodoro-controls">
          <div class="pomodoro-timer-box text-center">
            <p class="pomodoro-mode">{{ pomodoroStore.runner.modeLabel }}</p>
            <h3 class="pomodoro-display" aria-live="off" aria-label="Tempo restante">{{ pomodoroDisplay }}</h3>
          </div>
          <div class="pomodoro-actions">
            <v-btn color="primary" :disabled="pomodoroStore.runner.running" @click="pomodoroStore.startPomodoro()" height="44" class="font-semibold">Iniciar</v-btn>
            <v-btn color="primary" variant="outlined" :disabled="!pomodoroStore.runner.running" @click="pomodoroStore.pausePomodoro()" height="44">Pausar</v-btn>
            <v-btn variant="text" @click="pomodoroStore.resetPomodoro()" height="44">Reiniciar</v-btn>
          </div>
        </div>

        <details class="pomodoro-configuration" :open="!workspace.deskMode">
          <summary>Configurações <span>{{ pomodoroStore.pomodoro.work }} min de foco · {{ pomodoroStore.pomodoro.shortBreak }} min de pausa</span></summary>
          <v-form @submit.prevent="savePomodoroSettings" class="pomodoro-settings-box">
            <div class="pomodoro-fields">
              <v-text-field v-model.number="pomodoroStore.pomodoro.work" type="number" min="1" label="Foco (min)" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
              <v-text-field v-model.number="pomodoroStore.pomodoro.shortBreak" type="number" min="1" label="Pausa curta (min)" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
              <v-text-field v-model.number="pomodoroStore.pomodoro.longBreak" type="number" min="1" label="Pausa longa (min)" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
              <v-text-field v-model.number="pomodoroStore.pomodoro.cycles" type="number" min="1" label="Ciclos" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
            </div>
            <v-select v-model="pomodoroStore.pomodoro.subjectId" :items="subjectsStore.subjects" item-title="name" item-value="id" label="Matéria vinculada" variant="outlined" bg-color="transparent" color="primary" density="comfortable" hide-details />
            <v-btn type="submit" color="primary" height="44" class="font-semibold">Salvar configuração</v-btn>
          </v-form>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { usePomodoroStore } from '../stores/usePomodoroStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useSyncStore } from '../stores/useSyncStore';
import { useAppStore } from '../stores/useAppStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

const pomodoroStore = usePomodoroStore();
const subjectsStore = useSubjectsStore();
const syncStore = useSyncStore();
const appStore = useAppStore();
const workspace = useWorkspaceStore();

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
.pomodoro-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 24px;
  align-items: start;
}
.pomodoro-controls { min-width: 0; }
.pomodoro-timer-box {
  background: var(--app-bg);
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 28px 16px;
}
.pomodoro-mode { margin-bottom: 8px; color: rgb(var(--gold-500)); font-size: 13px; font-weight: 650; }
.pomodoro-display { font-size: clamp(3rem, 6vw, 4.5rem); line-height: 1.15; font-weight: 750; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
.pomodoro-actions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 16px; }
.pomodoro-actions .v-btn { min-width: 0; padding-inline: 8px; letter-spacing: 0; text-transform: none; }
.pomodoro-configuration { min-width: 0; border: 1px solid var(--surface-border); border-radius: 14px; }
.pomodoro-configuration > summary { cursor: pointer; padding: 16px 18px; color: var(--app-text); font-size: 14px; font-weight: 650; line-height: 1.6; }
.pomodoro-configuration > summary span { display: block; margin-top: 3px; color: var(--app-muted); font-size: 12px; font-weight: 500; }
.pomodoro-settings-box {
  display: grid;
  gap: 16px;
  padding: 4px 18px 18px;
}
.pomodoro-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
.pomodoro-section--desk .pomodoro-intro { display: none; }
.pomodoro-section--desk .pomodoro-layout { grid-template-columns: minmax(0,1fr); gap: 20px; }
.pomodoro-section--desk .pomodoro-fields { grid-template-columns: minmax(0,1fr); }
.pomodoro-section--desk .pomodoro-display { font-size: 4rem; }
@container(max-width:800px) { .pomodoro-layout { grid-template-columns: minmax(0,1fr); } }
@container(max-width:380px) { .pomodoro-fields { grid-template-columns: minmax(0,1fr); } .pomodoro-display,.pomodoro-section--desk .pomodoro-display { font-size: 3.25rem; } }
@media(max-width:760px) { .pomodoro-layout,.pomodoro-fields { grid-template-columns: minmax(0,1fr); } }
</style>
