import { requireEnv, cleanErrorMessage } from '../server/utils.js';

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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const prompt = String(req.body?.prompt || '').trim();
        const communityName = String(req.body?.communityName || 'comunidade').trim();
        const recentHistory = String(req.body?.recentHistory || '').trim();
        const model = String(req.body?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: 'Você é um assistente acadêmico prestativo.' },
                    { role: 'user', content: input }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const apiError = data?.error?.message || `HTTP ${response.status}`;
            return res.status(response.status).json({ error: `OpenAI falhou: ${apiError}` });
        }

        const answer = data?.choices?.[0]?.message?.content || '';
        return res.json({ text: answer });
    } catch (err) {
        return res.status(500).json({ error: cleanErrorMessage(err, 'Erro no assistente de IA.') });
    }
}
