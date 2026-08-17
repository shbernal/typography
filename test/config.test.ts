// The config surface, executed rather than proofread, for the same reason the
// CLI is: discovery walks a filesystem and a config is a module somebody wrote,
// so nothing here is true because the types say so.
//
// Every config in this file imports the library by absolute file URL. A temp
// directory has no `node_modules`, so `from '@shbernal/typography'` would not
// resolve, and a URL is also the only spelling of an absolute path that survives
// Windows, where CI runs and where a backslash in a string literal is an escape.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { explain } from '../src/config.ts';
import * as library from '../src/index.ts';
import { fr } from '../src/styles/fr.ts';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const CLI = join(ROOT, 'src', 'cli.ts');
const LIB = pathToFileURL(join(ROOT, 'src', 'index.ts')).href;

/** A temp tree. Keys are relative paths, so a test can put a config two
 * directories above the one the command runs in. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'typocheck-config-'));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
}

function run(args: readonly string[], cwd: string, input?: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    input: input ?? '',
  });
}

/** A config exporting one derived style. `name` is a parameter because taking a
 * shipped style's name is a case rather than a mistake. */
function houseConfig(name = 'acme-house'): string {
  return `import { derive, fr } from '${LIB}';

export default derive(fr, {
  name: '${name}',
  standard: 'ACME house style v3',
  drop: ['mixed-no-break-space'],
});
`;
}

test('a config is discovered from an ancestor of the working directory', () => {
  const root = tree({
    'typography.config.mjs': houseConfig(),
    'a/b/sample.txt': 'Il a dit : oui',
  });
  const r = run(['check', '--style', 'acme-house', 'sample.txt'], join(root, 'a', 'b'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /colon-spacing/);
  // The header names both halves: which rules ran, and whose they were.
  assert.match(r.stdout, /acme-house@[0-9a-f]{12} via .*typography\.config\.mjs/);
});

test('the search stops at the repository, and a config beside .git is still found', () => {
  // What this refuses is a `typography.config.mjs` in a home directory quietly
  // deciding the typography of every project on the machine. What it must not
  // break is the monorepo, where the config is at the repository root and every
  // package under it is entitled to find it.
  const outside = tree({
    'typography.config.mjs': houseConfig(),
    'repo/.git/HEAD': 'ref: refs/heads/main\n',
    'repo/package/sample.txt': 'Il a dit : oui',
  });
  const stopped = run(
    ['check', '--style', 'acme-house', 'sample.txt'],
    join(outside, 'repo', 'package'),
  );
  assert.equal(stopped.status, 2);
  assert.match(stopped.stderr, /no style called 'acme-house'/);

  const inside = tree({
    'repo/.git/HEAD': 'ref: refs/heads/main\n',
    'repo/typography.config.mjs': houseConfig(),
    'repo/package/sample.txt': 'Il a dit : oui',
  });
  const found = run(
    ['check', '--style', 'acme-house', 'sample.txt'],
    join(inside, 'repo', 'package'),
  );
  assert.equal(found.status, 1, found.stderr);
  assert.match(found.stdout, /acme-house@[0-9a-f]{12} via/);
});

test('two configs in one directory is an error, not a precedence rule', () => {
  const root = tree({
    'typography.config.mjs': houseConfig(),
    'typography.config.js': houseConfig(),
    'sample.txt': 'a',
  });
  const r = run(['check', '--style', 'acme-house', 'sample.txt'], root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /2 config files/);
  assert.match(r.stderr, /typography\.config\.mjs/);
  assert.match(r.stderr, /typography\.config\.js/);
});

test('--config names one directly and --no-config turns discovery off', () => {
  const root = tree({
    'typography.config.mjs': houseConfig(),
    'elsewhere/other.config.mjs': houseConfig('other-house'),
    'sample.txt': 'a',
  });

  const named = run(
    [
      'check',
      '--style',
      'other-house',
      '--config',
      join(root, 'elsewhere', 'other.config.mjs'),
      'sample.txt',
    ],
    root,
  );
  assert.equal(named.status, 0, named.stderr);
  assert.match(named.stdout, /other-house@[0-9a-f]{12}/);
  // The discovered one is not also loaded: `--config` replaces discovery rather
  // than adding to it, or a run would depend on a file nobody named.
  const shadowedOut = run(
    [
      'check',
      '--style',
      'acme-house',
      '--config',
      join(root, 'elsewhere', 'other.config.mjs'),
      'sample.txt',
    ],
    root,
  );
  assert.equal(shadowedOut.status, 2);
  assert.match(shadowedOut.stderr, /no style called 'acme-house'/);

  const off = run(['check', '--style', 'acme-house', '--no-config', 'sample.txt'], root);
  assert.equal(off.status, 2);
  assert.match(off.stderr, /no style called 'acme-house'/);
});

test('--config and --no-config together is refused rather than resolved', () => {
  const root = tree({ 'typography.config.mjs': houseConfig(), 'sample.txt': 'a' });
  const r = run(
    [
      'check',
      '--style',
      'acme-house',
      '--config',
      'typography.config.mjs',
      '--no-config',
      'sample.txt',
    ],
    root,
  );
  assert.equal(r.status, 2);
  assert.match(r.stderr, /two answers/);
});

test('a config style may take a shipped name, and the stamp says it is not that style', () => {
  // The case the feature exists for: a house French is still French, and every
  // script that already says `--style fr` should keep working. What makes it
  // safe rather than quiet is that the stamp is derived from the rules, so it
  // cannot agree with the shipped one, and the header carries the path.
  const root = tree({ 'typography.config.mjs': houseConfig('fr'), 'sample.txt': 'a' });
  const r = run(['check', '--style', 'fr', 'sample.txt'], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /fr@[0-9a-f]{12} via typography\.config\.mjs/);
  assert.doesNotMatch(r.stdout, new RegExp(fr.stamp));
});

test('the styles listing shows where each one came from, including the shadowed one', () => {
  const root = tree({ 'typography.config.mjs': houseConfig('fr') });
  const r = run(['styles'], root);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trimEnd().split('\n');
  // The config's first, because that is the order `--style` resolves in.
  assert.match(lines[0]!, /^fr\s+fr@[0-9a-f]{12}\s+ACME house style v3\s+typography\.config\.mjs$/);
  // And the shipped one is still listed. Dropping it is how a user loses track
  // of the fact that `--style fr` stopped meaning the Imprimerie nationale's.
  const shipped = lines.find((line) => line.includes(fr.id));
  assert.ok(shipped, `the shadowed built-in is missing from:\n${r.stdout}`);
  assert.match(shipped, /shadowed by typography\.config\.mjs/);
});

test('a config can export an array of styles', () => {
  const root = tree({
    'typography.config.mjs': `import { derive, fr, nl } from '${LIB}';

export default [
  derive(fr, { name: 'house-fr', standard: 'ACME v3' }),
  derive(nl, { name: 'house-nl', standard: 'ACME v3' }),
];
`,
  });
  const r = run(['styles'], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^house-fr\s/m);
  assert.match(r.stdout, /^house-nl\s/m);
});

test('a config that exports the wrong thing says what a style is', () => {
  // The interesting version of this, and the reason the message names the
  // fields: exporting the spec that was meant to be passed to `compose`. It has
  // a name and a rule list and is not a style, and nothing downstream would say
  // so until `normalize` turned out not to be a function.
  const root = tree({
    'typography.config.mjs': `import { fr } from '${LIB}';

export default { name: 'acme-house', standard: 'ACME v3', rules: fr.rules };
`,
  });
  const r = run(['styles'], root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /is not a style/);
  assert.match(r.stderr, /compose/);
});

test('a config with no default export says so', () => {
  const root = tree({
    'typography.config.mjs': `import { fr } from '${LIB}';\nexport const style = fr;\n`,
  });
  const r = run(['styles'], root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no default export/);
});

test('two styles of one name in one config is an error', () => {
  const root = tree({
    'typography.config.mjs': `import { derive, fr, nl } from '${LIB}';

export default [
  derive(fr, { name: 'house', standard: 'ACME v3' }),
  derive(nl, { name: 'house', standard: 'ACME v3' }),
];
`,
  });
  const r = run(['styles'], root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /two styles named house/);
});

test("a config that throws is reported with its own message and the file's path", () => {
  const root = tree({
    'typography.config.mjs': `import { derive, fr } from '${LIB}';

export default derive(fr, { name: 'house', standard: 'ACME v3', drop: ['no-such-rule'] });
`,
  });
  const r = run(['styles'], root);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /typography\.config\.mjs/);
  // `derive`'s own refusal, which is the useful half: a config outlives the
  // version of this package it was written against, and a `drop` that stopped
  // dropping anything is the failure it must not have.
  assert.match(r.stderr, /has no rule no-such-rule to drop/);
});

test('--version answers even when the config in the tree is broken', () => {
  // The answer to "what is installed", which is the thing somebody is trying to
  // put in a bug report. A config file in the working tree must not be able to
  // take it away from them, so this verb does not load one at all.
  const root = tree({ 'typography.config.mjs': 'export default {' });
  const r = run(['--version'], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^typocheck \d+\.\d+\.\d+$/m);
  assert.match(r.stdout, new RegExp(fr.id));
  // And the verb that is about styles does load it, and fails.
  assert.equal(run(['styles'], root).status, 2);
});

test('a TypeScript config on a Node too old to strip types is told what happened', () => {
  // Not reachable on the Node this repo develops on, where type stripping is on
  // by default, and reachable on Node 22.0 through 22.17, which `engines`
  // allows. The error Node gives names a file extension and not TypeScript, so
  // the translation is the whole point. Held by handing `explain` the error,
  // because the alternative is a test that only runs on a runtime CI does not
  // have.
  const error = new TypeError('Unknown file extension ".ts" for /w/typography.config.ts');
  const said = explain(error, '/w/typography.config.ts');
  assert.match(said, /type stripping/i);
  assert.match(said, /22\.18/);
  assert.match(said, /typography\.config\.mjs/);
  // Anything else passes through with the path in front of it. A stack trace out
  // of somebody's own config is more useful than a guess about it.
  const other = new Error('fr is not defined');
  assert.equal(
    explain(other, '/w/typography.config.mjs'),
    '/w/typography.config.mjs: fr is not defined',
  );
});

test('the library has no config concept, and only the CLI imports one', () => {
  // A host embedding this package composes a `Style` in its own code and hands
  // it to `check`. The config file exists because a CLI cannot be handed an
  // object, and that is the whole of its remit.
  for (const name of ['findConfig', 'loadConfig', 'resolveStyle', 'available', 'explain'])
    assert.ok(!(name in library), `the root export carries ${name}, which is the CLI's`);

  // Over the imports and not only over the exports, because the way this
  // boundary breaks is somebody reaching for `findConfig` from inside a rule
  // module, which no listing of `index.ts` would show.
  const dir = join(ROOT, 'src');
  const sources = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((name) =>
    name.endsWith('.ts'),
  );
  assert.ok(sources.length > 10, 'the source listing found nothing, so this test asserts nothing');
  for (const name of sources) {
    if (name === 'cli.ts' || name === 'config.ts') continue;
    assert.doesNotMatch(
      readFileSync(join(dir, name), 'utf8'),
      /from '\.[./]*config\.ts'/,
      `src/${name} imports the config loader`,
    );
  }
});
