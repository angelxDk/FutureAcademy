import { requireEnv, cleanErrorMessage } from '../../server/utils.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

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
}
