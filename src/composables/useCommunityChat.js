import { reactive, computed, nextTick } from 'vue';
import { useUserStore } from '../stores/useUserStore';
import { useCommunitiesStore } from '../stores/useCommunitiesStore';
import { useAppStore } from '../stores/useAppStore';
import { uid, safeNumber } from '../utils/helpers';
import { parseDateTime } from '../utils/date';
import { useDebouncedPersist } from './useDebouncedPersist';

export function useCommunityChat() {
    const userStore = useUserStore();
    const communitiesStore = useCommunitiesStore();
    const persist = useDebouncedPersist(500);
    const appStore = useAppStore();

    const communityChat = reactive({
        selectedCommunityId: '',
        message: '',
        busy: false
    });

    const selectedCommunity = computed(() => {
        return communitiesStore.communities.find((c) => c.id === communityChat.selectedCommunityId) || null;
    });

    const selectedCommunityMessages = computed(() => {
        if (!selectedCommunity.value) return [];
        return [...(selectedCommunity.value.messages || [])].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeA - timeB;
        });
    });

    const buildCommunityWelcomeMessage = (name) => {
        return [
            {
                id: uid(),
                role: 'system',
                source: 'system',
                text: `Bem-vindo(a) à comunidade "${name}"! Digite /ajuda para ver os comandos disponíveis.`,
                createdAt: new Date().toISOString()
            }
        ];
    };

    const addCommunity = (communityForm) => {
        const members = communityForm.emails
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean);

        const newCommunity = {
            id: uid(),
            name: communityForm.name,
            description: communityForm.description,
            members,
            messages: buildCommunityWelcomeMessage(communityForm.name),
            createdAt: new Date().toISOString()
        };
        communitiesStore.communities.push(newCommunity);
        persist();

        communityChat.selectedCommunityId = newCommunity.id;
        appStore.showToast('Comunidade criada.');
    };

    const ensureCommunitySelection = () => {
        if (!communitiesStore.communities.length) {
            communityChat.selectedCommunityId = '';
            return;
        }
        const alreadySelected = communitiesStore.communities.some(
            (c) => c.id === communityChat.selectedCommunityId
        );
        if (!alreadySelected) {
            communityChat.selectedCommunityId = communitiesStore.communities[0].id;
        }
    };

    const removeCommunity = (id) => {
        const wasSelected = communityChat.selectedCommunityId === id;
        communitiesStore.communities = communitiesStore.communities.filter((item) => item.id !== id);
        persist();
        if (wasSelected) ensureCommunitySelection();
        appStore.showToast('Comunidade removida.');
    };

    const scrollCommunityMessagesToBottom = () => {
        const ref = document.getElementById('community-messages-log');
        if (!ref) return;
        ref.scrollTop = ref.scrollHeight;
    };

    const selectCommunity = (communityId) => {
        communityChat.selectedCommunityId = communityId;
        nextTick(() => scrollCommunityMessagesToBottom());
    };

    const inviteCommunity = (community) => {
        const recipients = Array.isArray(community.members) ? community.members.join(',') : '';
        const subject = `Convite para comunidade de estudos: ${community.name}`;
        const body = `Olá!\n\nVocê foi convidado(a) para participar da comunidade "${community.name}" no Future Academy.\n\nDescrição: ${community.description}\n\nNos vemos nos estudos!`;
        window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        appStore.showToast('Rascunho de convite por e-mail aberto.');
    };

    const communityRoleLabel = (role) => {
        if (role === 'user') return 'Você';
        if (role === 'assistant') return 'Assistente';
        return 'Sistema';
    };

    const formatDateTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('pt-BR');
    };

    const appendCommunityMessage = (communityId, role, text, source = 'chat') => {
        const messageText = String(text || '').trim();
        if (!messageText) return;
        const community = communitiesStore.communities.find((item) => item.id === communityId);
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
        persist();
        nextTick(() => scrollCommunityMessagesToBottom());
    };

    const prefillCommunityCommand = (command) => {
        communityChat.message = command;
    };

    const communityHelpMessage = () => {
        return [
            'Comandos disponíveis:',
            '/tempo <cidade> - consulta o clima atual (Open-Meteo).',
            '/spotify <busca> - lista faixas no Spotify.',
            '/cambio <valor> <moeda_origem> <moeda_destino> - ex: /cambio 100 USD BRL.',
            '/ia <pergunta> - responde com OpenAI.',
            'Sem comando: mensagem vai direto para a IA via backend.',
            'Se der erro de configuração, confira as variáveis no arquivo .env do servidor.'
        ].join('\n');
    };

    const fetchWeatherForCity = async (cityName) => {
        const query = String(cityName || '').trim();
        if (!query) return 'Informe uma cidade para consultar o clima.';
        try {
            const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
            geocodeUrl.searchParams.set('name', query);
            geocodeUrl.searchParams.set('count', '1');
            geocodeUrl.searchParams.set('language', 'pt');
            geocodeUrl.searchParams.set('format', 'json');

            const geocodeResponse = await fetch(geocodeUrl.toString());
            if (!geocodeResponse.ok) return `Falha ao consultar localidade (${geocodeResponse.status}).`;

            const geocodeData = await geocodeResponse.json();
            const place = Array.isArray(geocodeData.results) ? geocodeData.results[0] : null;
            if (!place) return `Não encontrei a cidade "${query}".`;

            const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
            weatherUrl.searchParams.set('latitude', String(place.latitude));
            weatherUrl.searchParams.set('longitude', String(place.longitude));
            weatherUrl.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m');
            weatherUrl.searchParams.set('timezone', 'auto');

            const weatherResponse = await fetch(weatherUrl.toString());
            if (!weatherResponse.ok) return `Falha ao consultar clima (${weatherResponse.status}).`;

            const weatherData = await weatherResponse.json();
            const current = weatherData.current;
            if (!current) return 'Não foi possível obter clima atual para essa cidade.';

            const codeMapping = { 0: 'Céu limpo', 1: 'Parcialmente nublado', 2: 'Nublado', 3: 'Coberto', 45: 'Nevoeiro', 48: 'Nevoeiro com geada', 51: 'Chuvisco leve', 53: 'Chuvisco moderado', 55: 'Chuvisco denso', 56: 'Chuvisco congelante leve', 57: 'Chuvisco congelante denso', 61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte', 66: 'Chuva congelante leve', 67: 'Chuva congelante forte', 71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve forte', 77: 'Grãos de neve', 80: 'Pancada de chuva leve', 81: 'Pancada de chuva moderada', 82: 'Pancada de chuva violenta', 85: 'Pancada de neve leve', 86: 'Pancada de neve forte', 95: 'Trovoada', 96: 'Trovoada com granizo leve', 99: 'Trovoada com granizo forte' };
            const codeLabel = codeMapping[current.weather_code] || `Código ${current.weather_code}`;

            const cityLabel = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
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
        } catch (e) {
            return `Erro ao consultar clima: ${e.message}`;
        }
    };

    const fetchSpotifyTracks = async (searchText) => {
        const query = String(searchText || '').trim();
        if (!query) return 'Informe um termo de busca para o Spotify.';
        try {
            const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=5`);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return data?.error || `Falha ao consultar Spotify (${response.status}).`;
            }
            const data = await response.json();
            const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
            if (!tracks.length) return `Nenhuma faixa encontrada para "${query}".`;
            const lines = tracks.map((track, index) => {
                const artists = Array.isArray(track.artists) && track.artists.length ? track.artists.join(', ') : 'Artista desconhecido';
                const url = track.url ? ` (${track.url})` : '';
                return `${index + 1}. ${track.name} - ${artists}${url}`;
            });
            return [`Resultados Spotify para "${query}":`, ...lines].join('\n');
        } catch (e) {
            return `Erro ao consultar Spotify: ${e.message}`;
        }
    };

    const fetchExchangeRate = async (amount, fromCurrency, toCurrency) => {
        const from = String(fromCurrency || '').toUpperCase();
        const to = String(toCurrency || '').toUpperCase();
        const numericAmount = safeNumber(amount, NaN);
        if (!Number.isFinite(numericAmount) || !from || !to) {
            return 'Valor inválido para conversão. Uso: /cambio <valor> <origem> <destino>.';
        }
        try {
            const endpoint = `/api/exchange?amount=${encodeURIComponent(numericAmount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
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
        } catch (e) {
            return `Erro ao consultar câmbio: ${e.message}`;
        }
    };

    const fetchOpenAiReply = async (community, prompt) => {
        const model = userStore.settings.integrations.openAiModel || 'gpt-4o-mini';
        const recentHistory = (community.messages || [])
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .slice(-8)
            .map((message) => {
                const roleLabel = message.role === 'user' ? 'Usuário' : 'Assistente';
                return `${roleLabel}: ${message.text}`;
            })
            .join('\n');

        try {
            const response = await fetch('/api/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        } catch (e) {
            return `Erro ao consultar OpenAI: ${e.message}`;
        }
    };

    const processCommunityCommand = async (community, commandLine) => {
        const [commandRaw, ...rest] = commandLine.trim().split(/\s+/);
        const command = (commandRaw || '').toLowerCase();
        const payload = rest.join(' ').trim();

        if (command === '/ajuda') {
            appendCommunityMessage(community.id, 'assistant', communityHelpMessage(), 'system');
            return;
        }
        if (command === '/tempo') {
            if (!payload) {
                appendCommunityMessage(community.id, 'assistant', 'Uso: /tempo <cidade>. Exemplo: /tempo Recife', 'weather');
                return;
            }
            const weatherText = await fetchWeatherForCity(payload);
            appendCommunityMessage(community.id, 'assistant', weatherText, 'weather');
            return;
        }
        if (command === '/spotify') {
            if (!payload) {
                appendCommunityMessage(community.id, 'assistant', 'Uso: /spotify <busca>. Exemplo: /spotify lo-fi study', 'spotify');
                return;
            }
            const spotifyText = await fetchSpotifyTracks(payload);
            appendCommunityMessage(community.id, 'assistant', spotifyText, 'spotify');
            return;
        }
        if (command === '/cambio' || command === '/câmbio') {
            const [rawAmount, rawFrom, rawTo] = payload.split(/\s+/);
            const exchangeText = await fetchExchangeRate(rawAmount, rawFrom, rawTo);
            appendCommunityMessage(community.id, 'assistant', exchangeText, 'exchange');
            return;
        }
        if (command === '/ia') {
            if (!payload) {
                appendCommunityMessage(community.id, 'assistant', 'Uso: /ia <pergunta>. Exemplo: /ia monte um cronograma de revisão para esta semana.', 'openai');
                return;
            }
            const answer = await fetchOpenAiReply(community, payload);
            appendCommunityMessage(community.id, 'assistant', answer, 'openai');
            return;
        }

        appendCommunityMessage(community.id, 'assistant', `Comando não reconhecido: ${command}\n\n${communityHelpMessage()}`, 'system');
    };

    const sendCommunityMessage = async () => {
        if (communityChat.busy) {
            appStore.showToast('Aguarde a resposta atual terminar.');
            return;
        }
        const community = selectedCommunity.value;
        if (!community) {
            appStore.showToast('Crie e selecione uma comunidade primeiro.');
            return;
        }
        const text = communityChat.message.trim();
        if (!text) return;

        appendCommunityMessage(community.id, 'user', text, 'user');
        communityChat.message = '';
        communityChat.busy = true;

        try {
            if (text.startsWith('/')) {
                await processCommunityCommand(community, text);
            } else {
                const answer = await fetchOpenAiReply(community, text);
                appendCommunityMessage(community.id, 'assistant', answer, 'openai');
            }
        } catch (error) {
            const details = error instanceof Error ? error.message : 'falha inesperada.';
            appendCommunityMessage(community.id, 'assistant', `Não consegui concluir essa solicitação: ${details}`, 'error');
        } finally {
            communityChat.busy = false;
        }
    };

    return {
        communityChat,
        selectedCommunity,
        selectedCommunityMessages,
        addCommunity,
        removeCommunity,
        inviteCommunity,
        selectCommunity,
        scrollCommunityMessagesToBottom,
        communityRoleLabel,
        formatDateTime,
        prefillCommunityCommand,
        sendCommunityMessage
    };
}
