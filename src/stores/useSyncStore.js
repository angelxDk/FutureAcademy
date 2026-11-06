import { defineStore } from 'pinia';
import { loadUserData, saveUserData } from '../firebase';
import { useAppStore } from './useAppStore';
import { parseDateTime } from '../utils/date';
import { safeNumber, normalizeCommunity } from '../utils/helpers';
import { REMINDER_WINDOW_MS } from '../utils/constants';

// Sub-stores to sync
import { useSubjectsStore } from './useSubjectsStore';
import { useTimetableStore } from './useTimetableStore';
import { useRecordsStore } from './useRecordsStore';
import { useAgendaStore } from './useAgendaStore';
import { usePomodoroStore } from './usePomodoroStore';
import { useCommunitiesStore } from './useCommunitiesStore';
import { useUserStore } from './useUserStore';

import { useSoundStore } from './useSoundStore';
import { useAssistantStore } from './useAssistantStore';
import { useWorkspaceStore } from './useWorkspaceStore';

const LS_KEY = (uid) => `fa_state_${uid}`;

function defaultStateSnapshot() {
    return {
        savedAt: 0,
        settings: { theme: 'dark', notificationsEnabled: false, integrations: { openAiModel: 'gpt-4o-mini' } },
        profile: { name: '', email: '', course: '', photo: '' },
        focusPlayer: { visible: true, collapsed: false },
        subjects: [],
        timetable: [],
        events: [],
        records: [],
        recordDraft: null,
        recordDrafts: {},
        workspace: null,
        studyAssistant: null,
        studySessions: [],
        communities: [],
        pomodoro: { work: 25, shortBreak: 5, longBreak: 15, cycles: 4, subjectId: '' }
    };
}

// Orchestrator Store
export const useSyncStore = defineStore('sync', {
    state: () => ({
        _currentUid: '',
        _persistTimeout: null,
        _reminderDebounceTimer: null,
        _isHydrated: false,
        reminderTimeouts: []
    }),
    actions: {
        // 1. Gather fragmented stores into a single object representation efficiently
        captureState() {
            const userStore = useUserStore();
            const appStore = useAppStore();
            const subjectsStore = useSubjectsStore();
            const timetableStore = useTimetableStore();
            const recordsStore = useRecordsStore();
            const agendaStore = useAgendaStore();
            const pomodoroStore = usePomodoroStore();
            const communitiesStore = useCommunitiesStore();

            // Faster than JSON.stringify/parse and robust against uninitialized state
            return {
                studyAssistant: { messages: useAssistantStore().messages.map(m => ({ ...m })), question: useAssistantStore().question },
                workspace: useWorkspaceStore().snapshot(),
                savedAt: Date.now(), // timestamp de conflito para stale-while-revalidate
                settings: userStore.settings ? { ...userStore.settings, integrations: { ...userStore.settings.integrations } } : null,
                profile: userStore.profile ? { ...userStore.profile } : null,
                focusPlayer: {
                    visible: !!appStore.focusPlayer?.visible,
                    collapsed: !!appStore.focusPlayer?.collapsed
                },
                subjects: (subjectsStore.subjects || []).map(s => ({ ...s })),
                timetable: (timetableStore.timetable || []).map(t => ({ ...t })),
                events: (agendaStore.events || []).map(e => ({ ...e })),
                recordDrafts: JSON.parse(JSON.stringify(recordsStore.drafts)),
                recordDraft: recordsStore.draft ? { ...recordsStore.draft, form: { ...recordsStore.draft.form } } : null,
                records: (recordsStore.records || []).map(r => ({ ...r })),
                studySessions: (pomodoroStore.studySessions || []).map(s => ({ ...s })),
                communities: (communitiesStore.communities || []).map(c => JSON.parse(JSON.stringify(c))),
                pomodoro: pomodoroStore.pomodoro ? { ...pomodoroStore.pomodoro } : null
            };
        },

        // 2. Hydrate specific stores from a loaded snapshot
        hydrateStores(snapshot) {
            const userStore = useUserStore();
            const appStore = useAppStore();
            const subjectsStore = useSubjectsStore();
            const timetableStore = useTimetableStore();
            const recordsStore = useRecordsStore();
            const agendaStore = useAgendaStore();
            const pomodoroStore = usePomodoroStore();
            const communitiesStore = useCommunitiesStore();

            useWorkspaceStore().restore(snapshot?.workspace || {});
            useAssistantStore().messages = snapshot?.studyAssistant?.messages || [];
            useAssistantStore().question = snapshot?.studyAssistant?.question || '';
            const base = defaultStateSnapshot();
            const raw = snapshot || base;

            userStore.settings = { ...base.settings, ...(raw.settings || {}) };
            userStore.settings.integrations = { ...base.settings.integrations, ...(raw.settings?.integrations || {}) };
            userStore.profile = { ...base.profile, ...(raw.profile || {}) };

            if (raw.focusPlayer) {
                appStore.focusPlayer.visible = !!raw.focusPlayer.visible;
                appStore.focusPlayer.collapsed = !!raw.focusPlayer.collapsed;
            }

            pomodoroStore.pomodoro = { ...base.pomodoro, ...(raw.pomodoro || {}) };
            subjectsStore.subjects = Array.isArray(raw.subjects) ? raw.subjects : [];
            timetableStore.timetable = Array.isArray(raw.timetable) ? raw.timetable : [];
            agendaStore.events = Array.isArray(raw.events) ? raw.events : [];
            recordsStore.draft = raw.recordDraft || null;
            recordsStore.drafts = raw.recordDrafts || {};
            recordsStore.records = Array.isArray(raw.records) ? raw.records : [];
            pomodoroStore.studySessions = Array.isArray(raw.studySessions) ? raw.studySessions : [];
            communitiesStore.communities = Array.isArray(raw.communities) ? raw.communities.map((c) => normalizeCommunity(c)) : [];
        },

        // 3. Clear data
        resetToDefault() {
            if (this._persistTimeout) clearTimeout(this._persistTimeout);
            this._persistTimeout = null;
            useSoundStore().dispose();
            useAssistantStore().resetSession();
            this.hydrateStores(defaultStateSnapshot());
            this._currentUid = '';
            this._isHydrated = false;
            this.clearReminderTimeouts();
            if (this._reminderDebounceTimer) {
                clearTimeout(this._reminderDebounceTimer);
                this._reminderDebounceTimer = null;
            }
            usePomodoroStore().pausePomodoro();
        },

        // 4. Load from DB/LS and Hydrate
        async loadStateFromFirestore(uid) {
            if (!uid) return;
            this._isHydrated = false;
            this._currentUid = uid;

            const lsFallback = () => {
                try {
                    const lsRaw = localStorage.getItem(LS_KEY(uid));
                    return lsRaw ? JSON.parse(lsRaw) : null;
                } catch { return null; }
            };

            // ── Fase 1: render instantâneo com cache do localStorage ──
            // O usuário vê os dados em ~0ms enquanto o Firestore ainda carrega.
            const cached = lsFallback();
            if (cached) {
                this.hydrateStores(cached);
                this._isHydrated = true;
            }

            // ── Fase 2: busca Firestore em background ──
            let raw = null;
            try {
                raw = await loadUserData(uid);
            } catch {
                // Firestore indisponível — mantém dados do LS já hidratados
            }

            if (this._currentUid !== uid) return;

            if (raw) {
                // ── Fase 3: só sobrescreve se Firestore tiver dados mais recentes ──
                // Protege edições feitas offline (LS mais novo que Firestore)
                const cachedAt = lsFallback()?.savedAt ?? cached?.savedAt ?? 0;
                const firestoreAt = raw?.savedAt ?? Infinity;

                if (firestoreAt >= cachedAt) {
                    this.hydrateStores(raw);
                }
            } else if (!this._isHydrated) {
                // Nenhuma fonte disponível — inicializa com defaults
                this.hydrateStores(defaultStateSnapshot());
            }

            this._isHydrated = true;
            usePomodoroStore().resetPomodoro();
            this.scheduleReminders();
        },

        // 5. Save changes from any domain store
        persistState() {
            // Guard: never save while data hasn't loaded yet
            if (!this._isHydrated || !this._currentUid) return;

            // Keep an immediate per-user recovery copy, even when leaving the page.
            try { localStorage.setItem(LS_KEY(this._currentUid), JSON.stringify(this.captureState())); } catch { }

            // --- Debounce #1 (300ms): Reminder scheduling ---
            // Reminders are cheap to schedule but must stay responsive.
            // Running more often than 300ms is wasteful (user still typing).
            if (this._reminderDebounceTimer) clearTimeout(this._reminderDebounceTimer);
            this._reminderDebounceTimer = setTimeout(() => {
                this._executeScheduleReminders();
            }, 300);

            // --- Debounce #2 (1500ms): Firebase + LocalStorage save ---
            // Longer window avoids hammering Firestore on every keystroke.
            if (this._persistTimeout) clearTimeout(this._persistTimeout);
            const ownerUid = this._currentUid;
            this._persistTimeout = setTimeout(async () => {
                this._persistTimeout = null;
                if (this._currentUid !== ownerUid || !this._isHydrated) return;
                const snapshot = this.captureState();
                try { await saveUserData(ownerUid, snapshot); } catch { }
            }, 1500);
        },

        flushPersist() {
            if (!this._isHydrated || !this._currentUid) return;

            if (this._persistTimeout) {
                clearTimeout(this._persistTimeout);
                this._persistTimeout = null;
                const snapshot = this.captureState();
                try { localStorage.setItem(LS_KEY(this._currentUid), JSON.stringify(snapshot)); } catch { }
                saveUserData(this._currentUid, snapshot).catch(() => { });
            }
        },

        // 6. Generic cross-store actions
        removeSubject(subjectId) {
            const subjectsStore = useSubjectsStore();
            const timetableStore = useTimetableStore();
            const agendaStore = useAgendaStore();
            const recordsStore = useRecordsStore();
            const pomodoroStore = usePomodoroStore();

            subjectsStore.removeSubject(subjectId);
            timetableStore.timetable = timetableStore.timetable.filter((item) => item.subjectId !== subjectId);
            agendaStore.events.forEach(item => { if (item.subjectId === subjectId) item.subjectId = ''; });
            recordsStore.records.forEach(item => { if (item.subjectId === subjectId) item.subjectId = ''; });
            if (recordsStore.draft?.form.subjectId === subjectId) recordsStore.draft.form.subjectId = '';
            Object.values(recordsStore.drafts).forEach(draft => { if (draft.form.subjectId === subjectId) draft.form.subjectId = ''; });
            pomodoroStore.studySessions.forEach(item => { if (item.subjectId === subjectId) item.subjectId = ''; });

            if (pomodoroStore.pomodoro.subjectId === subjectId) {
                pomodoroStore.pomodoro.subjectId = '';
            }
            this.persistState();
            useAppStore().showToast('Matéria removida. Seus trabalhos, eventos e estudos foram preservados.');
        },

        // Reminders
        clearReminderTimeouts() {
            this.reminderTimeouts.forEach((id) => clearTimeout(id));
            this.reminderTimeouts = [];
        },
        triggerNotification(title, body) {
            if (useUserStore().settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            } else {
                useAppStore().showToast(`${title}: ${body}`);
            }
        },
        nextOccurrenceDate(dayOfWeek, timeValue) {
            const now = new Date();
            const [hh, mm] = (timeValue || '00:00').split(':').map((part) => Number(part));
            const next = new Date(now);
            next.setHours(hh || 0, mm || 0, 0, 0);

            const dayDiff = (dayOfWeek - next.getDay() + 7) % 7;
            next.setDate(next.getDate() + dayDiff);

            if (dayDiff === 0 && next.getTime() <= now.getTime()) {
                next.setDate(next.getDate() + 7);
            }
            return next;
        },

        // Reminder scheduling (raw, non-debounced — called by _executeScheduleReminders and loadStateFromFirestore)
        scheduleReminders() {
            if (this._reminderDebounceTimer) clearTimeout(this._reminderDebounceTimer);
            this._reminderDebounceTimer = setTimeout(() => {
                this._executeScheduleReminders();
            }, 300);
        },

        _executeScheduleReminders() {
            this.clearReminderTimeouts();
            const userStore = useUserStore();
            if (!userStore.settings.notificationsEnabled) return;

            const timetableStore = useTimetableStore();
            const agendaStore = useAgendaStore();
            const subjectsStore = useSubjectsStore();
            const subjectNameMap = (id) => subjectsStore.subjects.find(s => s.id === id)?.name || 'Desconhecida';

            const now = Date.now();
            const reminders = [];

            agendaStore.events.forEach((event) => {
                const eventDate = parseDateTime(event.date, event.time);
                if (!eventDate) return;
                const remindAt = eventDate.getTime() - safeNumber(event.notifyMinutes, 0) * 60 * 1000;
                const delay = remindAt - now;
                if (delay <= 0 || delay > REMINDER_WINDOW_MS) return;

                reminders.push({
                    delay,
                    title: `Agenda: ${event.title}`,
                    body: `${subjectNameMap(event.subjectId)} às ${event.time}`
                });
            });

            const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            timetableStore.timetable.forEach((item) => {
                const nextClass = this.nextOccurrenceDate(item.day, item.start);
                const remindAt = nextClass.getTime() - safeNumber(item.notifyMinutes, 0) * 60 * 1000;
                const delay = remindAt - now;
                if (delay <= 0 || delay > REMINDER_WINDOW_MS) return;

                reminders.push({
                    delay,
                    title: `Aula: ${subjectNameMap(item.subjectId)}`,
                    body: `Começa às ${item.start} (${dayLabels[item.day] || 'Dia Indefinido'}).`
                });
            });

            reminders.forEach((item) => {
                const timeoutId = setTimeout(() => {
                    this.triggerNotification(item.title, item.body);
                }, item.delay);
                this.reminderTimeouts.push(timeoutId);
            });
        }
    }
});
