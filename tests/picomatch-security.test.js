import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const picomatch = require('picomatch');

test('installed matcher uses the reviewed local security patch', () => {
  assert.equal(require('picomatch/package.json').name, '@future-academy/picomatch');
});

test('repeated wildcard extglobs finish within a bounded subprocess', () => {
  const patterns = ['+(*)b', '+(*a)b', '*(*)b', '*(a*)b', '+(+(a))b', '+(a+|b)b'];
  for (const options of [{}, { maxExtglobRecursion: false }]) {
    const result = spawnSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const pm = require('picomatch');
      for (const pattern of ${JSON.stringify(patterns)}) {
        const match = pm(pattern, ${JSON.stringify(options)});
        assert.equal(match('a'.repeat(100) + '!'), false);
        assert.equal(match(pattern), true);
      }
    `], { cwd: process.cwd(), timeout: 3000, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  }
});

test('ordinary build globs and safe extglobs retain matching behavior', () => {
  const source = picomatch('src/**/*.{js,vue}');
  assert.equal(source('src/components/Editor.vue'), true);
  assert.equal(source('src/main.js'), true);
  assert.equal(source('src/main.css'), false);
  assert.equal(source('src/.private/main.js'), false);
  assert.equal(picomatch('+(a|b)')('abba'), true);
  assert.equal(picomatch('+(a|b)')('abc'), false);
  assert.equal(picomatch('+(*(a)|*(b))')('abba'), true);
  assert.equal(picomatch('+([*])')('***'), true);
  assert.equal(picomatch(String.raw`+(\*)`)('***'), true);
});
