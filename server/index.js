import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const host = String(process.env.HOST || '127.0.0.1');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

app.use(express.json({ limit: '1mb' }));

const spotifyTokenCache = {
  accessToken: '',
  expiresAt: 0
};

function cleanErrorMessage(err, fallback = 'Falha ao processar a solicitação.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Configuração ausente: ${name}`);
  }
  return value;
}

function extractOpenAiText(data) {
  let answer = String(data?.output_text || '').trim();
  if (answer) return answer;

  if (!Array.isArray(data?.output)) return '';
  const collected = [];
  data.output.forEach((block) => {
    if (!Array.isArray(block?.content)) return;
    block.content.forEach((item) => {
      if ((item?.type === 'output_text' || item?.type === 'text') && item?.text) {
        collected.push(String(item.text));
      }
    });
  });
  return collected.join('\n').trim();
}

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/spotify/search', async (req, res) => {
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
});

app.get('/api/exchange', async (req, res) => {
  try {
    const amount = Number(req.query.amount);
    const from = String(req.query.from || '').trim().toUpperCase();
    const to = String(req.query.to || '').trim().toUpperCase();
    if (!Number.isFinite(amount) || !from || !to) {
      return res.status(400).json({ error: 'Parâmetros inválidos. Use amount, from e to.' });
    }

    const apiKey = requireEnv('EXCHANGERATE_API_KEY');
    const endpoint = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(
      apiKey
    )}/pair/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(amount)}`;

    const response = await fetch(endpoint);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.result !== 'success') {
      const apiError = data?.['error-type'] || `HTTP ${response.status}`;
      return res.status(502).json({ error: `ExchangeRate-API falhou: ${apiError}` });
    }

    return res.json({
      amount,
      from,
      to,
      converted: Number(data.conversion_result),
      rate: Number(data.conversion_rate)
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err, 'Erro ao consultar câmbio.') });
  }
});

app.post('/api/openai', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    const communityName = String(req.body?.communityName || 'comunidade').trim();
    const recentHistory = String(req.body?.recentHistory || '').trim();
    const model = String(req.body?.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();

    if (!prompt) {
      return res.status(400).json({ error: 'Informe o campo prompt.' });
    }

    const apiKey = requireEnv('OPENAI_API_KEY');

    const input = [
      `Você é assistente da comunidade "${communityName}" no Future Academy.`,
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
      const apiError = data?.error?.message || `HTTP ${response.status}`;
      return res.status(502).json({ error: `OpenAI falhou: ${apiError}` });
    }

    const text = extractOpenAiText(data);
    return res.json({ text: text || 'A OpenAI retornou uma resposta vazia.' });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err, 'Erro ao consultar OpenAI.') });
  }
});

app.post('/api/parse-timetable', async (req, res) => {
  const textContent = String(req.body?.text || '').trim();
  if (!textContent) {
    return res.status(400).json({ error: 'Texto não fornecido para análise.' });
  }

  const tempFilePath = path.join(os.tmpdir(), `timetable_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
  const pythonScript = path.resolve(__dirname, 'parse_timetable.py');

  try {
    await fs.writeFile(tempFilePath, textContent, 'utf-8');

    // Call python script
    execFile('python3', [pythonScript, tempFilePath], { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      // Clean up async
      fs.unlink(tempFilePath).catch(() => { });

      if (error) {
        console.error('Python Script Error:', stderr || error.message);

        // Try parsing stdout just in case Python handled it and dumped {"error": ...}
        if (stdout) {
          try {
            const parsed = JSON.parse(stdout);
            if (parsed && parsed.error) return res.status(500).json(parsed);
          } catch (_) { }
        }

        return res.status(500).json({ error: 'Falha ao processar horários via IA (Erro interno de execução).' });
      }

      try {
        const jsonResponse = JSON.parse(stdout.trim());
        if (jsonResponse.error) {
          return res.status(400).json(jsonResponse);
        }
        return res.json(jsonResponse);
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdout);
        return res.status(500).json({ error: 'Falha ao decodificar a resposta da IA (Formato inválido).' });
      }
    });

  } catch (err) {
    fs.unlink(tempFilePath).catch(() => { });
    return res.status(500).json({ error: cleanErrorMessage(err, 'Erro ao preparar arquivo para análise.') });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Future Academy API server running on http://${host}:${port}`);
});
