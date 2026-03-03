/**
 * Lazy-carrega um script externo sob demanda.
 *
 * - Usa um Set como cache: o mesmo URL nunca é reinjetado no DOM,
 *   mesmo se o usuário clicar várias vezes no botão de importação.
 * - Retorna uma Promise que resolve quando o script está pronto.
 * - Em caso de erro de rede, rejeita para que o chamador possa
 *   mostrar uma mensagem amigável ao usuário.
 */
const _loaded = new Set();

export async function lazyLoadScript(url) {
    if (_loaded.has(url)) return; // já carregado, não reinjeta

    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.crossOrigin = 'anonymous';
        script.onload = () => { _loaded.add(url); resolve(); };
        script.onerror = () => reject(new Error(`Falha ao carregar: ${url}`));
        document.head.appendChild(script);
    });
}
