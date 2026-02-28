import { defineStore } from 'pinia';
import { uid } from '../utils/helpers';
import { useAppStore } from './useAppStore';

export const useTimetableStore = defineStore('timetable', {
    state: () => ({
        timetable: []
    }),
    getters: {
        orderedTimetable: (state) => {
            return [...state.timetable].sort((a, b) => {
                if (a.day !== b.day) return a.day - b.day;
                return (a.start || '00:00').localeCompare(b.start || '00:00');
            });
        }
    },
    actions: {
        addTimetable(payload) {
            this.timetable.push({ id: uid(), ...payload });
            useAppStore().showToast('Horário adicionado.');
        },
        updateTimetable(id, payload) {
            const target = this.timetable.find((t) => t.id === id);
            if (target) {
                Object.assign(target, payload);
                useAppStore().showToast('Horário atualizado.');
            }
        },
        removeTimetable(id) {
            this.timetable = this.timetable.filter((t) => t.id !== id);
            useAppStore().showToast('Horário removido.');
        }
    }
});
