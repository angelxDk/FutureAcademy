import { defineStore } from 'pinia';
import { uid } from '../utils/helpers';
import { useAppStore } from './useAppStore';

export const useSubjectsStore = defineStore('subjects', {
    state: () => ({
        subjects: []
    }),
    actions: {
        addSubject(payload, editId = '') {
            const name = String(payload.name || '').trim();
            if (!name) { useAppStore().showToast('Informe o nome da disciplina.'); return false; }
            if (editId) {
                this.updateSubject(editId, { ...payload, name });
                return true;
            }
            this.subjects.push({ ...payload, name, id: uid() });
            useAppStore().showToast('Matéria cadastrada.');
            return true;
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
