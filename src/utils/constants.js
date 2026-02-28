export const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const DAY_OPTIONS = [
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
];

export const OFFICIAL_SOURCES = [
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

export const DEFAULT_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#87b6e5"/><stop offset="1" stop-color="#2d5f96"/></linearGradient></defs><rect width="240" height="240" rx="28" fill="url(#g)"/><circle cx="120" cy="92" r="40" fill="#f4f9ff"/><rect x="60" y="142" width="120" height="62" rx="30" fill="#f4f9ff"/></svg>'
    );

export const WEATHER_CODE_LABELS = {
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

export const AVAILABLE_THEMES = new Set(['light', 'dark']);

export const FOCUS_VISUAL_PRESETS = [
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

export function buildSpotifyEmbed(mediaType, spotifyUri) {
    return `https://open.spotify.com/embed/${mediaType}/${spotifyUri}?utm_source=generator&theme=0`;
}

export function createFocusPlaylist(entry) {
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

export const CURATED_FOCUS_PLAYLISTS = [
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

export const SUBJECT_FORM_DEFAULTS = {
    name: '',
    professorName: '',
    professorEmail: '',
    professorContact: '',
    color: '#8C5E43'
};

export const TIMETABLE_FORM_DEFAULTS = {
    subjectId: '',
    day: 1,
    start: '08:00',
    end: '09:30',
    place: '',
    notifyMinutes: 15
};

export const RECORD_FORM_DEFAULTS = {
    title: '',
    type: 'trabalho',
    subjectId: '',
    dueDate: '',
    status: 'pendente',
    studyMinutes: 0,
    content: '',
    contentHtml: '<p></p>'
};

export const FIREBASE_ERROR_MESSAGES = {
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
