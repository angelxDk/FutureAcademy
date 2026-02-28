import { defineStore } from 'pinia';
import { useAppStore } from './useAppStore';

export const useCommunitiesStore = defineStore('communities', {
    state: () => ({
        communities: []
    }),
    getters: {
        orderedCommunities: (state) => {
            return [...state.communities].sort((a, b) => {
                const aDate = new Date(a.createdAt || 0).getTime();
                const bDate = new Date(b.createdAt || 0).getTime();
                if (aDate !== bDate) return bDate - aDate;
                return (a.name || '').localeCompare(b.name || '');
            });
        }
    },
    actions: {
        addCommunity(payload) {
            this.communities.push(payload);
            useAppStore().showToast('Comunidade criada.');
        },
        removeCommunity(id) {
            this.communities = this.communities.filter((c) => c.id !== id);
            useAppStore().showToast('Comunidade removida.');
        },
        updateCommunity(id, payload) {
            const target = this.communities.find((c) => c.id === id);
            if (target) {
                Object.assign(target, payload);
            }
        }
    }
});
