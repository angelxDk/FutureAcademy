import {
    WEATHER_CODE_LABELS,
    SUBJECT_FORM_DEFAULTS,
    TIMETABLE_FORM_DEFAULTS,
    RECORD_FORM_DEFAULTS
} from './constants';
import { todayISO } from './date';

export function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function weatherCodeLabel(code) {
    const n = safeNumber(code, NaN);
    if (!Number.isFinite(n)) return 'condições variáveis';
    return WEATHER_CODE_LABELS[n] || 'condições variáveis';
}

export function buildCommunityWelcomeMessage(communityName) {
    const name = String(communityName || 'comunidade').trim();
    return [
        {
            id: uid(),
            role: 'assistant',
            source: 'system',
            text: `Chat da comunidade "${name}" pronto. Use /ajuda para ver os comandos de APIs.`,
            createdAt: new Date().toISOString()
        }
    ];
}

export function normalizeCommunityMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') return null;
    const role =
        rawMessage.role === 'user' || rawMessage.role === 'assistant' || rawMessage.role === 'system'
            ? rawMessage.role
            : 'assistant';
    const text = String(rawMessage.text || '').trim();
    if (!text) return null;
    return {
        id: rawMessage.id || uid(),
        role,
        source: rawMessage.source || 'chat',
        text,
        createdAt: rawMessage.createdAt || new Date().toISOString()
    };
}

export function normalizeCommunity(rawCommunity) {
    const community =
        rawCommunity && typeof rawCommunity === 'object' ? rawCommunity : {};
    const normalizedMessages = Array.isArray(community.messages)
        ? community.messages.map((message) => normalizeCommunityMessage(message)).filter(Boolean)
        : [];

    if (!normalizedMessages.length) {
        normalizedMessages.push(...buildCommunityWelcomeMessage(community.name));
    }

    return {
        ...community,
        id: community.id || uid(),
        name: String(community.name || 'Comunidade de estudos').trim(),
        description: String(community.description || '').trim(),
        members: Array.isArray(community.members)
            ? community.members.map((email) => String(email).trim()).filter(Boolean)
            : [],
        messages: normalizedMessages,
        createdAt: community.createdAt || new Date().toISOString()
    };
}

export function createSubjectForm(overrides = {}) {
    return {
        ...SUBJECT_FORM_DEFAULTS,
        ...overrides
    };
}

export function createTimetableForm(overrides = {}) {
    return {
        ...TIMETABLE_FORM_DEFAULTS,
        ...overrides
    };
}

export function createRecordForm(overrides = {}) {
    return {
        ...RECORD_FORM_DEFAULTS,
        dueDate: todayISO(),
        ...overrides
    };
}
