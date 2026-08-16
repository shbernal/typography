// Exercises the built CLI on the oldest Node this package claims to support.
//
// Plain `.mjs` on purpose: the test suite runs the TypeScript sources under
// Node's type stripping, which needs Node 24, so it cannot be the thing that
// backs `engines.node: >=22`. This can. It is deliberately thin - the rules are
// tested elsewhere - and checks only that the published entry point loads,
// reports, and exits the way a caller depends on.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLI = 'dist/cli.js';
assert.ok(existsSync(CLI), `${CLI} is missing; run the build first`);

const run = (args, input = '') =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input });

const listed = run(['styles']);
assert.equal(listed.status, 0, listed.stderr);
for (const tag of ['en', 'fr', 'es', 'de-DE', 'de-CH', 'nl']) assert.ok(listed.stdout.includes(tag));

const guess = run(['check', '-'], 'Bonjour!');
assert.equal(guess.status, 2, 'the CLI must refuse to guess a language');

const found = run(['check', '--style', 'es', '-'], 'Como estas?');
assert.equal(found.status, 1, 'an error finding must exit non-zero');
// Global ids, so no language prefix, and a derived stamp, so no version number.
// Both of these were written against the shapes those two had in 0.1.0 and this
// script does not run in `pnpm check`, which is how they stayed stale through
// the rename: it runs in CI against a build, on the oldest supported Node.
assert.match(found.stdout, /\bunpaired-question\b/);
assert.match(found.stdout, /typocheck \d+\.\d+\.\d+ \(es@[0-9a-f]{12}\)/);

const clean = run(['check', '--style', 'fr', '-'], 'Rien a signaler ici.');
assert.equal(clean.status, 0, clean.stdout + clean.stderr);

// A config, which is the one thing here that turns on module loading rather than
// on regular expressions, and therefore the one thing most likely to differ
// between the Node this repo develops on and the oldest one it claims. The
// config is `.mjs` and imports the build by file URL, since a temp directory has
// no `node_modules` to resolve a package name against.
const dir = mkdtempSync(join(tmpdir(), 'typocheck-smoke-'));
writeFileSync(
  join(dir, 'typography.config.mjs'),
  `import { derive, fr } from '${pathToFileURL(resolve('dist/index.js')).href}';\n` +
    "export default derive(fr, { name: 'smoke-house', standard: 'smoke test' });\n",
);
const configured = spawnSync(process.execPath, [resolve(CLI), 'check', '--style', 'smoke-house', '-'], {
  cwd: dir,
  encoding: 'utf8',
  input: 'Rien a signaler ici.',
});
assert.equal(configured.status, 0, configured.stdout + configured.stderr);
assert.match(configured.stdout, /smoke-house@[0-9a-f]{12} via/);

console.log(`smoke-dist: ok on ${process.version}`);
