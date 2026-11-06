export function collectSpellingWords(doc) {
  const words = [];
  doc.descendants((node, position) => {
    if (node.type.name === 'codeBlock' || node.marks?.some(mark => mark.type.name === 'code' || mark.type.name === 'link')) return false;
    if (!node.isText) return;
    for (const match of node.text.matchAll(/\p{L}[\p{L}\p{M}]*(?:[-’']\p{L}[\p{L}\p{M}]*)*/gu)) {
      if (match[0].length > 1 && match[0].length < 50) words.push({ word: match[0], from: position + match.index, to: position + match.index + match[0].length });
    }
  });
  return words;
}
