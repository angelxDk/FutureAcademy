import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        settings: {
            theme: 'dark',
            notificationsEnabled: false,
            integrations: { openAiModel: 'gpt-4o-mini' }
        },
        profile: {
            name: '',
            email: '',
            course: '',
            photo: ''
        }
    }),
    actions: {
        updateProfile(payload) {
            Object.assign(this.profile, payload);
        },
        updateSettings(payload) {
            Object.assign(this.settings, payload);
        }
    }
});
