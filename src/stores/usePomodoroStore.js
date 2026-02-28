import { defineStore } from 'pinia';
import { uid } from '../utils/helpers';
import { useAppStore } from './useAppStore';
import { useSyncStore } from './useSyncStore';

export const usePomodoroStore = defineStore('pomodoro', {
    state: () => ({
        pomodoro: {
            work: 25,
            shortBreak: 5,
            longBreak: 15,
            cycles: 4,
            subjectId: ''
        },
        studySessions: [],

        // Timer Engine state (not persisted)
        runner: {
            mode: 'focus', // 'focus' | 'break'
            modeLabel: 'Foco',
            running: false,
            secondsRemaining: 25 * 60,
            completedFocusCycles: 0,
            intervalId: null
        }
    }),
    actions: {
        resetPomodoro() {
            this.pausePomodoro();
            this.runner.mode = 'focus';
            this.runner.modeLabel = 'Foco';
            this.runner.secondsRemaining = this.pomodoro.work * 60;
            this.runner.completedFocusCycles = 0;
        },
        startPomodoro() {
            if (this.runner.running) return;
            this.runner.running = true;
            this.runner.intervalId = setInterval(() => {
                if (this.runner.secondsRemaining > 0) {
                    this.runner.secondsRemaining -= 1;
                } else {
                    this.handlePomodoroCycleEnd();
                }
            }, 1000);
        },
        pausePomodoro() {
            this.runner.running = false;
            if (this.runner.intervalId) {
                clearInterval(this.runner.intervalId);
                this.runner.intervalId = null;
            }
        },
        _triggerNotification(title, body) {
            // This refers back to the general settings, checking permissions briefly. 
            // Safest to just defer to a central sync/notification layer, or invoke native browser directly.
            if ('Notification' in window && Notification.permission === 'granted') {
                // Assuming userSettings allow notifications (we can check from userStore if needed)
                new Notification(title, { body });
            } else {
                useAppStore().showToast(`${title}: ${body}`);
            }
        },
        handlePomodoroCycleEnd() {
            if (this.runner.mode === 'focus') {
                this.runner.completedFocusCycles += 1;

                // Log study session
                if (this.pomodoro.subjectId) {
                    this.studySessions.push({
                        id: uid(),
                        subjectId: this.pomodoro.subjectId,
                        minutes: this.pomodoro.work,
                        source: 'pomodoro',
                        createdAt: new Date().toISOString()
                    });
                    const syncStore = useSyncStore();
                    if (syncStore) syncStore.persistState(); // trigger autosave
                }

                const useLongBreak = this.runner.completedFocusCycles % this.pomodoro.cycles === 0;
                this.runner.mode = 'break';
                this.runner.modeLabel = useLongBreak ? 'Pausa longa' : 'Pausa curta';
                this.runner.secondsRemaining = (useLongBreak ? this.pomodoro.longBreak : this.pomodoro.shortBreak) * 60;
                this._triggerNotification('Pomodoro', useLongBreak ? 'Ciclo completo. Hora da pausa longa.' : 'Sessão concluída. Faça uma pausa curta.');
            } else {
                this.runner.mode = 'focus';
                this.runner.modeLabel = 'Foco';
                this.runner.secondsRemaining = this.pomodoro.work * 60;
                this._triggerNotification('Pomodoro', 'Pausa finalizada. Volte para o foco.');
            }
        }
    }
});
