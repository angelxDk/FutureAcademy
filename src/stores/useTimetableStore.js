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
        addTimetable(payload, editId = '') {
            if (!payload.subjectId || !Number.isInteger(Number(payload.day)) || Number(payload.day) < 0 || Number(payload.day) > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.end || '') || payload.end <= payload.start) {
                useAppStore().showToast('Selecione a disciplina e um horário final posterior ao início.'); return false;
            }
            const overlap = this.timetable.some(item => item.id !== editId && Number(item.day) === Number(payload.day) && item.start < payload.end && item.end > payload.start);
            if (overlap) { useAppStore().showToast('Já existe uma aula neste intervalo. Ajuste os horários.'); return false; }
            if (editId) { this.updateTimetable(editId, payload); return true; }
            this.timetable.push({ ...payload, id: uid() });
            useAppStore().showToast('Horário adicionado.');
            return true;
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
