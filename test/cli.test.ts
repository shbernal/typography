// The CLI is the surface the skill documents, so its contract is executed
// rather than proofread. These spawn the real entry point: the exit codes and
// the refusals are the part a caller depends on.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = resolve(fileURLToPath(import.meta.url), '..', '..', 'src', 'cli.ts');

function run(args: readonly string[], input?: string) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: input ?? '' });
}

function withFile(contents: string): string {
  const path = join(mkdtempSync(join(tmpdir(), 'typocheck-')), 'sample.txt');
  writeFileSync(path, contents);
  return path;
}

test('help exits zero and names the languages', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  for (const lang of ['fr', 'es', 'de-DE', 'de-CH']) assert.ok(r.stdout.includes(lang));
});

test('it refuses to guess a language', () => {
  const r = run(['check', withFile('Bonjour!')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--lang is required/);
});

test("there is no bare 'de'", () => {
  const r = run(['check', '--lang', 'de', withFile('Hallo')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /German is two conventions/);
});

test('check reports and exits non-zero on an error finding', () => {
  const r = run(['check', '--lang', 'es', withFile('Como estas?')]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /es\.unpaired-question/);
  assert.match(r.stdout, /typocheck \d+\.\d+\.\d+ \(es@\d+\.\d+\.\d+\)/);
});

test('check never touches the file', () => {
  const path = withFile('« mot »');
  const r = run(['check', '--lang', 'fr', path]);
  assert.notEqual(r.status, 2);
  assert.equal(readFileSync(path, 'utf8'), '« mot »');
});

test('check refuses --write outright', () => {
  const r = run(['check', '--lang', 'fr', '--write', withFile('a')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /never touches a file/);
});

test('fix without --write is a dry run that says what it would do', () => {
  const path = withFile('« mot »');
  const before = readFileSync(path, 'utf8');
  const r = run(['fix', '--lang', 'fr', path]);
  assert.match(r.stdout, /would rewrite/);
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('fix --write rewrites, and the two runs agree on what moved', () => {
  const path = withFile('« mot »');
  const dry = run(['fix', '--lang', 'fr', path]);
  const wet = run(['fix', '--lang', 'fr', '--write', path]);
  assert.match(dry.stdout, /would rewrite/);
  assert.match(wet.stdout, /^fix: rewrote/m);
  assert.equal(readFileSync(path, 'utf8'), '« mot »');
});

test('fix leaves the unfixable findings alone and says so', () => {
  const path = withFile('Como estas?');
  const r = run(['fix', '--lang', 'es', '--write', path]);
  assert.equal(readFileSync(path, 'utf8'), 'Como estas?');
  assert.match(r.stdout, /not fixable by substitution/);
});

test('stdin is a first-class input', () => {
  const r = run(['check', '--lang', 'fr', '-'], 'Bonjour!');
  assert.match(r.stdout, /<stdin>:1:8/);
});

test('--json carries the stamp and the findings', () => {
  const r = run(['check', '--lang', 'es', '--json', '-'], 'Como estas?');
  const parsed = JSON.parse(r.stdout) as {
    tool: string;
    pack: string;
    files: { findings: { rule: string; fixable: boolean }[] }[];
  };
  assert.match(parsed.tool, /^typocheck /);
  assert.equal(parsed.pack, 'es@0.1.0');
  assert.ok(parsed.files[0]!.findings.some((f) => f.rule === 'es.unpaired-question' && !f.fixable));
});

test('--strict is what makes a warning fail', () => {
  const path = withFile('il a dit "bonjour"');
  assert.equal(run(['check', '--lang', 'fr', path]).status, 0);
  assert.equal(run(['check', '--lang', 'fr', '--strict', path]).status, 1);
});

test('langs lists every pack with its standard', () => {
  const r = run(['langs']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /de-CH@0\.1\.0\s+Duden/);
  assert.match(r.stdout, /fr@0\.2\.0\s+Imprimerie nationale/);
});
