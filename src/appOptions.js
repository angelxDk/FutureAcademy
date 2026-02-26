import { nextTick, markRaw } from 'vue';
// Three.js and docx are loaded lazily (see init3DScene / buildRecordDocxBlob)
import {
  auth,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  normalizeFirebaseUser,
  loadUserData,
  saveUserData
} from './firebase.js';

// State persists in Firestore (primary) + localStorage (fallback)
const LS_KEY = (uid) => `fa_state_${uid}`;
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

const AVAILABLE_THEMES = new Set(['light', 'dark']);

const FOCUS_VISUAL_PRESETS = [
  {
    value: 'calm',
    label: 'Fluxo Calmo',
    icon: 'mdi-weather-night',
    hint: 'movimentos suaves para leitura e revisão leve'
  },
  {
    value: 'focus',
    label: 'Foco Padrão',
    icon: 'mdi-target',
    hint: 'equilíbrio entre nitidez visual e ritmo estável'
  },
  {
    value: 'deep',
    label: 'Imersão Profunda',
    icon: 'mdi-brain',
    hint: 'pulso mais intenso para sessões de concentração máxima'
  }
];

function buildSpotifyEmbed(mediaType, spotifyUri) {
  return `https://open.spotify.com/embed/${mediaType}/${spotifyUri}?utm_source=generator&theme=0`;
}

function createFocusPlaylist(entry) {
  const mediaType = String(entry.mediaType || 'playlist');
  const spotifyUri = String(entry.spotifyUri || '').trim();
  return {
    ...entry,
    mediaType,
    spotifyUri,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    embedUrl: entry.embedUrl || buildSpotifyEmbed(mediaType, spotifyUri),
    openUrl: entry.openUrl || `https://open.spotify.com/${mediaType}/${spotifyUri}`
  };
}

const CURATED_FOCUS_PLAYLISTS = [
  createFocusPlaylist({
    name: 'Binaural Focus: Gamma Lift',
    description: 'Ritmo contínuo para manter raciocínio analítico e alta atenção.',
    spotifyUri: '37i9dQZF1DX9uKNf5jGX6m',
    frequency: '40 Hz (Gamma)',
    duration: '50-90 min',
    bestFor: 'Resolução de listas, programação e escrita técnica',
    energy: 'Alta',
    tags: ['Binaural', 'Sem Voz', 'Concentração']
  }),
  createFocusPlaylist({
    name: 'Alpha Study Flow',
    description: 'Textura ambiente para leitura profunda e retenção de conteúdo.',
    spotifyUri: '37i9dQZF1DWZeKCadgRdKQ',
    frequency: '10 Hz (Alpha)',
    duration: '45-120 min',
    bestFor: 'Leitura, revisão de teoria e anotações',
    energy: 'Média',
    tags: ['Binaural', 'Ambient', 'Leitura']
  }),
  createFocusPlaylist({
    name: 'Theta Memory Session',
    description: 'Sons orgânicos para sessões longas com baixa fadiga mental.',
    spotifyUri: '37i9dQZF1DX4PP3DA4J0N8',
    frequency: '6 Hz (Theta)',
    duration: '40-70 min',
    bestFor: 'Memorização ativa e mapas mentais',
    energy: 'Média',
    tags: ['Binaural', 'Natureza', 'Memória']
  }),
  createFocusPlaylist({
    name: 'Brain Food Boost',
    description: 'Eletrônica leve para manter constância em blocos pomodoro.',
    spotifyUri: '37i9dQZF1DWXLeA8Omikj7',
    frequency: '8-12 Hz (Alpha blend)',
    duration: '25-50 min',
    bestFor: 'Pomodoro, exercícios curtos e revisão rápida',
    energy: 'Média/Alta',
    tags: ['Instrumental', 'Focus', 'Pomodoro']
  }),
  createFocusPlaylist({
    name: 'Lo-Fi Focus Layer',
    description: 'Base lo-fi estável para estudo contínuo com baixa distração.',
    spotifyUri: '37i9dQZF1DWWQRwui0ExPn',
    frequency: 'Beats suaves',
    duration: '30-90 min',
    bestFor: 'Resumos, listas de revisão e escrita',
    energy: 'Média',
    tags: ['Lo-Fi', 'Sem Vocais', 'Estudo']
  }),
  createFocusPlaylist({
    name: 'Delta Recovery Piano',
    description: 'Piano minimalista para desacelerar entre ciclos intensos.',
    spotifyUri: '37i9dQZF1DX4sWSpwq3LiO',
    frequency: '2-4 Hz (Delta)',
    duration: '10-30 min',
    bestFor: 'Pausa ativa e recuperação cognitiva',
    energy: 'Baixa',
    tags: ['Recovery', 'Piano', 'Relax']
  })
];

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

function asString(value) {
  return String(value || '').trim();
}

function normalizeEditorHtml(rawHtml) {
  const html = String(rawHtml || '').trim();
  if (!html) return '<p></p>';
  if (typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('script,style').forEach((node) => node.remove());
  return container.innerHTML || '<p></p>';
}

function htmlToPlainText(rawHtml) {
  const html = String(rawHtml || '').trim();
  if (!html) return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  return asString(container.textContent || container.innerText || '');
}

function plainTextToHtml(text) {
  const value = String(text || '').trim();
  if (!value) return '<p></p>';
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replaceAll('\n', '<br/>')}</p>`)
    .join('');
}

function htmlToMarkdown(rawHtml) {
  const html = normalizeEditorHtml(rawHtml);
  if (!html) return '';
  let markdown = html;
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  markdown = markdown.replace(/<\/p>/gi, '\n\n');
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  markdown = markdown.replace(/<\/li>/gi, '\n');
  markdown = markdown.replace(/<li[^>]*>/gi, '- ');
  markdown = markdown.replace(/<ul[^>]*>/gi, '');
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '');
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  markdown = markdown.replace(/<[^>]+>/g, '');
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  return markdown.trim();
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

const SUBJECT_FORM_DEFAULTS = {
  name: '',
  professorName: '',
  professorEmail: '',
  professorContact: '',
  color: '#8C5E43'
};

const TIMETABLE_FORM_DEFAULTS = {
  subjectId: '',
  day: 1,
  start: '08:00',
  end: '09:30',
  place: '',
  notifyMinutes: 15
};

const RECORD_FORM_DEFAULTS = {
  title: '',
  type: 'trabalho',
  subjectId: '',
  dueDate: '',
  status: 'pendente',
  studyMinutes: 0,
  content: '',
  contentHtml: '<p></p>'
};

function createSubjectForm(overrides = {}) {
  return {
    ...SUBJECT_FORM_DEFAULTS,
    ...overrides
  };
}

function createTimetableForm(overrides = {}) {
  return {
    ...TIMETABLE_FORM_DEFAULTS,
    ...overrides
  };
}

function createRecordForm(overrides = {}) {
  return {
    ...RECORD_FORM_DEFAULTS,
    dueDate: todayISO(),
    ...overrides
  };
}

function defaultState() {
  return {
    settings: {
      theme: 'dark',
      notificationsEnabled: false,
      integrations: {
        openAiModel: 'gpt-4.1-mini'
      }
    },
    profile: {
      name: '',
      email: '',
      course: 'Letras — 1ª Série (2026/B)',
      photo: ''
    },
    focusPlayer: {
      visible: true,
      collapsed: false
    },
    subjects: [
      { id: 'sub-libras', name: 'LIBRAS',                                         professorName: 'Cleidyneth', professorEmail: '', professorContact: '', color: '#E57373' },
      { id: 'sub-lp1',    name: 'Língua Portuguesa I',                            professorName: 'Rosemere',   professorEmail: '', professorContact: '', color: '#81C784' },
      { id: 'sub-li1',    name: 'Língua Inglesa I',                               professorName: 'Évelyn',     professorEmail: '', professorContact: '', color: '#64B5F6' },
      { id: 'sub-iel',    name: 'Introdução aos Estudos Literários',              professorName: 'Estéfano',   professorEmail: '', professorContact: '', color: '#FFB74D' },
      { id: 'sub-agn',    name: 'Apontamentos de Gramática e Estudos Normativos', professorName: 'Gustavo',    professorEmail: '', professorContact: '', color: '#BA68C8' },
      { id: 'sub-hfe',    name: 'História e Filosofia da Educação',               professorName: 'Flávia',     professorEmail: '', professorContact: '', color: '#4DB6AC' },
      { id: 'sub-lpt',    name: 'Leitura e Produção de Textos',                   professorName: 'Adélia',     professorEmail: '', professorContact: '', color: '#F06292' },
      { id: 'sub-lcl',    name: 'Língua e Cultura Latina',                        professorName: 'Gustavo',    professorEmail: '', professorContact: '', color: '#A1887F' },
      { id: 'sub-ipl',    name: 'Iniciação à Pesquisa em Linguagem',              professorName: 'Évelyn',     professorEmail: '', professorContact: '', color: '#90A4AE' },
      { id: 'sub-iling',  name: 'Introdução aos Estudos Linguísticos',            professorName: 'Adélia',     professorEmail: '', professorContact: '', color: '#FFD54F' }
    ],
    timetable: [
      // Segunda-feira
      { id: 'tt-01', subjectId: 'sub-libras', day: 1, start: '19:00', end: '20:40', place: '', notifyMinutes: 15 },
      { id: 'tt-02', subjectId: 'sub-agn',    day: 1, start: '20:50', end: '21:40', place: '', notifyMinutes: 15 },
      { id: 'tt-03', subjectId: 'sub-ipl',    day: 1, start: '21:40', end: '23:20', place: '', notifyMinutes: 15 },
      // Terça-feira
      { id: 'tt-04', subjectId: 'sub-lp1',    day: 2, start: '19:00', end: '20:40', place: '', notifyMinutes: 15 },
      { id: 'tt-05', subjectId: 'sub-hfe',    day: 2, start: '20:50', end: '22:30', place: '', notifyMinutes: 15 },
      { id: 'tt-06', subjectId: 'sub-li1',    day: 2, start: '22:30', end: '23:20', place: '', notifyMinutes: 15 },
      // Quarta-feira
      { id: 'tt-07', subjectId: 'sub-lp1',    day: 3, start: '19:00', end: '20:40', place: '', notifyMinutes: 15 },
      { id: 'tt-08', subjectId: 'sub-lpt',    day: 3, start: '20:50', end: '23:20', place: '', notifyMinutes: 15 },
      // Quinta-feira
      { id: 'tt-09', subjectId: 'sub-li1',    day: 4, start: '19:00', end: '20:40', place: '', notifyMinutes: 15 },
      { id: 'tt-10', subjectId: 'sub-agn',    day: 4, start: '20:50', end: '21:40', place: '', notifyMinutes: 15 },
      { id: 'tt-11', subjectId: 'sub-iling',  day: 4, start: '21:40', end: '23:20', place: '', notifyMinutes: 15 },
      // Sexta-feira
      { id: 'tt-12', subjectId: 'sub-iel',    day: 5, start: '19:00', end: '20:40', place: '', notifyMinutes: 15 },
      { id: 'tt-13', subjectId: 'sub-lcl',    day: 5, start: '20:50', end: '22:30', place: '', notifyMinutes: 15 },
      { id: 'tt-14', subjectId: 'sub-li1',    day: 5, start: '22:30', end: '23:20', place: '', notifyMinutes: 15 }
    ],
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
    ? raw.records.map((record) => {
      const plainContent = asString(record?.content || '');
      const contentHtml = normalizeEditorHtml(record?.contentHtml || plainTextToHtml(plainContent));
      const exportFormat = record?.exportFormat === 'doc' ? 'docx' : record?.exportFormat || 'md';
      return {
        ...record,
        exportFormat,
        emailTo: asString(record?.emailTo || ''),
        content: plainContent || htmlToPlainText(contentHtml),
        contentHtml
      };
    })
    : [];
  merged.studySessions = Array.isArray(raw.studySessions) ? raw.studySessions : [];
  merged.communities = Array.isArray(raw.communities)
    ? raw.communities.map((community) => normalizeCommunity(community))
    : [];

  return merged;
}

// AUTH_KEY removed — no localStorage

const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/email-already-in-use': 'Este e-mail já está em uso.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
  'auth/popup-closed-by-user': 'Login cancelado.',
  'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro provedor.'
};

const appOptions = {
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
      subjectForm: createSubjectForm(),
      subjectEditId: '',
      timetableForm: createTimetableForm(),
      timetableEditId: '',
      eventForm: {
        title: '',
        type: 'prova',
        subjectId: '',
        date: todayISO(),
        time: nowTimeISO(),
        details: '',
        notifyMinutes: 30
      },
      recordForm: createRecordForm(),
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

      // ─── Firestore sync ────────────────────────
      _currentUid: '',
      _persistTimeout: null,

      // ─── Auth ──────────────────────────────────
      authUser: null,
      authLoading: true,
      authEmail: '',
      authPassword: '',

      // ─── Foco & Música ─────────────────────────
      focusPlaylists: CURATED_FOCUS_PLAYLISTS.map((playlist) => ({
        ...playlist,
        tags: [...playlist.tags]
      })),
      activePlaylistIndex: 0,
      customPlaylistUrl: '',
      focusPlayer: {
        visible: true,
        collapsed: false
      },
      focusVisualPreset: 'focus',
      focusVisualPresets: FOCUS_VISUAL_PRESETS,

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
      _threeParticles: null,
      _threeIcos: null,
      _threeBaseParticleY: null,
      _threePointer: { x: 0, y: 0 },
      _threePointerTarget: { x: 0, y: 0 },
      _threeResizeHandler: null,
      _threePointerHandler: null,
      _threePointerLeaveHandler: null,
      _threePointerDownHandler: null,
      _threeBurstUntil: 0
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
          color: 'secondary',
          icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
          trendUp: upcomingEvents > 0,
          trendLabel: upcomingEvents > 0 ? 'próximos dias' : 'nenhum agendado'
        },
        {
          label: 'Pendências',
          value: pendingRecords,
          color: 'primary',
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
      if (!this.focusPlaylists.length) {
        return CURATED_FOCUS_PLAYLISTS[0]?.embedUrl || '';
      }
      const pl = this.focusPlaylists[this.activePlaylistIndex];
      return pl ? pl.embedUrl : this.focusPlaylists[0].embedUrl;
    },
    activeFocusPlaylist() {
      if (!this.focusPlaylists.length) return null;
      return this.focusPlaylists[this.activePlaylistIndex] || this.focusPlaylists[0];
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
          color: '#9A6B4A',
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
          color: '#6366F1',
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
    focusPlayer: {
      deep: true,
      handler(val) {
        this.state.focusPlayer = { ...val };
      }
    },
    'state.settings.theme': {
      immediate: true,
      handler(theme) {
        this.syncTheme(theme);
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
    normalizeThemeName(themeName) {
      const parsed = String(themeName || '').trim().toLowerCase();
      return AVAILABLE_THEMES.has(parsed) ? parsed : 'dark';
    },
    syncTheme(themeName) {
      const normalized = this.normalizeThemeName(themeName);
      document.documentElement.setAttribute('data-theme', normalized);
      const vuetifyTheme = this.$vuetify?.theme;
      if (vuetifyTheme) {
        if (typeof vuetifyTheme.change === 'function') {
          vuetifyTheme.change(normalized);
        } else if (vuetifyTheme.global?.name != null) {
          vuetifyTheme.global.name = normalized;
        }
      }
      if (this.state.settings.theme !== normalized) {
        this.state.settings.theme = normalized;
      }
    },
    async loadStateFromFirestore(uid) {
      const lsFallback = () => {
        try {
          const lsRaw = localStorage.getItem(LS_KEY(uid));
          return lsRaw ? normalizeLoadedState(JSON.parse(lsRaw)) : defaultState();
        } catch { return defaultState(); }
      };
      try {
        const raw = await loadUserData(uid);
        this.state = raw ? normalizeLoadedState(raw) : lsFallback();
      } catch {
        this.state = lsFallback();
      }
      this.syncTheme(this.state.settings.theme);
      this.ensureCommunitySelection();
      this.profileForm.name   = this.state.profile.name   || this.authUser?.name  || '';
      this.profileForm.email  = this.state.profile.email  || this.authUser?.email || '';
      this.profileForm.course = this.state.profile.course;
      this.profileForm.photo  = this.state.profile.photo  || this.authUser?.photo || '';
      if (this.state.focusPlayer) {
        this.focusPlayer = { ...this.state.focusPlayer };
      }
      this.pomodoroConfig = {
        work: this.state.pomodoro.work,
        shortBreak: this.state.pomodoro.shortBreak,
        longBreak: this.state.pomodoro.longBreak,
        cycles: this.state.pomodoro.cycles,
        subjectId: this.state.pomodoro.subjectId
      };
      this.resetPomodoro();
      this.scheduleReminders();
      nextTick(() => this.scrollCommunityMessagesToBottom());
    },
    persistState() {
      this.scheduleReminders();
      if (this._persistTimeout) clearTimeout(this._persistTimeout);
      this._persistTimeout = setTimeout(async () => {
        if (!this._currentUid) return;
        const snapshot = JSON.parse(JSON.stringify(this.state));
        // localStorage — síncrono e sempre disponível (fallback confiável)
        try { localStorage.setItem(LS_KEY(this._currentUid), JSON.stringify(snapshot)); } catch { /* quota */ }
        // Firestore — best-effort
        try { await saveUserData(this._currentUid, snapshot); } catch { /* ignore */ }
      }, 1500);
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
      this.syncTheme(this.state.settings.theme);
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
    resetSubjectForm() {
      this.subjectForm = createSubjectForm();
      this.subjectEditId = '';
    },
    startSubjectEdit(subjectId) {
      const subject = this.state.subjects.find((item) => item.id === subjectId);
      if (!subject) return;
      this.subjectEditId = subject.id;
      this.subjectForm = createSubjectForm({
        name: subject.name,
        professorName: subject.professorName,
        professorEmail: subject.professorEmail,
        professorContact: subject.professorContact,
        color: subject.color
      });
      this.showToast(`Editando matéria: ${subject.name}`);
    },
    cancelSubjectEdit() {
      this.resetSubjectForm();
      this.showToast('Edição de matéria cancelada.');
    },
    addSubject() {
      const payload = {
        name: asString(this.subjectForm.name),
        professorName: asString(this.subjectForm.professorName),
        professorEmail: asString(this.subjectForm.professorEmail),
        professorContact: asString(this.subjectForm.professorContact),
        color: asString(this.subjectForm.color) || '#8C5E43'
      };
      if (!payload.name || !payload.professorName) {
        this.showToast('Informe matéria e professor(a).');
        return;
      }

      if (this.subjectEditId) {
        const target = this.state.subjects.find((item) => item.id === this.subjectEditId);
        if (!target) {
          this.showToast('Matéria não encontrada para edição.');
          return;
        }
        Object.assign(target, payload);
        this.resetSubjectForm();
        this.showToast('Matéria atualizada.');
        return;
      }

      const subject = {
        id: uid(),
        ...payload
      };
      this.state.subjects.push(subject);
      this.resetSubjectForm();
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
      if (this.subjectEditId === subjectId) {
        this.resetSubjectForm();
      }
      this.showToast('Matéria removida com itens relacionados.');
    },
    resetTimetableForm() {
      const fallbackSubjectId = this.timetableForm.subjectId || this.state.subjects[0]?.id || '';
      this.timetableForm = createTimetableForm({ subjectId: fallbackSubjectId });
      this.timetableEditId = '';
    },
    startTimetableEdit(id) {
      const item = this.state.timetable.find((entry) => entry.id === id);
      if (!item) return;
      this.timetableEditId = id;
      this.timetableForm = createTimetableForm({
        subjectId: item.subjectId,
        day: safeNumber(item.day, 1),
        start: item.start,
        end: item.end,
        place: item.place,
        notifyMinutes: safeNumber(item.notifyMinutes, 0)
      });
      this.showToast('Editando horário selecionado.');
    },
    cancelTimetableEdit() {
      this.resetTimetableForm();
      this.showToast('Edição de horário cancelada.');
    },
    addTimetable() {
      if (this.timetableForm.start >= this.timetableForm.end) {
        this.showToast('Horário inválido: o início precisa ser antes do fim.');
        return;
      }

      const payload = {
        subjectId: this.timetableForm.subjectId,
        day: safeNumber(this.timetableForm.day, 1),
        start: this.timetableForm.start,
        end: this.timetableForm.end,
        place: this.timetableForm.place,
        notifyMinutes: safeNumber(this.timetableForm.notifyMinutes, 0)
      };

      if (this.timetableEditId) {
        const target = this.state.timetable.find((item) => item.id === this.timetableEditId);
        if (!target) {
          this.showToast('Horário não encontrado para edição.');
          return;
        }
        Object.assign(target, payload);
        this.resetTimetableForm();
        this.showToast('Horário atualizado.');
        return;
      }

      this.state.timetable.push({
        id: uid(),
        ...payload
      });

      this.resetTimetableForm();
      this.showToast('Horário adicionado.');
    },
    removeTimetable(id) {
      this.state.timetable = this.state.timetable.filter((item) => item.id !== id);
      if (this.timetableEditId === id) {
        this.resetTimetableForm();
      }
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
    setRecordEditorHtml(rawHtml) {
      const normalized = normalizeEditorHtml(rawHtml);
      this.recordEditorHtml = normalized;
      this.recordForm.contentHtml = normalized;
      this.recordForm.content = htmlToPlainText(normalized);
    },
    onRecordEditorInput(rawHtml) {
      this.setRecordEditorHtml(rawHtml);
    },
    applyRecordEditorCommand(command, value = '') {
      const editor = document.getElementById('record-rich-editor');
      if (!editor) return;
      editor.focus();
      document.execCommand(command, false, value);
      this.setRecordEditorHtml(editor.innerHTML);
    },
    resetRecordForm() {
      const fallbackSubjectId = this.recordForm.subjectId || this.state.subjects[0]?.id || '';
      this.recordForm = createRecordForm({ subjectId: fallbackSubjectId });
      this.recordEditId = '';
      this.recordEditorHtml = '<p></p>';
    },
    startRecordEdit(recordId) {
      const record = this.state.records.find((item) => item.id === recordId);
      if (!record) return;
      const contentHtml = normalizeEditorHtml(record.contentHtml || plainTextToHtml(record.content));
      this.recordEditId = record.id;
      this.recordForm = createRecordForm({
        title: record.title,
        type: record.type,
        subjectId: record.subjectId,
        dueDate: record.dueDate,
        status: record.status,
        studyMinutes: safeNumber(record.studyMinutes, 0),
        content: htmlToPlainText(contentHtml),
        contentHtml
      });
      this.recordEditorHtml = contentHtml;
      this.showToast(`Editando trabalho: ${record.title}`);
    },
    cancelRecordEdit() {
      this.resetRecordForm();
      this.showToast('Edição de trabalho cancelada.');
    },
    addRecord() {
      const title = asString(this.recordForm.title);
      if (!title) {
        this.showToast('Informe o título do trabalho.');
        return;
      }

      const contentHtml = normalizeEditorHtml(this.recordEditorHtml || this.recordForm.contentHtml);
      const payload = {
        title,
        type: asString(this.recordForm.type) || 'trabalho',
        subjectId: this.recordForm.subjectId,
        dueDate: this.recordForm.dueDate,
        status: asString(this.recordForm.status) || 'pendente',
        studyMinutes: safeNumber(this.recordForm.studyMinutes, 0),
        content: htmlToPlainText(contentHtml),
        contentHtml
      };

      if (this.recordEditId) {
        const target = this.state.records.find((item) => item.id === this.recordEditId);
        if (!target) {
          this.showToast('Registro não encontrado para edição.');
          return;
        }
        Object.assign(target, payload);
        this.resetRecordForm();
        this.showToast('Registro atualizado.');
        return;
      }

      this.state.records.push({
        id: uid(),
        ...payload,
        exportFormat: 'md',
        emailTo: ''
      });

      if (payload.studyMinutes > 0) {
        this.state.studySessions.push({
          id: uid(),
          subjectId: payload.subjectId,
          minutes: payload.studyMinutes,
          source: 'registro',
          createdAt: new Date().toISOString()
        });
      }

      this.resetRecordForm();
      this.showToast('Registro criado.');
    },
    removeRecord(id) {
      this.state.records = this.state.records.filter((item) => item.id !== id);
      if (this.recordEditId === id) {
        this.resetRecordForm();
      }
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
    recordExportBase(record) {
      const subject = this.subjectName(record.subjectId);
      const contentHtml = normalizeEditorHtml(record.contentHtml || plainTextToHtml(record.content));
      return {
        safeFileName: asString(record.title || 'registro').replace(/\s+/g, '_').toLowerCase(),
        title: asString(record.title),
        type: asString(record.type),
        subject: asString(subject),
        dueDate: this.formatDate(record.dueDate),
        status: asString(record.status),
        contentHtml,
        contentText: htmlToPlainText(contentHtml),
        contentMarkdown: htmlToMarkdown(contentHtml)
      };
    },
    formatRecordText(record, format) {
      const base = this.recordExportBase(record);

      if (format === 'md') {
        return {
          filename: `${base.safeFileName || 'registro'}.md`,
          mime: 'text/markdown;charset=utf-8',
          content: `# ${base.title}\n\n- Tipo: ${base.type}\n- Matéria: ${base.subject}\n- Data limite: ${base.dueDate}\n- Status: ${base.status}\n\n## Conteúdo\n\n${base.contentMarkdown || base.contentText}\n`
        };
      }

      if (format === 'doc') {
        const safeTitle = escapeHtml(base.title);
        const safeType = escapeHtml(base.type);
        const safeSubject = escapeHtml(base.subject);
        const safeDueDate = escapeHtml(base.dueDate);
        const safeStatus = escapeHtml(base.status);
        const safeContent = base.contentHtml;

        return {
          filename: `${base.safeFileName || 'registro'}.doc`,
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
    ${safeContent}
  </body>
</html>
`.trim()
        };
      }

      return {
        filename: `${base.safeFileName || 'registro'}.txt`,
        mime: 'text/plain;charset=utf-8',
        content: `${base.title}\nTipo: ${base.type}\nMatéria: ${base.subject}\nData limite: ${base.dueDate}\nStatus: ${base.status}\n\n${base.contentText}`
      };
    },
    buildDocxParagraphs(contentHtml, { Paragraph, TextRun, HeadingLevel }) {
      if (typeof document === 'undefined') {
        return [new Paragraph(htmlToPlainText(contentHtml) || '')];
      }

      const wrapper = document.createElement('div');
      wrapper.innerHTML = normalizeEditorHtml(contentHtml);
      const blocks = wrapper.querySelectorAll('h1,h2,h3,p,li,blockquote');
      const paragraphs = [];

      blocks.forEach((node) => {
        const text = asString(node.textContent || '');
        if (!text) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'h1') {
          paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }));
          return;
        }
        if (tag === 'h2') {
          paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }));
          return;
        }
        if (tag === 'h3') {
          paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] }));
          return;
        }
        if (tag === 'li') {
          paragraphs.push(new Paragraph({ text, bullet: { level: 0 } }));
          return;
        }
        paragraphs.push(new Paragraph(text));
      });

      if (!paragraphs.length) {
        paragraphs.push(new Paragraph(''));
      }
      return paragraphs;
    },
    async buildRecordDocxBlob(record) {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
      const base = this.recordExportBase(record);
      const contentParagraphs = this.buildDocxParagraphs(base.contentHtml, { Paragraph, TextRun, HeadingLevel });
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun(base.title || 'Registro')]
              }),
              new Paragraph(`Tipo: ${base.type}`),
              new Paragraph(`Matéria: ${base.subject}`),
              new Paragraph(`Data limite: ${base.dueDate}`),
              new Paragraph(`Status: ${base.status}`),
              new Paragraph(''),
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Conteúdo')]
              }),
              ...contentParagraphs
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      return {
        filename: `${base.safeFileName || 'registro'}.docx`,
        blob
      };
    },
    downloadFile(filename, content, mime) {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
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
      const base = this.recordExportBase(record);
      const safeTitle = escapeHtml(base.title || '');
      const safeType = escapeHtml(base.type || '');
      const safeSubject = escapeHtml(base.subject || '');
      const safeDueDate = escapeHtml(base.dueDate || '');
      const safeStatus = escapeHtml(base.status || '');
      const safeContent = base.contentHtml;
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
    async exportRecord(record) {
      const format = record.exportFormat || 'md';
      if (format === 'pdf') {
        this.printRecordAsPdf(record);
        this.showToast('Janela de PDF aberta. Salve como PDF no diálogo de impressão.');
        return;
      }

      if (format === 'docx') {
        const { filename, blob } = await this.buildRecordDocxBlob(record);
        this.downloadFile(
          filename,
          blob,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        this.showToast(`Arquivo ${filename} exportado.`);
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
      const base = this.recordExportBase(record);
      const subject = `Future Academy - ${record.title} (${format.toUpperCase()})`;
      const body = `Olá,\n\nResumo do trabalho:\n\n${base.contentText}\n\nObservação: para ${format.toUpperCase()}, use o botão Exportar no app.\n\nEnviado via Future Academy.`;
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
      const canvas =
        (this.$refs && this.$refs.studyChart) ||
        document.getElementById('study-chart-canvas');
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
      const ref =
        (this.$refs && this.$refs.communityMessages) ||
        document.getElementById('community-messages-log');
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
        'Sem comando: mensagem vai direto para a IA via backend.',
        'Se der erro de configuração, confira as variáveis no arquivo .env do servidor.'
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
        } else {
          const answer = await this.fetchOpenAiReply(community, text);
          this.appendCommunityMessage(community.id, 'assistant', answer, 'openai');
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
      const query = String(searchText || '').trim();
      if (!query) {
        return 'Informe um termo de busca para o Spotify.';
      }

      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&limit=5`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return data?.error || `Falha ao consultar Spotify (${response.status}).`;
      }

      const data = await response.json();
      const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
      if (!tracks.length) {
        return `Nenhuma faixa encontrada para "${query}".`;
      }

      const lines = tracks.map((track, index) => {
        const artists = Array.isArray(track.artists) && track.artists.length
          ? track.artists.join(', ')
          : 'Artista desconhecido';
        const url = track.url ? ` (${track.url})` : '';
        return `${index + 1}. ${track.name} - ${artists}${url}`;
      });

      return [`Resultados Spotify para "${query}":`, ...lines].join('\n');
    },
    async fetchExchangeRate(amount, fromCurrency, toCurrency) {
      const from = String(fromCurrency || '').toUpperCase();
      const to = String(toCurrency || '').toUpperCase();
      const numericAmount = safeNumber(amount, NaN);
      if (!Number.isFinite(numericAmount)) {
        return 'Valor inválido para conversão.';
      }

      const endpoint = `/api/exchange?amount=${encodeURIComponent(
        numericAmount
      )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return data?.error || `Falha ao consultar câmbio (${response.status}).`;
      }

      const data = await response.json();
      const converted = safeNumber(data.converted, NaN);
      const rate = safeNumber(data.rate, NaN);
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
      const model = this.state.settings.integrations.openAiModel || 'gpt-4.1-mini';
      const recentHistory = (community.messages || [])
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-8)
        .map((message) => {
          const roleLabel = message.role === 'user' ? 'Usuário' : 'Assistente';
          return `${roleLabel}: ${message.text}`;
        })
        .join('\n');

      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          communityName: community.name,
          recentHistory
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage = data?.error || `falha HTTP ${response.status}`;
        return `OpenAI não respondeu: ${apiMessage}`;
      }
      return String(data?.text || '').trim() || 'A OpenAI retornou uma resposta vazia.';
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
      // Salvar imediatamente — não esperar o debounce
      if (this._persistTimeout) { clearTimeout(this._persistTimeout); this._persistTimeout = null; }
      const snapshot = JSON.parse(JSON.stringify(this.state));
      if (this._currentUid) {
        // localStorage — síncrono e confiável
        try { localStorage.setItem(LS_KEY(this._currentUid), JSON.stringify(snapshot)); } catch { /* quota */ }
        // Firestore — best-effort
        saveUserData(this._currentUid, snapshot).catch(() => {});
      }
      this.showToast('Perfil atualizado.');
    },
    onPhotoChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        this.profileForm.photo = compressed;
        this.state.profile.photo = compressed;
        // Salvar imediatamente — não esperar o debounce
        if (this._persistTimeout) { clearTimeout(this._persistTimeout); this._persistTimeout = null; }
        const snapshot = JSON.parse(JSON.stringify(this.state));
        if (this._currentUid) {
          try { localStorage.setItem(LS_KEY(this._currentUid), JSON.stringify(snapshot)); } catch { /* quota */ }
          saveUserData(this._currentUid, snapshot).catch(() => {});
        }
        this.showToast('Foto de perfil atualizada.');
      };
      img.src = url;
    },

    // ─── Auth Methods ──────────────────────────────────────────────────
    _getFirebaseErrorMessage(error) {
      return FIREBASE_ERROR_MESSAGES[error?.code] || error?.message || 'Erro desconhecido. Tente novamente.';
    },
    async loginWithGoogle() {
      this.authLoading = true;
      try {
        const result = await signInWithPopup(auth, googleProvider);
        this.authUser = normalizeFirebaseUser(result.user);
        this.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
      } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          this.showToast(this._getFirebaseErrorMessage(error));
        }
      } finally {
        this.authLoading = false;
      }
    },
    async loginWithFacebook() {
      this.authLoading = true;
      try {
        const result = await signInWithPopup(auth, facebookProvider);
        this.authUser = normalizeFirebaseUser(result.user);
        this.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
      } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          this.showToast(this._getFirebaseErrorMessage(error));
        }
      } finally {
        this.authLoading = false;
      }
    },
    async loginWithEmail(mode, displayName, passwordConfirm) {
      if (!this.authEmail || !this.authPassword) {
        this.showToast('Preencha e-mail e senha.');
        return;
      }
      if (mode === 'register' && this.authPassword !== passwordConfirm) {
        this.showToast('As senhas não coincidem.');
        return;
      }
      this.authLoading = true;
      try {
        let result;
        if (mode === 'register') {
          result = await createUserWithEmailAndPassword(auth, this.authEmail, this.authPassword);
          if (displayName) {
            await updateProfile(result.user, { displayName });
          }
        } else {
          result = await signInWithEmailAndPassword(auth, this.authEmail, this.authPassword);
        }
        this.authUser = normalizeFirebaseUser(result.user);
        if (displayName && mode === 'register') {
          this.authUser.name = displayName;
        }
        this.authEmail = '';
        this.authPassword = '';
        this.showToast(mode === 'register' ? `Conta criada! Bem-vindo(a), ${this.authUser.name}!` : `Bem-vindo(a), ${this.authUser.name}!`);
      } catch (error) {
        this.showToast(this._getFirebaseErrorMessage(error));
      } finally {
        this.authLoading = false;
      }
    },
    async logout() {
      // Flush pending write before signing out
      if (this._persistTimeout) {
        clearTimeout(this._persistTimeout);
        this._persistTimeout = null;
        if (this._currentUid) {
          try { await saveUserData(this._currentUid, JSON.parse(JSON.stringify(this.state))); } catch { /* ignore */ }
        }
      }
      try { await signOut(auth); } catch { /* ignore */ }
      this.authUser = null;
      this._currentUid = '';
      this.state = defaultState();
      this.showToast('Até logo! Sessão encerrada.');
    },

    // ─── Foco & Música Methods ────────────────────────────────────────
    openFocusPlayer() {
      this.focusPlayer.visible = true;
      this.focusPlayer.collapsed = false;
    },
    closeFocusPlayer() {
      this.focusPlayer.visible = false;
    },
    toggleFocusPlayerCollapse() {
      this.focusPlayer.collapsed = !this.focusPlayer.collapsed;
    },
    selectPlaylist(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.focusPlaylists.length) {
        return;
      }
      this.activePlaylistIndex = index;
      this.openFocusPlayer();
      const selected = this.focusPlaylists[index];
      this.showToast(`Playlist "${selected.name}" selecionada.`);
    },
    setFocusVisualPreset(preset) {
      const found = this.focusVisualPresets.find((item) => item.value === preset);
      if (!found) return;
      this.focusVisualPreset = found.value;
      this.showToast(`Visual 3D em modo "${found.label}".`);
    },
    openCurrentSpotify() {
      if (!this.activeFocusPlaylist?.openUrl) {
        this.showToast('Não há playlist ativa para abrir.');
        return;
      }
      window.open(this.activeFocusPlaylist.openUrl, '_blank', 'noopener');
    },
    loadCustomPlaylist() {
      const url = String(this.customPlaylistUrl || '').trim();
      if (!url) {
        this.showToast('Cole uma URL do Spotify para carregar.');
        return;
      }

      const match = url.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (!match) {
        this.showToast('URL inválida. Use um link do Spotify (playlist, álbum ou faixa).');
        return;
      }

      const [, type, id] = match;
      const readableType = type === 'track' ? 'Faixa' : type === 'album' ? 'Álbum' : 'Playlist';
      const customEntry = createFocusPlaylist({
        name: `${readableType} personalizada`,
        description: 'Fonte importada manualmente para a sessão de foco.',
        mediaType: type,
        spotifyUri: id,
        frequency: 'Personalizada',
        duration: 'Livre',
        bestFor: 'Sessões customizadas com seu próprio acervo',
        energy: 'Variável',
        tags: ['Personalizada', 'Spotify']
      });

      this.focusPlaylists.push(customEntry);
      this.activePlaylistIndex = this.focusPlaylists.length - 1;
      this.customPlaylistUrl = '';
      this.openFocusPlayer();
      this.showToast(`${readableType} personalizada carregada no player.`);
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

        this.timetableImport.rawText = text.slice(0, 20000);
        this.timetableImport.status = 'Analisando com Inteligência Artificial...';

        const req = await fetch('/api/parse-timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: this.timetableImport.rawText })
        });

        const data = await req.json();
        if (!req.ok) throw new Error(data.error || 'Falha na IA');

        this.timetableImport.parsed = data.timetable || [];
        this.timetableImport.newSubjects = data.subjects || [];

        if (this.timetableImport.parsed.length) {
          this.timetableImport.status = `${this.timetableImport.parsed.length} horário(s) encontrado(s) pela IA. Revise e confirme a importação.`;
        } else {
          this.timetableImport.status = 'Nenhum horário identificado pela IA. Veja o texto extraído abaixo e cadastre manualmente.';
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
      const entries = this.timetableImport.parsed || [];
      const newSubjects = this.timetableImport.newSubjects || [];
      if (!entries.length) {
        this.showToast('Nenhum horário para importar.');
        return;
      }

      // Register new subjects
      const subjectMap = {};
      newSubjects.forEach((ns) => {
        let existing = this.state.subjects.find((s) =>
          s.name.toLowerCase().trim() === (ns.name || '').toLowerCase().trim()
        );
        if (!existing) {
          existing = createSubjectForm({
            id: uid(),
            name: ns.name || 'Matéria importada',
            professorName: ns.professorName || ''
          });
          this.state.subjects.push(existing);
        }
        subjectMap[(ns.name || '').toLowerCase().trim()] = existing.id;
      });

      entries.forEach((entry) => {
        const subjectName = (entry.subjectName || '').toLowerCase().trim();
        let subjectId = subjectMap[subjectName];

        // Match existing ones if not in newSubjects
        if (!subjectId) {
          const fallbackMatched = this.state.subjects.find((s) =>
            entry.subjectName && s.name.toLowerCase().includes(subjectName)
          );
          subjectId = fallbackMatched?.id || (this.state.subjects[0]?.id || '');
        }

        this.state.timetable.push(createTimetableForm({
          id: uid(),
          subjectId: subjectId,
          day: entry.day,
          start: entry.start || '00:00',
          end: entry.end || '01:00',
          place: entry.place || '',
          notifyMinutes: 15
        }));
      });

      this.showToast(`${entries.length} horário(s) importado(s) com sucesso!`);
      this.timetableImport.parsed = [];
      this.timetableImport.newSubjects = [];
      this.timetableImport.rawText = '';
      this.timetableImport.status = '';
    },

    // ─── 3D Scene Methods ─────────────────────────────────────────────
    async init3DScene() {
      if (this._threeRenderer) {
        this.destroy3DScene();
      }

      const canvas = document.getElementById('bg-canvas-3d');
      if (!canvas) return;

      const THREE = await import('three');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 5.3);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearAlpha(0);

      // Create particles
      const particleCount = 420;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      this._threeBaseParticleY = new Float32Array(particleCount);

      const goldColors = [
        [0.95, 0.77, 0.41], // Bright gold (gold-400)
        [0.83, 0.68, 0.21], // Refined gold (gold-500)
        [0.69, 0.55, 0.15], // Darker gold (gold-600)
        [0.95, 0.61, 0.07]  // Orange accent (orange-500)
      ];

      for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 14;
        const y = (Math.random() - 0.5) * 9;
        const z = (Math.random() - 0.5) * 10;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        this._threeBaseParticleY[i] = y;

        const color = goldColors[Math.floor(Math.random() * goldColors.length)];
        colors[i * 3] = color[0];
        colors[i * 3 + 1] = color[1];
        colors[i * 3 + 2] = color[2];
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // Add floating wireframe solids
      const icoGeo = new THREE.IcosahedronGeometry(0.66, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37, // gold-500
        wireframe: true,
        transparent: true,
        opacity: 0.25
      });
      const ico1 = new THREE.Mesh(icoGeo, icoMat);
      ico1.position.set(-2.5, 1.5, -2);
      ico1.userData.baseY = ico1.position.y;
      scene.add(ico1);

      const ico2Geo = new THREE.IcosahedronGeometry(0.45, 1);
      const ico2Mat = new THREE.MeshBasicMaterial({
        color: 0xf3c669, // gold-400
        wireframe: true,
        transparent: true,
        opacity: 0.22
      });
      const ico2 = new THREE.Mesh(ico2Geo, ico2Mat);
      ico2.position.set(2.8, -1.2, -1.5);
      ico2.userData.baseY = ico2.position.y;
      scene.add(ico2);

      // Torus knot and orbit ring
      const torusGeo = new THREE.TorusKnotGeometry(0.55, 0.14, 100, 12);
      const torusMat = new THREE.MeshBasicMaterial({
        color: 0xf39c12, // orange-500
        wireframe: true,
        transparent: true,
        opacity: 0.16
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.position.set(3, 2, -3);
      torus.userData.baseY = torus.position.y;
      scene.add(torus);

      const ringGeo = new THREE.TorusGeometry(1.12, 0.02, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xb08d27, // gold-600
        transparent: true,
        opacity: 0.18
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(-3.1, -1.9, -2.8);
      ring.rotation.x = Math.PI * 0.28;
      ring.userData.baseY = ring.position.y;
      scene.add(ring);

      this._threeScene = markRaw(scene);
      this._threeCamera = markRaw(camera);
      this._threeRenderer = markRaw(renderer);
      this._threeParticles = markRaw(particles);
      this._threeIcos = markRaw([ico1, ico2, torus, ring]);

      // Handle resize
      this._threeResizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', this._threeResizeHandler);

      this._threePointerHandler = (event) => {
        this._threePointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
        this._threePointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
      };

      this._threePointerLeaveHandler = () => {
        this._threePointerTarget.x = 0;
        this._threePointerTarget.y = 0;
      };

      this._threePointerDownHandler = () => {
        this._threeBurstUntil = performance.now() + 900;
      };

      window.addEventListener('pointermove', this._threePointerHandler, { passive: true });
      window.addEventListener('pointerdown', this._threePointerDownHandler, { passive: true });
      window.addEventListener('mouseout', this._threePointerLeaveHandler);

      this.animate3D();
    },
    animate3D() {
      if (!this._threeRenderer || !this._threeScene || !this._threeCamera) return;
      this._threeAnimationId = requestAnimationFrame(() => this.animate3D());

      const now = performance.now();
      const time = now * 0.001;
      const mode = this.focusVisualPreset;
      const modeScale = mode === 'deep' ? 1.42 : mode === 'calm' ? 0.68 : 1;
      const burstScale = this._threeBurstUntil > now ? 1.3 : 1;
      const pulse = modeScale * burstScale;

      this._threePointer.x += (this._threePointerTarget.x - this._threePointer.x) * 0.06;
      this._threePointer.y += (this._threePointerTarget.y - this._threePointer.y) * 0.06;
      this._threeCamera.position.x = this._threePointer.x * 0.58;
      this._threeCamera.position.y = this._threePointer.y * 0.36;
      this._threeCamera.lookAt(0, 0, 0);

      // Rotate particles slowly
      if (this._threeParticles) {
        this._threeParticles.rotation.y = time * 0.08 * pulse;
        this._threeParticles.rotation.x = Math.sin(time * 0.32) * 0.14;

        const positions = this._threeParticles.geometry.attributes.position;
        if (positions && this._threeBaseParticleY) {
          for (let i = 0; i < positions.count; i++) {
            const x = positions.array[i * 3];
            const offset = Math.sin(time * pulse + i * 0.13 + x * 0.35) * 0.04 * modeScale;
            positions.array[i * 3 + 1] = this._threeBaseParticleY[i] + offset;
          }
          positions.needsUpdate = true;
        }
      }

      // Rotate wireframe shapes
      if (this._threeIcos) {
        this._threeIcos.forEach((mesh, idx) => {
          mesh.rotation.x += 0.0014 * (1 + idx * 0.15) * pulse;
          mesh.rotation.y += 0.0012 * (1 + idx * 0.1) * pulse;
          mesh.position.y = mesh.userData.baseY + Math.sin(time * (0.9 + idx * 0.22)) * 0.16 * modeScale;
          const waveScale = 1 + Math.sin(time * (1.25 + idx * 0.12)) * 0.05 * pulse;
          mesh.scale.setScalar(waveScale);
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
        this._threeResizeHandler = null;
      }
      if (this._threePointerHandler) {
        window.removeEventListener('pointermove', this._threePointerHandler);
        this._threePointerHandler = null;
      }
      if (this._threePointerDownHandler) {
        window.removeEventListener('pointerdown', this._threePointerDownHandler);
        this._threePointerDownHandler = null;
      }
      if (this._threePointerLeaveHandler) {
        window.removeEventListener('mouseout', this._threePointerLeaveHandler);
        this._threePointerLeaveHandler = null;
      }
      if (this._threeParticles) {
        this._threeParticles.geometry?.dispose();
        this._threeParticles.material?.dispose();
        this._threeParticles = null;
      }
      if (Array.isArray(this._threeIcos)) {
        this._threeIcos.forEach((mesh) => {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material?.dispose?.());
          } else {
            mesh.material?.dispose?.();
          }
        });
      }
      if (this._threeRenderer) {
        this._threeRenderer.forceContextLoss?.();
        this._threeRenderer.dispose();
        this._threeRenderer = null;
      }
      this._threeScene = null;
      this._threeCamera = null;
      this._threeIcos = null;
      this._threeBaseParticleY = null;
      this._threePointer = { x: 0, y: 0 };
      this._threePointerTarget = { x: 0, y: 0 };
    }
  },
  mounted() {
    // Apply default theme while Firestore loads
    this.syncTheme(this.state.settings.theme);

    // Init 3D scene (independent of user data)
    nextTick(() => this.init3DScene());

    // ─── Firebase Auth → Firestore state ───────────────
    this._authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        this.authUser = normalizeFirebaseUser(firebaseUser);
        this._currentUid = firebaseUser.uid;
        await this.loadStateFromFirestore(firebaseUser.uid);
      } else {
        this.authUser = null;
        this._currentUid = '';
        this.state = defaultState();
      }
      this.authLoading = false;
    });
  },
  beforeUnmount() {
    if (this._authUnsubscribe) {
      this._authUnsubscribe();
    }
    if (this._persistTimeout) {
      clearTimeout(this._persistTimeout);
      this._persistTimeout = null;
    }
    if (this.pomodoroIntervalId) {
      clearInterval(this.pomodoroIntervalId);
    }
    this.clearReminderTimeouts();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.destroy3DScene();
  }
};

export default appOptions;
