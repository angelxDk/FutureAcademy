import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadModule } from 'hunspell-asm';
import { collectSpellingWords } from '../src/utils/spelling.js';

test('Brazilian Portuguese dictionary recognizes accents and suggests corrections', async () => {
  const [aff, dic] = await Promise.all(['aff', 'dic'].map(ext => readFile(new URL(`../public/dictionaries/pt-BR/index.${ext}`, import.meta.url))));
  const factory = await loadModule();
  const spell = factory.create(factory.mountBuffer(aff), factory.mountBuffer(dic));
  assert.equal(spell.spell('educação'), true);
  assert.equal(spell.spell('universidade'), true);
  assert.equal(spell.spell('educassão'), false);
  assert.ok(spell.suggest('educassão').includes('educação'));
  spell.dispose();
});

test('spelling collects document positions and skips code and links', () => {
  const nodes = [
    { isText: true, text: 'Olá, educassão!', type: { name: 'text' }, marks: [] },
    { isText: true, text: 'https', type: { name: 'text' }, marks: [{ type: { name: 'link' } }] },
    { type: { name: 'codeBlock' } }
  ];
  const doc = { descendants: visitor => nodes.forEach((node, i) => { const result = visitor(node, 1 + i * 20); if (i) assert.equal(result, false); }) };
  assert.deepEqual(collectSpellingWords(doc), [{ word: 'Olá', from: 1, to: 4 }, { word: 'educassão', from: 6, to: 15 }]);
});
