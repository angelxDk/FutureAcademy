import { requireEnv, cleanErrorMessage } from '../utils.js';

const spotifyTokenCache = {
    accessToken: '',
    expiresAt: 0
};

async function getSpotifyAccessToken(forceRefresh = false) {
    const staticToken = String(process.env.SPOTIFY_ACCESS_TOKEN || '').trim();
    if (staticToken) {
        return staticToken;
    }

    const now = Date.now();
    if (!forceRefresh && spotifyTokenCache.accessToken && spotifyTokenCache.expiresAt > now + 10_000) {
        return spotifyTokenCache.accessToken;
    }

    const clientId = requireEnv('SPOTIFY_CLIENT_ID');
    const clientSecret = requireEnv('SPOTIFY_CLIENT_SECRET');
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' })
    });

    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData?.access_token) {
        const apiError = tokenData?.error_description || tokenData?.error || `HTTP ${tokenResponse.status}`;
        throw new Error(`Não foi possível autenticar no Spotify: ${apiError}`);
    }

    const expiresIn = Number(tokenData.expires_in || 3600);
    spotifyTokenCache.accessToken = tokenData.access_token;
    spotifyTokenCache.expiresAt = now + expiresIn * 1000;

    return spotifyTokenCache.accessToken;
}

async function searchSpotifyTracks(query, limit = 5, forceRefresh = false) {
    const token = await getSpotifyAccessToken(forceRefresh);
    const spotifyUrl = new URL('https://api.spotify.com/v1/search');
    spotifyUrl.searchParams.set('q', query);
    spotifyUrl.searchParams.set('type', 'track');
    spotifyUrl.searchParams.set('limit', String(limit));
    spotifyUrl.searchParams.set('market', 'BR');

    const response = await fetch(spotifyUrl.toString(), {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 && !process.env.SPOTIFY_ACCESS_TOKEN && !forceRefresh) {
        return searchSpotifyTracks(query, limit, true);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const apiError = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Spotify falhou: ${apiError}`);
    }

    const tracks = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];
    return tracks.map((track) => ({
        name: track?.name || 'Faixa sem nome',
        artists: Array.isArray(track?.artists)
            ? track.artists.map((artist) => artist.name).filter(Boolean)
            : [],
        url: track?.external_urls?.spotify || ''
    }));
}

export const searchTracks = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        const limit = Math.min(10, Math.max(1, Number(req.query.limit || 5)));
        if (!query) {
            return res.status(400).json({ error: 'Informe o parâmetro q com o termo de busca.' });
        }

        const tracks = await searchSpotifyTracks(query, limit);
        return res.json({ tracks });
    } catch (err) {
        return res.status(500).json({ error: cleanErrorMessage(err, 'Erro ao consultar Spotify.') });
    }
};
