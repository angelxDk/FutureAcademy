import { createApp, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';

const STORAGE_KEY = 'futureAcademyVueStateV1';
const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const DAY_OPTIONS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

const OFFICIAL_SOURCES = [
  {
    name: 'MEC (Ministério da Educação)',
    url: 'https://www.gov.br/mec/pt-br',
    scope: 'Políticas educacionais, diretrizes e informações oficiais'
  },
  {
    name: 'CAPES',
    url: 'https://www.gov.br/capes/pt-br',
    scope: 'Pós-graduação, bolsas e avaliação'
  },
  {
    name: 'Plataforma Sucupira (CAPES)',
    url: 'https://sucupira.capes.gov.br/',
    scope: 'Dados de programas de pós-graduação'
  },
  {
    name: 'BDTD (IBICT)',
    url: 'https://bdtd.ibict.br/vufind/',
    scope: 'Teses e dissertações brasileiras'
  },
  {
    name: 'SciELO',
    url: 'https://www.scielo.br/',
    scope: 'Artigos científicos com revisão e indexação'
  },
  {
    name: 'Portal de Periódicos CAPES',
    url: 'https://www-periodicos-capes-gov-br.ezl.periodicos.capes.gov.br/index.php?',
    scope: 'Acesso a bases científicas e periódicos acadêmicos'
  }
];

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#87b6e5"/><stop offset="1" stop-color="#2d5f96"/></linearGradient></defs><rect width="240" height="240" rx="28" fill="url(#g)"/><circle cx="120" cy="92" r="40" fill="#f4f9ff"/><rect x="60" y="142" width="120" height="62" rx="30" fill="#f4f9ff"/></svg>'
  );

const WEATHER_CODE_LABELS = {
  0: 'céu limpo',
  1: 'predomínio de sol',
  2: 'parcialmente nublado',
  3: 'nublado',
  45: 'neblina',
  48: 'neblina com geada',
  51: 'garoa fraca',
  53: 'garoa moderada',
  55: 'garoa intensa',
  61: 'chuva fraca',
  63: 'chuva moderada',
  65: 'chuva forte',
  66: 'chuva congelante fraca',
  67: 'chuva congelante forte',
  71: 'neve fraca',
  73: 'neve moderada',
  75: 'neve forte',
  80: 'pancadas de chuva fracas',
  81: 'pancadas de chuva moderadas',
  82: 'pancadas de chuva fortes',
  95: 'trovoadas',
  96: 'trovoadas com granizo fraco',
  99: 'trovoadas com granizo forte'
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function nowTimeISO() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function parseDateTime(datePart, timePart) {
  if (!datePart || !timePart) {
    return null;
  }
  const date = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function weatherCodeLabel(code) {
  const n = safeNumber(code, NaN);
  if (!Number.isFinite(n)) return 'condições variáveis';
  return WEATHER_CODE_LABELS[n] || 'condições variáveis';
}

function buildCommunityWelcomeMessage(communityName) {
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

function normalizeCommunityMessage(rawMessage) {
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

function normalizeCommunity(rawCommunity) {
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

function defaultState() {
  return {
    settings: {
      theme: 'light',
      notificationsEnabled: false,
      integrations: {
        openAiApiKey: '',
        openAiModel: 'gpt-4.1-mini',
        spotifyToken: '',
        exchangeRateApiKey: ''
      }
    },
    profile: {
      name: '',
      email: '',
      course: '',
      photo: ''
    },
    subjects: [],
    timetable: [],
    events: [],
    records: [],
    studySessions: [],
    communities: [],
    pomodoro: {
      work: 25,
      shortBreak: 5,
      longBreak: 15,
      cycles: 4,
      subjectId: ''
    }
  };
}

function normalizeLoadedState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const rawSettings =
    raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const rawProfile =
    raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
  const rawPomodoro =
    raw.pomodoro && typeof raw.pomodoro === 'object' ? raw.pomodoro : {};
  const rawIntegrations =
    rawSettings.integrations && typeof rawSettings.integrations === 'object'
      ? rawSettings.integrations
      : {};

  const merged = {
    ...base,
    ...raw,
    settings: {
      ...base.settings,
      ...rawSettings,
      integrations: {
        ...base.settings.integrations,
        ...rawIntegrations
      }
    },
    profile: { ...base.profile, ...rawProfile },
    pomodoro: { ...base.pomodoro, ...rawPomodoro }
  };

  merged.subjects = Array.isArray(raw.subjects) ? raw.subjects : [];
  merged.timetable = Array.isArray(raw.timetable) ? raw.timetable : [];
  merged.events = Array.isArray(raw.events) ? raw.events : [];
  merged.records = Array.isArray(raw.records)
    ? raw.records.map((record) => ({
      exportFormat: 'md',
      emailTo: '',
      ...record
    }))
    : [];
  merged.studySessions = Array.isArray(raw.studySessions) ? raw.studySessions : [];
  merged.communities = Array.isArray(raw.communities)
    ? raw.communities.map((community) => normalizeCommunity(community))
    : [];

  return merged;
}

const AUTH_KEY = 'futureAcademyAuthV1';

const GOOGLE_MOCK_USERS = [
  { name: 'Ana Carolina', email: 'ana.carolina@gmail.com', photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ana&backgroundColor=b6e3f4', provider: 'google' },
  { name: 'Lucas Mendes', email: 'lucas.mendes@gmail.com', photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=lucas&backgroundColor=c0aede', provider: 'google' },
  { name: 'Beatriz Souza', email: 'beatriz.souza@gmail.com', photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=bia&backgroundColor=ffdfbf', provider: 'google' }
];

const FACEBOOK_MOCK_USERS = [
  { name: 'Mariana Lima', email: 'mariana.lima@facebook.com', photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=mariana&backgroundColor=d1f4d1', provider: 'facebook' },
  { name: 'Pedro Oliveira', email: 'pedro.oliveira@facebook.com', photo: 'https://api.dicebear.com/7.x/lorelei/svg?seed=pedro&backgroundColor=ffd5dc', provider: 'facebook' }
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

createApp({
  data() {
    return {
      navItems: [
        {
          id: 'dashboard',
          label: 'Painel',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
        },
        {
          id: 'subjects',
          label: 'Matérias',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
        },
        {
          id: 'timetable',
          label: 'Horários',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        },
        {
          id: 'agenda',
          label: 'Agenda',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
        },
        {
          id: 'records',
          label: 'Trabalhos',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        },
        { separator: true },
        {
          id: 'pomodoro',
          label: 'Pomodoro',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        },
        {
          id: 'communities',
          label: 'Comunidades',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        },
        {
          id: 'focus-music',
          label: 'Foco & Música',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>'
        },
        { separator: true },
        {
          id: 'assistant',
          label: 'IA Acadêmica',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        },
        {
          id: 'profile',
          label: 'Perfil',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        }
      ],
      activeSection: 'dashboard',
      dashChartRange: 'all',
      dayOptions: DAY_OPTIONS,
      officialSources: OFFICIAL_SOURCES,
      defaultAvatar: DEFAULT_AVATAR,
      state: defaultState(),
      subjectForm: {
        name: '',
        professorName: '',
        professorEmail: '',
        professorContact: '',
        color: '#2368aa'
      },
      timetableForm: {
        subjectId: '',
        day: 1,
        start: '08:00',
        end: '09:30',
        place: '',
        notifyMinutes: 15
      },
      eventForm: {
        title: '',
        type: 'prova',
        subjectId: '',
        date: todayISO(),
        time: nowTimeISO(),
        details: '',
        notifyMinutes: 30
      },
      recordForm: {
        title: '',
        type: 'trabalho',
        subjectId: '',
        dueDate: todayISO(),
        status: 'pendente',
        studyMinutes: 0,
        content: ''
      },
      quickStudy: {
        subjectId: '',
        minutes: 25
      },
      communityForm: {
        name: '',
        description: '',
        emails: ''
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
      pomodoro: {
        mode: 'focus',
        modeLabel: 'Foco',
        running: false,
        secondsRemaining: 25 * 60,
        completedFocusCycles: 0
      },
      reminderTimeouts: [],
      pomodoroIntervalId: null,
      toast: {
        visible: false,
        message: ''
      },
      toastTimeout: null,

      // ─── Auth ──────────────────────────────────
      authUser: null,
      authLoading: true,
      authEmail: '',
      authPassword: '',

      // ─── Foco & Música ─────────────────────────
      focusPlaylists: [
        {
          name: 'Binaural Beats: Focus',
          description: 'Frequências binaurais para concentração profunda',
          spotifyUri: '37i9dQZF1DX9uKNf5jGX6m',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX9uKNf5jGX6m?utm_source=generator&theme=0'
        },
        {
          name: 'Deep Focus',
          description: 'Música ambiente para manter o foco por horas',
          spotifyUri: '37i9dQZF1DWZeKCadgRdKQ',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0'
        },
        {
          name: 'Brain Food',
          description: 'Eletrônica suave ideal para estudo',
          spotifyUri: '37i9dQZF1DWXLeA8Omikj7',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWXLeA8Omikj7?utm_source=generator&theme=0'
        },
        {
          name: 'Lo-Fi Beats',
          description: 'Lo-fi hip hop para relaxar e estudar',
          spotifyUri: '37i9dQZF1DWWQRwui0ExPn',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0'
        },
        {
          name: 'Peaceful Piano',
          description: 'Piano suave para leitura e concentração',
          spotifyUri: '37i9dQZF1DX4sWSpwq3LiO',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0'
        },
        {
          name: 'Nature Sounds',
          description: 'Sons da natureza com batidas binaurais',
          spotifyUri: '37i9dQZF1DX4PP3DA4J0N8',
          embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4PP3DA4J0N8?utm_source=generator&theme=0'
        }
      ],
      activePlaylistIndex: 0,
      customPlaylistUrl: '',

      // ─── Timetable Import ──────────────────────
      timetableImport: {
        busy: false,
        status: '',
        rawText: '',
        parsed: []
      },

      // ─── 3D Scene ──────────────────────────────
      _threeScene: null,
      _threeCamera: null,
      _threeRenderer: null,
      _threeAnimationId: null,
      _threeParticles: null
    };
  },
  computed: {
    notificationsEnabledLabel() {
      return this.state.settings.notificationsEnabled
        ? 'Notificações ativadas'
        : 'Ativar notificações';
    },
    orderedTimetable() {
      return [...this.state.timetable].sort((a, b) => {
        if (a.day !== b.day) {
          return a.day - b.day;
        }
        return a.start.localeCompare(b.start);
      });
    },
    orderedEvents() {
      return [...this.state.events].sort((a, b) => {
        const dateA = parseDateTime(a.date, a.time)?.getTime() ?? 0;
        const dateB = parseDateTime(b.date, b.time)?.getTime() ?? 0;
        return dateA - dateB;
      });
    },
    orderedRecords() {
      return [...this.state.records].sort((a, b) => {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });
    },
    orderedCommunities() {
      return [...this.state.communities].sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        if (aDate !== bDate) {
          return bDate - aDate;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    },
    selectedCommunity() {
      return (
        this.state.communities.find(
          (community) => community.id === this.communityChat.selectedCommunityId
        ) || null
      );
    },
    selectedCommunityMessages() {
      if (!this.selectedCommunity) return [];
      return [...(this.selectedCommunity.messages || [])].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
    },
    statsCards() {
      const pendingRecords = this.state.records.filter((item) => item.status !== 'concluido').length;
      const upcomingEvents = this.state.events.filter((event) => {
        const when = parseDateTime(event.date, event.time);
        return when && when.getTime() >= Date.now();
      }).length;
      const totalMinutes = this.state.studySessions.reduce(
        (sum, item) => sum + safeNumber(item.minutes, 0),
        0
      );

      return [
        {
          label: 'Matérias',
          value: this.state.subjects.length,
          color: 'gold',
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
          trendUp: this.state.subjects.length > 0,
          trendLabel: this.state.subjects.length > 0 ? `${this.state.subjects.length} cadastrada(s)` : 'nenhuma'
        },
        {
          label: 'Eventos futuros',
          value: upcomingEvents,
          color: 'green',
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
          trendUp: upcomingEvents > 0,
          trendLabel: upcomingEvents > 0 ? 'próximos dias' : 'nenhum agendado'
        },
        {
          label: 'Pendências',
          value: pendingRecords,
          color: 'purple',
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
          trendUp: false,
          trendLabel: pendingRecords > 0 ? 'a concluir' : 'tudo em dia'
        },
        {
          label: 'Min. estudados',
          value: totalMinutes,
          color: 'accent',
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
          trendUp: totalMinutes > 0,
          trendLabel: totalMinutes > 0 ? `+${Math.round(totalMinutes / 60)}h total` : 'comece agora'
        }
      ];
    },
    pomodoroDisplay() {
      const mins = Math.floor(this.pomodoro.secondsRemaining / 60)
        .toString()
        .padStart(2, '0');
      const secs = Math.floor(this.pomodoro.secondsRemaining % 60)
        .toString()
        .padStart(2, '0');
      return `${mins}:${secs}`;
    },
    pomodoroStrokeDashoffset() {
      const circumference = 502; // 2 * PI * 80
      const cfg = this.state.pomodoro;
      let totalSeconds;
      if (this.pomodoro.mode === 'focus') {
        totalSeconds = safeNumber(cfg.work, 25) * 60;
      } else if (this.pomodoro.mode === 'longBreak') {
        totalSeconds = safeNumber(cfg.longBreak, 15) * 60;
      } else {
        totalSeconds = safeNumber(cfg.shortBreak, 5) * 60;
      }
      if (!totalSeconds) return circumference;
      const progress = this.pomodoro.secondsRemaining / totalSeconds;
      return circumference * (1 - progress);
    },
    currentEmbedUrl() {
      const pl = this.focusPlaylists[this.activePlaylistIndex];
      return pl ? pl.embedUrl : this.focusPlaylists[0].embedUrl;
    },
    todayDayLabel() {
      const today = new Date().getDay();
      return DAY_OPTIONS.find((d) => d.value === today)?.label || 'Hoje';
    },
    todayTimetableEntries() {
      const today = new Date().getDay();
      return this.orderedTimetable.filter((entry) => entry.day === today);
    },
    dashGreeting() {
      const h = new Date().getHours();
      if (h < 5) return 'Boa madrugada';
      if (h < 12) return 'Bom dia';
      if (h < 18) return 'Boa tarde';
      return 'Boa noite';
    },
    recentActivity() {
      const items = [];
      // Study sessions
      this.state.studySessions.slice(-5).reverse().forEach((s) => {
        const sub = this.state.subjects.find((x) => x.id === s.subjectId);
        items.push({
          id: 'ss-' + (s.id || Math.random()),
          title: sub?.name || 'Estudo',
          subtitle: `${s.minutes} minutos de estudo`,
          time: s.date || '',
          color: sub?.color || 'var(--accent)',
          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        });
      });
      // Recent events
      this.state.events.slice(-3).reverse().forEach((e) => {
        items.push({
          id: 'ev-' + (e.id || Math.random()),
          title: e.title || 'Evento',
          subtitle: e.date ? `${e.date} às ${e.time || '—'}` : 'Sem data',
          time: e.date || '',
          color: '#a3e635',
          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>'
        });
      });
      // Recent records
      this.state.records.slice(-3).reverse().forEach((r) => {
        items.push({
          id: 'rc-' + (r.id || Math.random()),
          title: r.title || 'Trabalho',
          subtitle: r.status === 'concluido' ? 'Concluído' : 'Em andamento',
          time: '',
          color: '#c084fc',
          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        });
      });
      return items.slice(0, 8);
    }
  },
  watch: {
    state: {
      deep: true,
      handler() {
        this.persistState();
      }
    },
    'state.settings.theme': {
      immediate: true,
      handler(theme) {
        document.documentElement.setAttribute('data-theme', theme || 'light');
      }
    },
    'state.subjects.length': {
      immediate: true,
      handler(length) {
        if (!length) {
          this.quickStudy.subjectId = '';
          this.timetableForm.subjectId = '';
          this.eventForm.subjectId = '';
          this.recordForm.subjectId = '';
          this.pomodoroConfig.subjectId = '';
          return;
        }

        const first = this.state.subjects[0].id;
        if (!this.quickStudy.subjectId) this.quickStudy.subjectId = first;
        if (!this.timetableForm.subjectId) this.timetableForm.subjectId = first;
        if (!this.eventForm.subjectId) this.eventForm.subjectId = first;
        if (!this.recordForm.subjectId) this.recordForm.subjectId = first;
        if (!this.pomodoroConfig.subjectId) this.pomodoroConfig.subjectId = first;
      }
    },
    'state.communities.length': {
      immediate: true,
      handler() {
        this.ensureCommunitySelection();
      }
    }
  },
  methods: {
    loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        this.state = normalizeLoadedState(parsed);
      } catch {
        this.state = defaultState();
      }
    },
    persistState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.scheduleReminders();
      nextTick(() => this.drawStudyChart());
    },
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
    applyThemeAndSave() {
      document.documentElement.setAttribute('data-theme', this.state.settings.theme || 'light');
      this.persistState();
      this.showToast(`Tema alterado para ${this.state.settings.theme}.`);
    },
    dayLabel(day) {
      return DAY_OPTIONS.find((item) => item.value === day)?.label || 'Dia';
    },
    subjectName(subjectId) {
      return this.state.subjects.find((item) => item.id === subjectId)?.name || 'Sem matéria';
    },
    formatDate(dateValue) {
      if (!dateValue) return '---';
      const date = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(date.getTime())) return dateValue;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    formatDateTime(dateValue) {
      if (!dateValue) return '---';
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return '---';
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    addSubject() {
      const subject = {
        id: uid(),
        name: this.subjectForm.name,
        professorName: this.subjectForm.professorName,
        professorEmail: this.subjectForm.professorEmail,
        professorContact: this.subjectForm.professorContact,
        color: this.subjectForm.color || '#2368aa'
      };
      this.state.subjects.push(subject);
      this.subjectForm = {
        name: '',
        professorName: '',
        professorEmail: '',
        professorContact: '',
        color: '#2368aa'
      };
      this.showToast('Matéria cadastrada.');
    },
    removeSubject(subjectId) {
      this.state.subjects = this.state.subjects.filter((subject) => subject.id !== subjectId);
      this.state.timetable = this.state.timetable.filter((item) => item.subjectId !== subjectId);
      this.state.events = this.state.events.filter((item) => item.subjectId !== subjectId);
      this.state.records = this.state.records.filter((item) => item.subjectId !== subjectId);
      this.state.studySessions = this.state.studySessions.filter((item) => item.subjectId !== subjectId);
      if (this.state.pomodoro.subjectId === subjectId) {
        this.state.pomodoro.subjectId = '';
      }
      this.showToast('Matéria removida com itens relacionados.');
    },
    addTimetable() {
      if (this.timetableForm.start >= this.timetableForm.end) {
        this.showToast('Horário inválido: o início precisa ser antes do fim.');
        return;
      }

      this.state.timetable.push({
        id: uid(),
        subjectId: this.timetableForm.subjectId,
        day: safeNumber(this.timetableForm.day, 1),
        start: this.timetableForm.start,
        end: this.timetableForm.end,
        place: this.timetableForm.place,
        notifyMinutes: safeNumber(this.timetableForm.notifyMinutes, 0)
      });

      this.timetableForm.start = '08:00';
      this.timetableForm.end = '09:30';
      this.timetableForm.place = '';
      this.timetableForm.notifyMinutes = 15;
      this.showToast('Horário adicionado.');
    },
    removeTimetable(id) {
      this.state.timetable = this.state.timetable.filter((item) => item.id !== id);
      this.showToast('Horário removido.');
    },
    addEvent() {
      this.state.events.push({
        id: uid(),
        title: this.eventForm.title,
        type: this.eventForm.type,
        subjectId: this.eventForm.subjectId,
        date: this.eventForm.date,
        time: this.eventForm.time,
        details: this.eventForm.details,
        notifyMinutes: safeNumber(this.eventForm.notifyMinutes, 0)
      });

      this.eventForm.title = '';
      this.eventForm.type = 'prova';
      this.eventForm.date = todayISO();
      this.eventForm.time = nowTimeISO();
      this.eventForm.details = '';
      this.eventForm.notifyMinutes = 30;
      this.showToast('Evento salvo na agenda.');
    },
    removeEvent(id) {
      this.state.events = this.state.events.filter((item) => item.id !== id);
      this.showToast('Evento removido.');
    },
    addRecord() {
      this.state.records.push({
        id: uid(),
        title: this.recordForm.title,
        type: this.recordForm.type,
        subjectId: this.recordForm.subjectId,
        dueDate: this.recordForm.dueDate,
        status: this.recordForm.status,
        studyMinutes: safeNumber(this.recordForm.studyMinutes, 0),
        content: this.recordForm.content,
        exportFormat: 'md',
        emailTo: ''
      });

      if (safeNumber(this.recordForm.studyMinutes, 0) > 0) {
        this.state.studySessions.push({
          id: uid(),
          subjectId: this.recordForm.subjectId,
          minutes: safeNumber(this.recordForm.studyMinutes, 0),
          source: 'registro',
          createdAt: new Date().toISOString()
        });
      }

      this.recordForm.title = '';
      this.recordForm.type = 'trabalho';
      this.recordForm.dueDate = todayISO();
      this.recordForm.status = 'pendente';
      this.recordForm.studyMinutes = 0;
      this.recordForm.content = '';
      this.showToast('Registro criado.');
    },
    removeRecord(id) {
      this.state.records = this.state.records.filter((item) => item.id !== id);
      this.showToast('Registro removido.');
    },
    addQuickStudySession() {
      if (!this.quickStudy.subjectId) {
        this.showToast('Selecione uma matéria.');
        return;
      }

      const minutes = safeNumber(this.quickStudy.minutes, 0);
      if (minutes <= 0) {
        this.showToast('Informe minutos válidos.');
        return;
      }

      this.state.studySessions.push({
        id: uid(),
        subjectId: this.quickStudy.subjectId,
        minutes,
        source: 'manual',
        createdAt: new Date().toISOString()
      });
      this.quickStudy.minutes = 25;
      this.showToast('Sessão de estudo registrada.');
    },
    formatRecordText(record, format) {
      const subject = this.subjectName(record.subjectId);
      const base = {
        title: String(record.title || ''),
        type: String(record.type || ''),
        subject: String(subject || ''),
        dueDate: this.formatDate(record.dueDate),
        status: String(record.status || ''),
        content: String(record.content || '')
      };

      if (format === 'md') {
        return {
          filename: `${record.title.replace(/\s+/g, '_').toLowerCase() || 'registro'}.md`,
          mime: 'text/markdown;charset=utf-8',
          content: `# ${base.title}\n\n- Tipo: ${base.type}\n- Matéria: ${base.subject}\n- Data limite: ${base.dueDate}\n- Status: ${base.status}\n\n## Conteúdo\n\n${base.content}\n`
        };
      }

      if (format === 'doc') {
        const safeTitle = escapeHtml(base.title);
        const safeType = escapeHtml(base.type);
        const safeSubject = escapeHtml(base.subject);
        const safeDueDate = escapeHtml(base.dueDate);
        const safeStatus = escapeHtml(base.status);
        const safeContent = escapeHtml(base.content).replaceAll('\n', '<br/>');

        return {
          filename: `${record.title.replace(/\s+/g, '_').toLowerCase() || 'registro'}.doc`,
          mime: 'application/msword;charset=utf-8',
          content: `
<html>
  <head><meta charset="UTF-8"></head>
  <body>
    <h1>${safeTitle}</h1>
    <p><strong>Tipo:</strong> ${safeType}</p>
    <p><strong>Matéria:</strong> ${safeSubject}</p>
    <p><strong>Data limite:</strong> ${safeDueDate}</p>
    <p><strong>Status:</strong> ${safeStatus}</p>
    <h2>Conteúdo</h2>
    <p>${safeContent}</p>
  </body>
</html>
`.trim()
        };
      }

      return {
        filename: `${record.title.replace(/\s+/g, '_').toLowerCase() || 'registro'}.txt`,
        mime: 'text/plain;charset=utf-8',
        content: `${base.title}\nTipo: ${base.type}\nMatéria: ${base.subject}\nData limite: ${base.dueDate}\nStatus: ${base.status}\n\n${base.content}`
      };
    },
    downloadFile(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
    printRecordAsPdf(record) {
      const subject = this.subjectName(record.subjectId);
      const safeTitle = escapeHtml(record.title || '');
      const safeType = escapeHtml(record.type || '');
      const safeSubject = escapeHtml(subject || '');
      const safeDueDate = escapeHtml(this.formatDate(record.dueDate));
      const safeStatus = escapeHtml(record.status || '');
      const safeContent = escapeHtml(record.content || '');
      const printable = `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; }
      h1 { margin-bottom: .5rem; }
      p { margin: .3rem 0; }
      .content { white-space: pre-wrap; margin-top: 1rem; }
    </style>
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <p><strong>Tipo:</strong> ${safeType}</p>
    <p><strong>Matéria:</strong> ${safeSubject}</p>
    <p><strong>Data limite:</strong> ${safeDueDate}</p>
    <p><strong>Status:</strong> ${safeStatus}</p>
    <div class="content">${safeContent}</div>
  </body>
</html>`;

      const printWindow = window.open('', '_blank', 'width=860,height=720');
      if (!printWindow) {
        this.showToast('Não foi possível abrir a janela de impressão.');
        return;
      }
      printWindow.document.write(printable);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    },
    exportRecord(record) {
      const format = record.exportFormat || 'md';
      if (format === 'pdf') {
        this.printRecordAsPdf(record);
        this.showToast('Janela de PDF aberta. Salve como PDF no diálogo de impressão.');
        return;
      }

      const { filename, mime, content } = this.formatRecordText(record, format);
      this.downloadFile(filename, content, mime);
      this.showToast(`Arquivo ${filename} exportado.`);
    },
    sendRecordEmail(record) {
      if (!record.emailTo) {
        this.showToast('Informe um e-mail de destino no registro.');
        return;
      }

      const format = record.exportFormat || 'md';
      const { content } = this.formatRecordText(record, format);
      const subject = `Future Academy - ${record.title} (${format.toUpperCase()})`;
      const body = `Olá,\n\nSegue o conteúdo formatado em ${format.toUpperCase()}:\n\n${content}\n\nEnviado via Future Academy.`;
      window.location.href = `mailto:${record.emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      this.showToast('Cliente de e-mail aberto com conteúdo formatado.');
    },
    enableNotifications() {
      if (!('Notification' in window)) {
        this.showToast('Este navegador não suporta notificações.');
        return;
      }

      if (Notification.permission === 'granted') {
        this.state.settings.notificationsEnabled = true;
        this.showToast('Notificações já estavam permitidas.');
        return;
      }

      if (Notification.permission === 'denied') {
        this.showToast('Notificações bloqueadas no navegador.');
        return;
      }

      Notification.requestPermission().then((permission) => {
        this.state.settings.notificationsEnabled = permission === 'granted';
        if (permission === 'granted') {
          this.showToast('Notificações ativadas com sucesso.');
        } else {
          this.showToast('Permissão de notificação não concedida.');
        }
      });
    },
    clearReminderTimeouts() {
      this.reminderTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      this.reminderTimeouts = [];
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
    triggerNotification(title, body) {
      if (
        this.state.settings.notificationsEnabled &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, { body });
      } else {
        this.showToast(`${title}: ${body}`);
      }
    },
    scheduleReminders() {
      this.clearReminderTimeouts();

      if (!this.state.settings.notificationsEnabled) {
        return;
      }

      const now = Date.now();
      const reminders = [];

      this.state.events.forEach((event) => {
        const eventDate = parseDateTime(event.date, event.time);
        if (!eventDate) return;
        const remindAt =
          eventDate.getTime() - safeNumber(event.notifyMinutes, 0) * 60 * 1000;
        const delay = remindAt - now;
        if (delay <= 0 || delay > REMINDER_WINDOW_MS) return;

        reminders.push({
          delay,
          title: `Agenda: ${event.title}`,
          body: `${this.subjectName(event.subjectId)} às ${event.time}`
        });
      });

      this.state.timetable.forEach((item) => {
        const nextClass = this.nextOccurrenceDate(item.day, item.start);
        const remindAt =
          nextClass.getTime() - safeNumber(item.notifyMinutes, 0) * 60 * 1000;
        const delay = remindAt - now;
        if (delay <= 0 || delay > REMINDER_WINDOW_MS) return;

        reminders.push({
          delay,
          title: `Aula: ${this.subjectName(item.subjectId)}`,
          body: `Começa às ${item.start} (${this.dayLabel(item.day)}).`
        });
      });

      reminders.forEach((item) => {
        const timeoutId = setTimeout(() => {
          this.triggerNotification(item.title, item.body);
        }, item.delay);
        this.reminderTimeouts.push(timeoutId);
      });
    },
    drawStudyChart() {
      const canvas = this.$refs.studyChart;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const totals = new Map();
      this.state.studySessions.forEach((entry) => {
        const key = entry.subjectId || 'unknown';
        const current = totals.get(key) || 0;
        totals.set(key, current + safeNumber(entry.minutes, 0));
      });

      const entries = [...totals.entries()].filter(([, value]) => value > 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(120,120,120,.2)';
      ctx.font = '13px Manrope';

      if (!entries.length) {
        ctx.fillText('Sem dados de estudo ainda. Adicione sessões para ver o gráfico.', 18, 34);
        return;
      }

      const chartX = 50;
      const chartY = 24;
      const chartW = canvas.width - 72;
      const chartH = canvas.height - 60;
      const maxValue = Math.max(...entries.map(([, value]) => value));

      ctx.strokeStyle = 'rgba(120,130,150,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartX, chartY);
      ctx.lineTo(chartX, chartY + chartH);
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.stroke();

      const barGap = 14;
      const barWidth = Math.max(
        18,
        (chartW - (entries.length + 1) * barGap) / Math.max(entries.length, 1)
      );

      entries.forEach(([subjectId, total], index) => {
        const x = chartX + barGap + index * (barWidth + barGap);
        const ratio = total / maxValue;
        const h = Math.max(8, chartH * ratio);
        const y = chartY + chartH - h;

        const subject = this.state.subjects.find((item) => item.id === subjectId);
        ctx.fillStyle = subject?.color || '#2f74c2';
        ctx.fillRect(x, y, barWidth, h);

        ctx.fillStyle = 'rgba(110, 120, 130, .95)';
        ctx.font = '11px Manrope';
        ctx.fillText(String(total), x, y - 6);

        const label = (subject?.name || 'N/A').slice(0, 11);
        ctx.fillText(label, x, chartY + chartH + 15);
      });
    },
    savePomodoroSettings() {
      this.state.pomodoro.work = Math.max(1, safeNumber(this.pomodoroConfig.work, 25));
      this.state.pomodoro.shortBreak = Math.max(1, safeNumber(this.pomodoroConfig.shortBreak, 5));
      this.state.pomodoro.longBreak = Math.max(1, safeNumber(this.pomodoroConfig.longBreak, 15));
      this.state.pomodoro.cycles = Math.max(1, safeNumber(this.pomodoroConfig.cycles, 4));
      this.state.pomodoro.subjectId = this.pomodoroConfig.subjectId || '';

      this.resetPomodoro();
      this.showToast('Configuração pomodoro salva.');
    },
    startPomodoro() {
      if (this.pomodoro.running) return;
      this.pomodoro.running = true;

      this.pomodoroIntervalId = setInterval(() => {
        if (this.pomodoro.secondsRemaining > 0) {
          this.pomodoro.secondsRemaining -= 1;
          return;
        }

        this.handlePomodoroCycleEnd();
      }, 1000);
    },
    pausePomodoro() {
      this.pomodoro.running = false;
      if (this.pomodoroIntervalId) {
        clearInterval(this.pomodoroIntervalId);
        this.pomodoroIntervalId = null;
      }
    },
    resetPomodoro() {
      this.pausePomodoro();
      this.pomodoro.mode = 'focus';
      this.pomodoro.modeLabel = 'Foco';
      this.pomodoro.secondsRemaining = this.state.pomodoro.work * 60;
      this.pomodoro.completedFocusCycles = 0;
    },
    handlePomodoroCycleEnd() {
      if (this.pomodoro.mode === 'focus') {
        this.pomodoro.completedFocusCycles += 1;
        if (this.state.pomodoro.subjectId) {
          this.state.studySessions.push({
            id: uid(),
            subjectId: this.state.pomodoro.subjectId,
            minutes: this.state.pomodoro.work,
            source: 'pomodoro',
            createdAt: new Date().toISOString()
          });
        }

        const useLongBreak =
          this.pomodoro.completedFocusCycles % this.state.pomodoro.cycles === 0;

        this.pomodoro.mode = 'break';
        this.pomodoro.modeLabel = useLongBreak ? 'Pausa longa' : 'Pausa curta';
        this.pomodoro.secondsRemaining =
          (useLongBreak ? this.state.pomodoro.longBreak : this.state.pomodoro.shortBreak) * 60;

        this.triggerNotification(
          'Pomodoro',
          useLongBreak
            ? 'Ciclo completo. Hora da pausa longa.'
            : 'Sessão concluída. Faça uma pausa curta.'
        );
      } else {
        this.pomodoro.mode = 'focus';
        this.pomodoro.modeLabel = 'Foco';
        this.pomodoro.secondsRemaining = this.state.pomodoro.work * 60;
        this.triggerNotification('Pomodoro', 'Pausa finalizada. Volte para foco.');
      }
    },
    addCommunity() {
      const members = this.communityForm.emails
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      const newCommunity = {
        id: uid(),
        name: this.communityForm.name,
        description: this.communityForm.description,
        members,
        messages: buildCommunityWelcomeMessage(this.communityForm.name),
        createdAt: new Date().toISOString()
      };
      this.state.communities.push(newCommunity);
      this.communityChat.selectedCommunityId = newCommunity.id;

      this.communityForm = {
        name: '',
        description: '',
        emails: ''
      };
      this.showToast('Comunidade criada.');
    },
    removeCommunity(id) {
      const wasSelected = this.communityChat.selectedCommunityId === id;
      this.state.communities = this.state.communities.filter((item) => item.id !== id);
      if (wasSelected) {
        this.ensureCommunitySelection();
      }
      this.showToast('Comunidade removida.');
    },
    inviteCommunity(community) {
      const recipients = community.members.join(',');
      const subject = `Convite para comunidade de estudos: ${community.name}`;
      const body = `Olá!\n\nVocê foi convidado(a) para participar da comunidade \"${community.name}\" no Future Academy.\n\nDescrição: ${community.description}\n\nNos vemos nos estudos!`;
      window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      this.showToast('Rascunho de convite por e-mail aberto.');
    },
    ensureCommunitySelection() {
      if (!this.state.communities.length) {
        this.communityChat.selectedCommunityId = '';
        return;
      }
      const alreadySelected = this.state.communities.some(
        (community) => community.id === this.communityChat.selectedCommunityId
      );
      if (!alreadySelected) {
        this.communityChat.selectedCommunityId = this.state.communities[0].id;
      }
    },
    selectCommunity(communityId) {
      this.communityChat.selectedCommunityId = communityId;
      nextTick(() => this.scrollCommunityMessagesToBottom());
    },
    scrollCommunityMessagesToBottom() {
      const ref = this.$refs.communityMessages;
      if (!ref || Array.isArray(ref)) return;
      ref.scrollTop = ref.scrollHeight;
    },
    communityRoleLabel(role) {
      if (role === 'user') return 'Você';
      if (role === 'assistant') return 'Assistente';
      return 'Sistema';
    },
    appendCommunityMessage(communityId, role, text, source = 'chat') {
      const messageText = String(text || '').trim();
      if (!messageText) return;
      const community = this.state.communities.find((item) => item.id === communityId);
      if (!community) return;
      if (!Array.isArray(community.messages)) {
        community.messages = [];
      }
      community.messages.push({
        id: uid(),
        role,
        source,
        text: messageText,
        createdAt: new Date().toISOString()
      });
      nextTick(() => this.scrollCommunityMessagesToBottom());
    },
    communityHelpMessage() {
      return [
        'Comandos disponíveis:',
        '/tempo <cidade> - consulta o clima atual (Open-Meteo).',
        '/spotify <busca> - lista faixas no Spotify.',
        '/cambio <valor> <moeda_origem> <moeda_destino> - ex: /cambio 100 USD BRL.',
        '/ia <pergunta> - responde com OpenAI.',
        'Sem comando: se a chave OpenAI estiver configurada, a mensagem vai direto para a IA.'
      ].join('\n');
    },
    prefillCommunityCommand(command) {
      this.communityChat.message = command;
    },
    async sendCommunityMessage() {
      if (this.communityChat.busy) {
        this.showToast('Aguarde a resposta atual terminar.');
        return;
      }

      const community = this.selectedCommunity;
      if (!community) {
        this.showToast('Crie e selecione uma comunidade primeiro.');
        return;
      }

      const text = this.communityChat.message.trim();
      if (!text) return;

      this.appendCommunityMessage(community.id, 'user', text, 'user');
      this.communityChat.message = '';
      this.communityChat.busy = true;

      try {
        if (text.startsWith('/')) {
          await this.processCommunityCommand(community, text);
        } else if (this.state.settings.integrations.openAiApiKey.trim()) {
          const answer = await this.fetchOpenAiReply(community, text);
          this.appendCommunityMessage(community.id, 'assistant', answer, 'openai');
        } else {
          this.appendCommunityMessage(
            community.id,
            'assistant',
            `Mensagem recebida. Configure a chave OpenAI para respostas livres.\n\n${this.communityHelpMessage()}`,
            'system'
          );
        }
      } catch (error) {
        const details =
          error instanceof Error ? error.message : 'falha inesperada.';
        this.appendCommunityMessage(
          community.id,
          'assistant',
          `Não consegui concluir essa solicitação: ${details}`,
          'error'
        );
      } finally {
        this.communityChat.busy = false;
      }
    },
    async processCommunityCommand(community, commandLine) {
      const [commandRaw, ...rest] = commandLine.trim().split(/\s+/);
      const command = (commandRaw || '').toLowerCase();
      const payload = rest.join(' ').trim();

      if (command === '/ajuda') {
        this.appendCommunityMessage(
          community.id,
          'assistant',
          this.communityHelpMessage(),
          'system'
        );
        return;
      }

      if (command === '/tempo') {
        if (!payload) {
          this.appendCommunityMessage(
            community.id,
            'assistant',
            'Uso: /tempo <cidade>. Exemplo: /tempo Recife',
            'weather'
          );
          return;
        }
        const weatherText = await this.fetchWeatherForCity(payload);
        this.appendCommunityMessage(community.id, 'assistant', weatherText, 'weather');
        return;
      }

      if (command === '/spotify') {
        if (!payload) {
          this.appendCommunityMessage(
            community.id,
            'assistant',
            'Uso: /spotify <busca>. Exemplo: /spotify lo-fi study',
            'spotify'
          );
          return;
        }
        const spotifyText = await this.fetchSpotifyTracks(payload);
        this.appendCommunityMessage(community.id, 'assistant', spotifyText, 'spotify');
        return;
      }

      if (command === '/cambio' || command === '/câmbio') {
        const [rawAmount, rawFrom, rawTo] = payload.split(/\s+/);
        const amount = safeNumber(rawAmount, NaN);
        if (!Number.isFinite(amount) || !rawFrom || !rawTo) {
          this.appendCommunityMessage(
            community.id,
            'assistant',
            'Uso: /cambio <valor> <origem> <destino>. Exemplo: /cambio 100 USD BRL',
            'exchange'
          );
          return;
        }
        const exchangeText = await this.fetchExchangeRate(
          amount,
          rawFrom.toUpperCase(),
          rawTo.toUpperCase()
        );
        this.appendCommunityMessage(community.id, 'assistant', exchangeText, 'exchange');
        return;
      }

      if (command === '/ia') {
        if (!payload) {
          this.appendCommunityMessage(
            community.id,
            'assistant',
            'Uso: /ia <pergunta>. Exemplo: /ia monte um cronograma de revisão para esta semana.',
            'openai'
          );
          return;
        }
        const answer = await this.fetchOpenAiReply(community, payload);
        this.appendCommunityMessage(community.id, 'assistant', answer, 'openai');
        return;
      }

      this.appendCommunityMessage(
        community.id,
        'assistant',
        `Comando não reconhecido: ${command}\n\n${this.communityHelpMessage()}`,
        'system'
      );
    },
    async fetchWeatherForCity(cityName) {
      const query = String(cityName || '').trim();
      if (!query) {
        return 'Informe uma cidade para consultar o clima.';
      }

      const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geocodeUrl.searchParams.set('name', query);
      geocodeUrl.searchParams.set('count', '1');
      geocodeUrl.searchParams.set('language', 'pt');
      geocodeUrl.searchParams.set('format', 'json');

      const geocodeResponse = await fetch(geocodeUrl.toString());
      if (!geocodeResponse.ok) {
        return `Falha ao consultar localidade (${geocodeResponse.status}).`;
      }

      const geocodeData = await geocodeResponse.json();
      const place = Array.isArray(geocodeData.results) ? geocodeData.results[0] : null;
      if (!place) {
        return `Não encontrei a cidade "${query}".`;
      }

      const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
      weatherUrl.searchParams.set('latitude', String(place.latitude));
      weatherUrl.searchParams.set('longitude', String(place.longitude));
      weatherUrl.searchParams.set(
        'current',
        'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m'
      );
      weatherUrl.searchParams.set('timezone', 'auto');

      const weatherResponse = await fetch(weatherUrl.toString());
      if (!weatherResponse.ok) {
        return `Falha ao consultar clima (${weatherResponse.status}).`;
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      if (!current) {
        return 'Não foi possível obter clima atual para essa cidade.';
      }

      const codeLabel = weatherCodeLabel(current.weather_code);
      const cityLabel = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(', ');
      const temp = safeNumber(current.temperature_2m, 0).toFixed(1);
      const apparent = safeNumber(current.apparent_temperature, 0).toFixed(1);
      const humidity = Math.round(safeNumber(current.relative_humidity_2m, 0));
      const wind = safeNumber(current.wind_speed_10m, 0).toFixed(1);

      return [
        `Clima agora em ${cityLabel}:`,
        `- ${temp}°C (sensação ${apparent}°C)`,
        `- ${codeLabel}`,
        `- Umidade ${humidity}%`,
        `- Vento ${wind} km/h`
      ].join('\n');
    },
    async fetchSpotifyTracks(searchText) {
      const token = this.state.settings.integrations.spotifyToken.trim();
      if (!token) {
        return 'Configure o token do Spotify para usar esse comando.';
      }

      const query = String(searchText || '').trim();
      if (!query) {
        return 'Informe um termo de busca para o Spotify.';
      }

      const spotifyUrl = new URL('https://api.spotify.com/v1/search');
      spotifyUrl.searchParams.set('q', query);
      spotifyUrl.searchParams.set('type', 'track');
      spotifyUrl.searchParams.set('limit', '5');
      spotifyUrl.searchParams.set('market', 'BR');

      const response = await fetch(spotifyUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        return 'Token Spotify inválido ou expirado. Gere um novo access token.';
      }
      if (!response.ok) {
        return `Falha ao consultar Spotify (${response.status}).`;
      }

      const data = await response.json();
      const tracks = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
      if (!tracks.length) {
        return `Nenhuma faixa encontrada para "${query}".`;
      }

      const lines = tracks.map((track, index) => {
        const artists = Array.isArray(track.artists)
          ? track.artists.map((artist) => artist.name).join(', ')
          : 'Artista desconhecido';
        const url = track.external_urls?.spotify
          ? ` (${track.external_urls.spotify})`
          : '';
        return `${index + 1}. ${track.name} - ${artists}${url}`;
      });

      return [`Resultados Spotify para "${query}":`, ...lines].join('\n');
    },
    async fetchExchangeRate(amount, fromCurrency, toCurrency) {
      const apiKey = this.state.settings.integrations.exchangeRateApiKey.trim();
      if (!apiKey) {
        return 'Configure a chave da ExchangeRate-API para usar esse comando.';
      }

      const from = String(fromCurrency || '').toUpperCase();
      const to = String(toCurrency || '').toUpperCase();
      const numericAmount = safeNumber(amount, NaN);
      if (!Number.isFinite(numericAmount)) {
        return 'Valor inválido para conversão.';
      }

      const endpoint = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(
        apiKey
      )}/pair/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(
        numericAmount
      )}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        return `Falha ao consultar câmbio (${response.status}).`;
      }

      const data = await response.json();
      if (data.result !== 'success') {
        const errorType = data['error-type'] || 'erro desconhecido';
        return `ExchangeRate-API retornou erro: ${errorType}.`;
      }

      const converted = safeNumber(data.conversion_result, NaN);
      const rate = safeNumber(data.conversion_rate, NaN);
      if (!Number.isFinite(converted) || !Number.isFinite(rate)) {
        return 'Não foi possível interpretar a resposta de câmbio.';
      }

      return [
        `Conversão ${from} -> ${to}:`,
        `- ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${from}`,
        `- ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`,
        `- Taxa: 1 ${from} = ${rate.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} ${to}`
      ].join('\n');
    },
    async fetchOpenAiReply(community, prompt) {
      const apiKey = this.state.settings.integrations.openAiApiKey.trim();
      if (!apiKey) {
        return 'Configure a chave OpenAI para usar respostas da IA.';
      }

      const model = this.state.settings.integrations.openAiModel.trim() || 'gpt-4.1-mini';
      const recentHistory = (community.messages || [])
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-8)
        .map((message) => {
          const roleLabel = message.role === 'user' ? 'Usuário' : 'Assistente';
          return `${roleLabel}: ${message.text}`;
        })
        .join('\n');

      const input = [
        `Você é assistente da comunidade "${community.name}" no Future Academy.`,
        'Responda em português brasileiro e de forma objetiva.',
        'Quando fizer sentido, sugira próximos passos práticos para estudo em grupo.',
        '',
        'Histórico recente da conversa:',
        recentHistory || 'Sem histórico anterior.',
        '',
        `Solicitação atual: ${prompt}`
      ].join('\n');

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          input
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage =
          data?.error?.message || `falha HTTP ${response.status}`;
        return `OpenAI não respondeu: ${apiMessage}`;
      }

      let answer = String(data.output_text || '').trim();
      if (!answer && Array.isArray(data.output)) {
        const collected = [];
        data.output.forEach((block) => {
          if (!Array.isArray(block?.content)) return;
          block.content.forEach((item) => {
            if (item?.type === 'output_text' && item.text) {
              collected.push(item.text);
            }
          });
        });
        answer = collected.join('\n').trim();
      }

      return answer || 'A OpenAI retornou uma resposta vazia.';
    },
    assistantSourceMatch(question) {
      const text = question.toLowerCase();
      const picks = new Set();

      const rules = [
        { keywords: ['bolsa', 'mestrado', 'doutorado', 'capes'], source: 'CAPES' },
        { keywords: ['artigo', 'periódico', 'revista científica'], source: 'SciELO' },
        { keywords: ['tese', 'dissertação'], source: 'BDTD' },
        { keywords: ['graduação', 'currículo', 'diretriz', 'mec'], source: 'MEC' },
        { keywords: ['programa', 'avaliação'], source: 'Plataforma Sucupira (CAPES)' }
      ];

      rules.forEach((rule) => {
        if (rule.keywords.some((word) => text.includes(word))) {
          picks.add(rule.source);
        }
      });

      if (!picks.size) {
        picks.add('MEC (Ministério da Educação)');
        picks.add('SciELO');
      }

      return OFFICIAL_SOURCES.filter((source) => picks.has(source.name));
    },
    askAssistant() {
      const question = this.assistant.question;
      if (!question) return;

      const text = question.toLowerCase();
      const sources = this.assistantSourceMatch(text);
      const lines = [];

      lines.push('Plano sugerido:');

      if (text.includes('prova')) {
        lines.push('1) Divida o conteúdo em blocos pequenos e revise com repetição espaçada.');
        lines.push('2) Monte um roteiro de revisão por semana e reserve sessões de simulado.');
      } else if (text.includes('trabalho') || text.includes('artigo')) {
        lines.push('1) Defina objetivo, pergunta central e critérios de fonte antes de escrever.');
        lines.push('2) Use estrutura acadêmica: introdução, desenvolvimento, conclusão e referências.');
      } else if (text.includes('anota') || text.includes('resumo')) {
        lines.push('1) Organize notas por tema, conceito-chave e evidências.');
        lines.push('2) Conecte cada nota a uma fonte confiável para revisão futura.');
      } else {
        lines.push('1) Defina meta semanal com entregáveis objetivos e tempo estimado.');
        lines.push('2) Use pomodoro para execução e revise progresso no fim de cada dia.');
      }

      lines.push('');
      lines.push('Fontes oficiais recomendadas para consulta:');
      sources.forEach((source) => lines.push(`- ${source.name}: ${source.url}`));
      lines.push('');
      lines.push('Se precisar, peça um plano diário detalhado com base na sua matéria e data de prova.');

      this.assistant.answerLines = lines;
      this.showToast('Resposta gerada com base em fontes oficiais indexadas.');
    },
    saveProfile() {
      this.state.profile = {
        name: this.profileForm.name,
        email: this.profileForm.email,
        course: this.profileForm.course,
        photo: this.profileForm.photo || this.state.profile.photo || ''
      };
      this.showToast('Perfil atualizado.');
    },
    onPhotoChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.profileForm.photo = String(reader.result || '');
        this.state.profile.photo = this.profileForm.photo;
        this.showToast('Foto de perfil atualizada.');
      };
      reader.readAsDataURL(file);
    },

    // ─── Auth Methods ──────────────────────────────────────────────────
    _persistAuth(user) {
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      } catch { /* ignore */ }
    },
    _loadAuth() {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch { return null; }
    },
    async loginWithGoogle() {
      this.authLoading = true;
      // Simula delay de OAuth (500–900ms)
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400));
      const user = randomPick(GOOGLE_MOCK_USERS);
      this.authUser = { ...user };
      this._persistAuth(this.authUser);
      this.authLoading = false;
      this.showToast(`Bem-vindo(a), ${user.name}! (Conta Google simulada)`);
    },
    async loginWithFacebook() {
      this.authLoading = true;
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400));
      const user = randomPick(FACEBOOK_MOCK_USERS);
      this.authUser = { ...user };
      this._persistAuth(this.authUser);
      this.authLoading = false;
      this.showToast(`Bem-vindo(a), ${user.name}! (Conta Facebook simulada)`);
    },
    async loginWithEmail() {
      if (!this.authEmail || !this.authPassword) {
        this.showToast('Preencha e-mail e senha.');
        return;
      }
      this.authLoading = true;
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 300));
      const namePart = this.authEmail.split('@')[0].replace(/[._-]/g, ' ');
      const name = namePart
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const seed = encodeURIComponent(this.authEmail);
      this.authUser = {
        name,
        email: this.authEmail,
        photo: `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4`,
        provider: 'email'
      };
      this._persistAuth(this.authUser);
      this.authEmail = '';
      this.authPassword = '';
      this.authLoading = false;
      this.showToast(`Bem-vindo(a), ${name}!`);
    },
    logout() {
      this.authUser = null;
      try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
      this.showToast('Até logo! Sessão encerrada.');
    },

    // ─── Foco & Música Methods ────────────────────────────────────────
    selectPlaylist(index) {
      this.activePlaylistIndex = index;
      this.showToast(`Playlist "${this.focusPlaylists[index].name}" selecionada.`);
    },
    loadCustomPlaylist() {
      const url = this.customPlaylistUrl;
      if (!url) {
        this.showToast('Cole uma URL do Spotify para carregar.');
        return;
      }
      // Extract playlist/album/track ID from Spotify URL
      const match = url.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (!match) {
        this.showToast('URL inválida. Use um link do Spotify (playlist, álbum ou faixa).');
        return;
      }
      const [, type, id] = match;
      const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
      // Add as temporary playlist
      this.focusPlaylists.push({
        name: 'Playlist Personalizada',
        description: url.slice(0, 50) + '...',
        spotifyUri: id,
        embedUrl
      });
      this.activePlaylistIndex = this.focusPlaylists.length - 1;
      this.customPlaylistUrl = '';
      this.showToast('Playlist personalizada carregada!');
    },

    // ─── Timetable Import Methods ──────────────────────────────────────
    async onTimetableFileImport(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = '';

      this.timetableImport.busy = true;
      this.timetableImport.status = '';
      this.timetableImport.rawText = '';
      this.timetableImport.parsed = [];

      try {
        let text = '';
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          text = await this.extractTextFromPdf(file);
        } else if (ext === 'docx') {
          text = await this.extractTextFromDocx(file);
        } else {
          this.showToast('Formato não suportado. Use .pdf ou .docx.');
          this.timetableImport.busy = false;
          return;
        }

        if (!text.trim()) {
          this.timetableImport.status = 'Nenhum texto encontrado no arquivo.';
          this.timetableImport.busy = false;
          return;
        }

        this.timetableImport.rawText = text.slice(0, 3000);
        const parsed = this.parseTimetableText(text);
        this.timetableImport.parsed = parsed;

        if (parsed.length) {
          this.timetableImport.status = `${parsed.length} horário(s) encontrado(s). Revise e confirme a importação.`;
        } else {
          this.timetableImport.status = 'Nenhum horário identificado automaticamente. Veja o texto extraído abaixo e cadastre manualmente.';
        }
        this.showToast(`Arquivo "${file.name}" processado.`);
      } catch (err) {
        this.timetableImport.status = `Erro ao processar: ${err.message || 'falha inesperada'}`;
        this.showToast('Erro ao importar arquivo.');
      } finally {
        this.timetableImport.busy = false;
      }
    },
    async extractTextFromPdf(file) {
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('Biblioteca pdf.js não carregada.');
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(' ');
        pages.push(pageText);
      }

      return pages.join('\n');
    },
    async extractTextFromDocx(file) {
      if (typeof mammoth === 'undefined') {
        throw new Error('Biblioteca mammoth.js não carregada.');
      }
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    },
    parseTimetableText(text) {
      const results = [];

      const dayMap = {
        'segunda': 1, 'seg': 1, 'segunda-feira': 1, '2ª': 1,
        'terça': 2, 'ter': 2, 'terca': 2, 'terça-feira': 2, '3ª': 2,
        'quarta': 3, 'qua': 3, 'quarta-feira': 3, '4ª': 3,
        'quinta': 4, 'qui': 4, 'quinta-feira': 4, '5ª': 4,
        'sexta': 5, 'sex': 5, 'sexta-feira': 5, '6ª': 5,
        'sábado': 6, 'sab': 6, 'sabado': 6, 'sáb': 6,
        'domingo': 0, 'dom': 0
      };

      const dayPattern = Object.keys(dayMap)
        .sort((a, b) => b.length - a.length)
        .join('|');

      // Pattern: day + time range (e.g., "Segunda 08:00 - 10:00 Cálculo I")
      const regex = new RegExp(
        `(${dayPattern})[\\s:;,\\-]*?(\\d{1,2}[h:]\\d{2})[\\s\\-–àa]*(\\d{1,2}[h:]\\d{2})([^\\n]*)`,
        'gi'
      );

      let match;
      while ((match = regex.exec(text)) !== null) {
        const dayKey = match[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const day = dayMap[dayKey] ?? dayMap[match[1].toLowerCase()] ?? 1;
        const start = match[2].replace('h', ':');
        const end = match[3].replace('h', ':');
        const remaining = match[4].trim().replace(/^[\-–:;,\s]+/, '');

        results.push({
          day,
          start,
          end,
          text: remaining || 'Aula importada'
        });
      }

      // Also try: time range + day (e.g., "08:00 - 10:00 Segunda Cálculo I")
      if (!results.length) {
        const regex2 = new RegExp(
          `(\\d{1,2}[h:]\\d{2})[\\s\\-–àa]*(\\d{1,2}[h:]\\d{2})[\\s:;,\\-]*(${dayPattern})([^\\n]*)`,
          'gi'
        );
        while ((match = regex2.exec(text)) !== null) {
          const start = match[1].replace('h', ':');
          const end = match[2].replace('h', ':');
          const dayKey = match[3].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const day = dayMap[dayKey] ?? dayMap[match[3].toLowerCase()] ?? 1;
          const remaining = match[4].trim().replace(/^[\-–:;,\s]+/, '');

          results.push({
            day,
            start,
            end,
            text: remaining || 'Aula importada'
          });
        }
      }

      return results;
    },
    removeImportedEntry(index) {
      this.timetableImport.parsed.splice(index, 1);
    },
    confirmImportTimetable() {
      const entries = this.timetableImport.parsed;
      if (!entries.length) {
        this.showToast('Nenhum horário para importar.');
        return;
      }

      // Try to match text to an existing subject or create a fallback
      entries.forEach((entry) => {
        const matchedSubject = this.state.subjects.find((s) =>
          entry.text.toLowerCase().includes(s.name.toLowerCase())
        );

        this.state.timetable.push({
          id: uid(),
          subjectId: matchedSubject?.id || (this.state.subjects[0]?.id || ''),
          day: entry.day,
          start: entry.start,
          end: entry.end,
          place: matchedSubject ? '' : entry.text,
          notifyMinutes: 15
        });
      });

      this.showToast(`${entries.length} horário(s) importado(s) com sucesso!`);
      this.timetableImport.parsed = [];
      this.timetableImport.rawText = '';
      this.timetableImport.status = '';
    },

    // ─── 3D Scene Methods ─────────────────────────────────────────────
    init3DScene() {
      if (typeof THREE === 'undefined') return;
      const canvas = document.getElementById('bg-canvas-3d');
      if (!canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create particles
      const particleCount = 300;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      const goldColors = [
        [0.79, 0.59, 0.29],  // accent gold
        [0.91, 0.75, 0.42],  // accent-2 gold
        [0.94, 0.87, 0.68],  // light gold
        [0.65, 0.48, 0.22],  // deep gold
      ];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        const color = goldColors[Math.floor(Math.random() * goldColors.length)];
        colors[i * 3] = color[0];
        colors[i * 3 + 1] = color[1];
        colors[i * 3 + 2] = color[2];

        sizes[i] = Math.random() * 3 + 1;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // Add a couple of floating icosahedron wireframes
      const icoGeo = new THREE.IcosahedronGeometry(0.6, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0xc9974a,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      const ico1 = new THREE.Mesh(icoGeo, icoMat);
      ico1.position.set(-2.5, 1.5, -2);
      scene.add(ico1);

      const ico2Geo = new THREE.IcosahedronGeometry(0.45, 1);
      const ico2Mat = new THREE.MeshBasicMaterial({
        color: 0xe8c06a,
        wireframe: true,
        transparent: true,
        opacity: 0.12
      });
      const ico2 = new THREE.Mesh(ico2Geo, ico2Mat);
      ico2.position.set(2.8, -1.2, -1.5);
      scene.add(ico2);

      // Torus knot
      const torusGeo = new THREE.TorusKnotGeometry(0.5, 0.15, 80, 12);
      const torusMat = new THREE.MeshBasicMaterial({
        color: 0xc9974a,
        wireframe: true,
        transparent: true,
        opacity: 0.08
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.position.set(3, 2, -3);
      scene.add(torus);

      this._threeScene = scene;
      this._threeCamera = camera;
      this._threeRenderer = renderer;
      this._threeParticles = particles;
      this._threeIcos = [ico1, ico2, torus];

      // Handle resize
      this._threeResizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', this._threeResizeHandler);

      this.animate3D();
    },
    animate3D() {
      if (!this._threeRenderer) return;
      this._threeAnimationId = requestAnimationFrame(() => this.animate3D());

      const time = Date.now() * 0.0005;

      // Rotate particles slowly
      if (this._threeParticles) {
        this._threeParticles.rotation.y = time * 0.3;
        this._threeParticles.rotation.x = Math.sin(time * 0.2) * 0.15;

        // Gentle wave on positions
        const pos = this._threeParticles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const baseY = pos.getY(i);
          pos.setY(i, baseY + Math.sin(time * 2 + i * 0.1) * 0.0008);
        }
        pos.needsUpdate = true;
      }

      // Rotate wireframe shapes
      if (this._threeIcos) {
        this._threeIcos.forEach((mesh, idx) => {
          mesh.rotation.x = time * (0.4 + idx * 0.15);
          mesh.rotation.y = time * (0.3 + idx * 0.1);
        });
      }

      this._threeRenderer.render(this._threeScene, this._threeCamera);
    },
    destroy3DScene() {
      if (this._threeAnimationId) {
        cancelAnimationFrame(this._threeAnimationId);
        this._threeAnimationId = null;
      }
      if (this._threeResizeHandler) {
        window.removeEventListener('resize', this._threeResizeHandler);
      }
      if (this._threeRenderer) {
        this._threeRenderer.dispose();
        this._threeRenderer = null;
      }
      this._threeScene = null;
      this._threeCamera = null;
      this._threeParticles = null;
      this._threeIcos = null;
    }
  },
  mounted() {
    // ─── Restaura sessão salva ──────────────────
    const savedAuth = this._loadAuth();
    if (savedAuth && savedAuth.name) {
      this.authUser = savedAuth;
    }
    this.authLoading = false;

    this.loadState();
    this.ensureCommunitySelection();

    this.profileForm.name = this.state.profile.name;
    this.profileForm.email = this.state.profile.email;
    this.profileForm.course = this.state.profile.course;
    this.profileForm.photo = this.state.profile.photo;

    this.pomodoroConfig = {
      work: this.state.pomodoro.work,
      shortBreak: this.state.pomodoro.shortBreak,
      longBreak: this.state.pomodoro.longBreak,
      cycles: this.state.pomodoro.cycles,
      subjectId: this.state.pomodoro.subjectId
    };

    this.resetPomodoro();
    this.scheduleReminders();
    nextTick(() => {
      this.drawStudyChart();
      this.scrollCommunityMessagesToBottom();
      this.init3DScene();
    });
  },
  beforeUnmount() {
    if (this.pomodoroIntervalId) {
      clearInterval(this.pomodoroIntervalId);
    }
    this.clearReminderTimeouts();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.destroy3DScene();
  }
}).mount('#root');
