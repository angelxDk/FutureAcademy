import { defineStore } from 'pinia';
import { CURATED_FOCUS_PLAYLISTS, FOCUS_VISUAL_PRESETS } from '../utils/constants';

export const useAppStore = defineStore('app', {
    state: () => ({
        dashChartRange: 'all',

        toast: { visible: false, message: '' },
        toastTimeout: null,

        // Focus & Music transient state
        focusPlayer: {
            visible: false,
            collapsed: false
        },
        focusPlaylists: CURATED_FOCUS_PLAYLISTS.map((playlist) => ({
            ...playlist,
            tags: [...playlist.tags]
        })),
        activePlaylistIndex: 0,
        customPlaylistUrl: '',
        focusVisualPreset: 'focus',
        focusVisualPresets: FOCUS_VISUAL_PRESETS,

        // UI forms/states
        timetableImport: {
            busy: false,
            status: '',
            rawText: '',
            parsed: [],
            newSubjects: []
        },
        communityChat: {
            selectedCommunityId: '',
            message: '',
            busy: false
        },
        assistant: {
            question: '',
            answerLines: [
                'Faça uma pergunta para receber um plano de ação com foco em boas práticas acadêmicas.',
                'As recomendações utilizam uma base local de fontes oficiais previamente indexadas.'
            ]
        },
        subjectForm: null,
        subjectEditId: '',
        timetableForm: null,
        timetableEditId: '',
        eventForm: null,
        recordForm: null,
        recordEditId: '',
        recordEditorHtml: '<p></p>',
        quickStudy: {
            subjectId: '',
            minutes: 25
        },
        communityForm: {
            name: '',
            description: '',
            emails: ''
        },
        profileForm: {
            name: '',
            email: '',
            course: '',
            photo: ''
        },
        pomodoroConfig: {
            work: 25,
            shortBreak: 5,
            longBreak: 15,
            cycles: 4,
            subjectId: ''
        },
    }),

    actions: {
        showToast(message) {
            this.toast.message = message;
            this.toast.visible = true;
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
            }
            this.toastTimeout = setTimeout(() => {
                this.toast.visible = false;
            }, 2600);
        },

        prefillCommunityCommand(command) {
            this.communityChat.message = command;
        },

        selectCommunity(communityId) {
            this.communityChat.selectedCommunityId = communityId;
        },

        setFocusVisualPreset(preset) {
            const found = this.focusVisualPresets.find((item) => item.value === preset);
            if (!found) return;
            this.focusVisualPreset = found.value;
            this.showToast(`Visual 3D em modo "${found.label}".`);
        }
    }
});
