import { defineStore } from 'pinia';
import { useAppStore } from './useAppStore';
import { uid } from '../utils/helpers';
import { parseDateTime } from '../utils/date';

export const useAgendaStore = defineStore('agenda', {
    state: () => ({
        events: []
    }),
    getters: {
        orderedEvents: (state) => {
            return [...state.events].sort((a, b) => {
                const dateA = parseDateTime(a.date, a.time)?.getTime() ?? 0;
                const dateB = parseDateTime(b.date, b.time)?.getTime() ?? 0;
                return dateA - dateB;
            });
        }
    },
    actions: {
        addEvent(payload) {
            this.events.push({ id: uid(), ...payload });
            useAppStore().showToast('Evento agendado.');
        },
        updateEvent(id, payload) {
            const target = this.events.find((e) => e.id === id);
            if (target) {
                Object.assign(target, payload);
                useAppStore().showToast('Evento atualizado.');
            }
        },
        removeEvent(id) {
            this.events = this.events.filter((e) => e.id !== id);
            useAppStore().showToast('Evento removido.');
        }
    }
});
