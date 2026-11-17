# Local security patch

This directory contains the MIT-licensed picomatch 4.0.7 sources, maintained locally
as `@future-academy/picomatch`. It is not an official upstream release. The root
dependency and override route every picomatch consumer through this directory.
The version remains 4.0.7 for compatibility with consumers' peer ranges; the scoped
name identifies the fork. Audit results alone do not establish patch correctness.

Addresses the single-branch repeated-extglob backtracking described in
[GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
At verification on 2026-11-17 the advisory lists no patched upstream version.

In `lib/parse.js`, repeated `+(...)` / `*(...)` groups containing unescaped `*` or
`+` outside character classes use the existing risky-pattern literalization.
The upstream flat character-class optimization remains available. Setting
`maxExtglobRecursion: false` no longer bypasses the safety analysis.

This intentionally changes matching semantics for complex repeated extglobs:
unsafe patterns match their literal text instead of compiling nested unbounded
quantifiers. Ordinary path globs and safe simple extglobs retain their behavior.
The original license is preserved in `LICENSE`.

`tests/picomatch-security.test.js` checks installed package identity, bounded
execution of adversarial patterns in a subprocess, and representative build globs.
Build and application tests check consumer compatibility. Replace this fork with
an upstream release only after its advisory fix and these checks are verified.
