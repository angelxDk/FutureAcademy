import { requireEnv, cleanErrorMessage } from '../utils.js';

export const getExchangeRate = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
    try {
        const amount = Number(req.query.amount);
        const from = String(req.query.from || '').trim().toUpperCase();
        const to = String(req.query.to || '').trim().toUpperCase();
        if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000 || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
            return res.status(400).json({ error: 'Parâmetros inválidos. Use amount, from e to.' });
        }

        const apiKey = requireEnv('EXCHANGERATE_API_KEY');
        const endpoint = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(
            apiKey
        )}/pair/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(amount)}`;

        const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.result !== 'success') {
            const apiError = data?.['error-type'] || `HTTP ${response.status}`;
            return res.status(502).json({ error: 'O serviço de câmbio está indisponível.' });
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
};
