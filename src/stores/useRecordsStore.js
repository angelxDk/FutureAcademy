import { defineStore } from 'pinia';
import { uid } from '../utils/helpers';
import { useAppStore } from './useAppStore';

export const useRecordsStore = defineStore('records', {
    state: () => ({
        records: [],
        draft: null,
        drafts: {}
    }),
    getters: {
        orderedRecords: (state) => {
            return [...state.records].sort((a, b) => {
                return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
            });
        }
    },
    actions: {
        addRecord(payload) {
            this.records.push({ id: uid(), ...payload });
            useAppStore().showToast('Trabalho adicionado.');
        },
        updateRecord(id, payload) {
            const target = this.records.find((r) => r.id === id);
            if (target) {
                Object.assign(target, payload);
                useAppStore().showToast('Trabalho atualizado.');
            }
        },
        removeRecord(id) {
            this.records = this.records.filter((r) => r.id !== id);
            useAppStore().showToast('Trabalho removido.');
        }
    }
});
