// Exercises the built CLI on the oldest Node this package claims to support.
//
// Plain `.mjs` on purpose: the test suite runs the TypeScript sources under
// Node's type stripping, which needs Node 24, so it cannot be the thing that
// backs `engines.node: >=22`. This can. It is deliberately thin - the rules are
// tested elsewhere - and checks only that the published entry point loads,
// reports, and exits the way a caller depends on.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CLI = 'dist/cli.js';
assert.ok(existsSync(CLI), `${CLI} is missing; run the build first`);

const run = (args, input = '') =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input });

const langs = run(['langs']);
assert.equal(langs.status, 0, langs.stderr);
for (const tag of ['fr', 'es', 'de-DE', 'de-CH']) assert.ok(langs.stdout.includes(tag));

const guess = run(['check', '-'], 'Bonjour!');
assert.equal(guess.status, 2, 'the CLI must refuse to guess a language');

const found = run(['check', '--lang', 'es', '-'], 'Como estas?');
assert.equal(found.status, 1, 'an error finding must exit non-zero');
assert.match(found.stdout, /es\.unpaired-question/);
assert.match(found.stdout, /typocheck \d+\.\d+\.\d+ \(es@\d+\.\d+\.\d+\)/);

const clean = run(['check', '--lang', 'fr', '-'], 'Rien a signaler ici.');
assert.equal(clean.status, 0, clean.stdout + clean.stderr);

console.log(`smoke-dist: ok on ${process.version}`);
