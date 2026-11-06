// Compatibility with the maintained nanoid 3 API used by these older WASM wrappers.
import { readFile, writeFile } from 'node:fs/promises';
for (const [name, file] of [['hunspell-asm', 'hunspellLoader.js'], ['emscripten-wasm-loader', 'path/mountBuffer.js']]) {
  for (const format of ['cjs', 'esm']) {
    const path = new URL(`../node_modules/${name}/dist/${format}/${file}`, import.meta.url);
    const source = await readFile(path, 'utf8');
    await writeFile(path, source.replace('const nanoid = require("nanoid");', 'const { nanoid } = require("nanoid");').replace("import * as nanoid from 'nanoid';", "import { nanoid } from 'nanoid';"));
  }
}
// ESM bundlers need the CommonJS runtime's default export, not its namespace.
const loaderPath = new URL('../node_modules/hunspell-asm/dist/esm/loadModule.js', import.meta.url);
const loader = await readFile(loaderPath, 'utf8');
await writeFile(loaderPath, loader.replace("import * as runtime from './lib/node/hunspell';", "import runtime from './lib/node/hunspell';"));
