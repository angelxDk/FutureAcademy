import { defineStore } from 'pinia';
import { uid } from '../utils/helpers';
import { useAppStore } from './useAppStore';

export const useSubjectsStore = defineStore('subjects', {
    state: () => ({
        subjects: []
    }),
    actions: {
        addSubject(payload) {
            this.subjects.push({ id: uid(), ...payload });
            useAppStore().showToast('Matéria cadastrada.');
        },
        updateSubject(id, payload) {
            const target = this.subjects.find((s) => s.id === id);
            if (target) {
                Object.assign(target, payload);
                useAppStore().showToast('Matéria atualizada.');
            }
        },
        removeSubject(id) {
            this.subjects = this.subjects.filter((s) => s.id !== id);
        }
    }
});
