// This route talks only to the administrator's local Ollama, never a client-supplied URL.
const ollamaUrl = () => (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
export async function studyAi(req, res) {
  try {
    if (req.method === 'GET') {
      const response = await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Ollama indisponível.');
      const data = await response.json();
      return res.json({ models: (data.models || []).map(m => m.name) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
    const { model, messages } = req.body || {};
    if (typeof model !== 'string' || !model.trim() || model.length > 200 || !Array.isArray(messages) || !messages.length || messages.length > 20 || JSON.stringify(messages).length > 40000 || messages.some(m => !['system', 'user', 'assistant'].includes(m.role) || typeof m.content !== 'string')) return res.status(400).json({ error: 'Modelo ou conversa inválidos.' });
    const response = await fetch(`${ollamaUrl()}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false, options: { num_predict: 1024, num_ctx: 8192, temperature: 0.5 } }), signal: AbortSignal.timeout(120000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: data.error || 'Falha ao consultar o modelo local.' });
    return res.json({ text: data.message?.content || 'O modelo não retornou texto. Tente reformular a pergunta.' });
  } catch (error) {
    return res.status(503).json({ error: error.name === 'TimeoutError' ? 'O modelo demorou para responder. Tente um modelo menor ou uma pergunta mais curta.' : 'Ollama não está acessível. Inicie o serviço e instale um modelo no computador do backend.' });
  }
}
