import { loadModule } from 'hunspell-asm';
let dictionary;
async function loadDictionary() {
  dictionary ||= Promise.all(['aff', 'dic'].map(async extension => {
    const response = await fetch(`${import.meta.env.BASE_URL}dictionaries/pt-BR/index.${extension}`);
    if (!response.ok) throw new Error('Dicionário indisponível.');
    return new Uint8Array(await response.arrayBuffer());
  })).then(async ([aff, dic]) => {
    const factory = await loadModule();
    return factory.create(factory.mountBuffer(aff), factory.mountBuffer(dic));
  });
  try { return await dictionary; } catch (error) { dictionary = null; throw error; }
}
self.onmessage = async ({ data }) => {
  try {
    const spell = await loadDictionary();
    const words = [...new Set(data.words)].filter(word => !spell.spell(word));
    self.postMessage({ id: data.id, issues: words.slice(0, 12).map(word => ({ word, suggestions: spell.suggest(word).slice(0, 5) })), remaining: Math.max(0, words.length - 12) });
  } catch {
    self.postMessage({ id: data.id, error: 'Não foi possível carregar o corretor. Tente novamente.' });
  }
};
