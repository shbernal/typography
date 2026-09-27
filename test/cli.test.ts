// The CLI is the surface the skill documents, so its contract is executed
// rather than proofread. These spawn the real entry point: the exit codes and
// the refusals are the part a caller depends on.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { styles } from '../src/check.ts';
import { NARROW_NO_BREAK, NO_BREAK } from '../src/pack.ts';
import { es } from '../src/styles/es.ts';

const CLI = resolve(fileURLToPath(import.meta.url), '..', '..', 'src', 'cli.ts');

function run(args: readonly string[], input?: string) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: input ?? '' });
}

/** Every temp directory this file made, removed when it is done. `force`, so a
 * test that failed part way does not turn into a second failure in teardown. */
const MADE: string[] = [];
after(() => {
  for (const dir of MADE) rmSync(dir, { recursive: true, force: true });
});

function withFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'typocheck-'));
  MADE.push(dir);
  const path = join(dir, 'sample.txt');
  writeFileSync(path, contents);
  return path;
}

test('help exits zero and names the languages', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  for (const { name } of styles) assert.ok(r.stdout.includes(name), `--help omits ${name}`);
});

test('it refuses to guess a language', () => {
  const r = run(['check', withFile('Bonjour!')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--style is required/);
});

test("there is no bare 'de'", () => {
  const r = run(['check', '--style', 'de', withFile('Hallo')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /German is two conventions/);
});

test('check reports and exits non-zero on an error finding', () => {
  const r = run(['check', '--style', 'es', withFile('Como estas?')]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /unpaired-question/);
  assert.match(r.stdout, /typocheck \d+\.\d+\.\d+ \(es@[0-9a-f]{12}\)/);
});

test('check never touches the file', () => {
  const path = withFile('« mot »');
  const r = run(['check', '--style', 'fr', path]);
  assert.notEqual(r.status, 2);
  assert.equal(readFileSync(path, 'utf8'), '« mot »');
});

test('check refuses --write outright', () => {
  const r = run(['check', '--style', 'fr', '--write', withFile('a')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /never touches a file/);
});

test('fix without --write is a dry run that says what it would do', () => {
  const path = withFile('« mot »');
  const before = readFileSync(path, 'utf8');
  const r = run(['fix', '--style', 'fr', path]);
  assert.match(r.stdout, /would rewrite/);
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('fix --write rewrites, and the two runs agree on what moved', () => {
  const path = withFile('« mot »');
  const dry = run(['fix', '--style', 'fr', path]);
  const wet = run(['fix', '--style', 'fr', '--write', path]);
  assert.match(dry.stdout, /would rewrite/);
  assert.match(wet.stdout, /^fix: rewrote/m);
  assert.equal(readFileSync(path, 'utf8'), `«${NARROW_NO_BREAK}mot${NARROW_NO_BREAK}»`);
});

test('fix leaves the unfixable findings alone and says so', () => {
  const path = withFile('Como estas?');
  const r = run(['fix', '--style', 'es', '--write', path]);
  assert.equal(readFileSync(path, 'utf8'), 'Como estas?');
  assert.match(r.stdout, /not fixable by substitution/);
});

test('stdin is a first-class input', () => {
  const r = run(['check', '--style', 'fr', '-'], 'Bonjour!');
  assert.match(r.stdout, /<stdin>:1:8/);
});

// `fix --write -` is the one mode where stdout carries somebody's document
// rather than this tool's opinion of it. All three of these shipped broken and
// none of them was executed anywhere: the filter dropped clean input entirely,
// and both report formats were appended to the text they had just written.
test('fix --write - passes clean text through rather than swallowing it', () => {
  const clean = 'Rien a signaler ici.';
  const r = run(['fix', '--style', 'fr', '--write', '-'], clean);
  assert.equal(r.stdout, clean);
});

test('fix --write - puts the repaired text on stdout and the report on stderr', () => {
  const r = run(['fix', '--style', 'fr', '--write', '-'], 'Il a dit : oui');
  // The whole of stdout is the document, byte for byte, with nothing appended.
  assert.equal(r.stdout, `Il a dit${NO_BREAK}: oui`);
  assert.match(r.stderr, /colon-spacing/);
  assert.match(r.stderr, /^fix: rewrote <stdin>/m);
});

test('fix --write - --json emits JSON a caller can parse', () => {
  const r = run(['fix', '--style', 'fr', '--write', '--json', '-'], 'Il a dit : oui');
  assert.equal(r.stdout, `Il a dit${NO_BREAK}: oui`);
  const parsed = JSON.parse(r.stderr) as { files: { changed: boolean }[] };
  assert.equal(parsed.files[0]!.changed, true);
});

test('--json carries the stamp and the findings', () => {
  const r = run(['check', '--style', 'es', '--json', '-'], 'Como estas?');
  const parsed = JSON.parse(r.stdout) as {
    tool: string;
    style: string;
    files: { findings: { rule: string; fixable: boolean }[] }[];
  };
  assert.match(parsed.tool, /^typocheck /);
  // From the style, not from a literal. What this test is for is that the CLI
  // reports *a* stamp and reports the style's own; a literal here turns every
  // rule change into a failure in a file that is not about rules.
  assert.equal(parsed.style, es.id);
  assert.ok(parsed.files[0]!.findings.some((f) => f.rule === 'unpaired-question' && !f.fixable));
});

test('--strict is what makes a warning fail', () => {
  const path = withFile('il a dit "bonjour"');
  assert.equal(run(['check', '--style', 'fr', path]).status, 0);
  assert.equal(run(['check', '--style', 'fr', '--strict', path]).status, 1);
});

test('styles lists every style with its standard', () => {
  const r = run(['styles']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /de-CH@[0-9a-f]{12}\s+Duden/);
  assert.match(r.stdout, /fr@[0-9a-f]{12}\s+Imprimerie nationale/);
});

test('the two things that were renamed say what they are now', () => {
  // `--lang` and `langs` were the spelling through `0.2.1`, and a user typing
  // one of them read a document that was true when it was written. Letting them
  // fall in with the typos would answer "unknown option", which is accurate and
  // useless. A style need not be about a language, which is why they moved.
  const flag = run(['check', '--lang', 'fr', '-'], 'Bonjour!');
  assert.equal(flag.status, 2);
  assert.match(flag.stderr, /--lang is --style now/);
  assert.doesNotMatch(flag.stderr, /unknown option/);

  const verb = run(['langs']);
  assert.equal(verb.status, 2);
  assert.match(verb.stderr, /'langs' is 'styles' now/);

  // Including in the `=` spelling, where the part that is wrong is the half in
  // front of the `=` and is what the message has to name.
  const joined = run(['check', '--lang=fr', '-'], 'Bonjour!');
  assert.match(joined.stderr, /--lang is --style now/);
});

test('--style takes both spellings', () => {
  const r = run(['check', '--style=es', '--json', '-'], 'Como estas?');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /"style": "es@/);
});

test('a style name resolves case-insensitively, as the tag used to', () => {
  const r = run(['check', '--style', 'DE-ch', '-'], 'Sie sagte »Wort« und ging.');
  assert.notEqual(r.status, 2);
  assert.match(r.stdout, /guillemet-direction/);
});

test('--version answers, in all three spellings, with the style stamps too', () => {
  for (const spelling of ['--version', '-v', 'version']) {
    const r = run([spelling]);
    assert.equal(r.status, 0, `${spelling} should exit 0`);
    assert.match(r.stdout, /^typocheck \d+\.\d+\.\d+$/m);
    // The stamps are on it because a findings count is only comparable against
    // the rules that produced it, so a bug report quoting one needs both. The
    // tool's version and a style's stamp are two different things and neither
    // substitutes for the other: this package can publish without a rule moving,
    // and a rule can move in a package that has not published yet.
    assert.match(r.stdout, /fr@[0-9a-f]{12}/);
    assert.match(r.stdout, /de-CH@[0-9a-f]{12}/);
  }
});

test('a mistyped flag is a misuse, not a missing file', () => {
  // The failure this prevents: `--wrote` used to fall through to the file list
  // and come back as "cannot read --wrote", so a typo in `--write` looked like a
  // path problem and the rewrite silently did not happen.
  const r = run(['fix', '--style', 'fr', '--wrote', withFile('« mot »')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown option '--wrote'/);
  assert.doesNotMatch(r.stderr, /cannot read/);
});

test('every unknown flag is named, not just the first', () => {
  const r = run(['check', '--style', 'fr', '--nope', '--also-nope', '-']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /'--nope'/);
  assert.match(r.stderr, /'--also-nope'/);
});

test('a bare - is still stdin and not a flag', () => {
  const r = run(['check', '--style', 'fr', '-'], 'Bonjour!');
  assert.notEqual(r.status, 2);
  assert.match(r.stdout, /<stdin>/);
});

// Root ignores the mode bit and Windows ignores most of it, so on either a
// read-only file is writable and the tests below would assert nothing.
const MODE_BITS_HOLD = process.platform !== 'win32' && process.getuid?.() !== 0;

test('a file that cannot be written is exit 2, and the rest of the run happens', {
  skip: !MODE_BITS_HOLD,
}, () => {
  // It used to be an uncaught throw, which exits 1: this tool's code for "there
  // are findings". A CI job running `fix --write` could not tell the two apart.
  const locked = withFile('Il a dit : oui');
  const open = withFile('Il a dit : oui');
  chmodSync(locked, 0o444);
  const r = run(['fix', '--style', 'fr', '--write', locked, open]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cannot write/);
  assert.doesNotMatch(r.stderr, /at main/, 'a write failure must not print a stack');
  assert.match(r.stdout, /colon-spacing/, 'the report is still printed');
  assert.match(r.stdout, /could not rewrite .*sample\.txt/);
  assert.equal(readFileSync(locked, 'utf8'), 'Il a dit : oui');
  assert.notEqual(readFileSync(open, 'utf8'), 'Il a dit : oui', 'the next file is still fixed');
});

test('a file that cannot be read is exit 2', () => {
  const r = run(['check', '--style', 'fr', join(tmpdir(), 'typocheck-absent', 'x.txt')]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cannot read/);
});

test('no files is a misuse, and says how to pass stdin', () => {
  const r = run(['check', '--style', 'fr']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no files/);
  assert.match(r.stderr, / - /);
});

test('a flag that takes a value does not swallow the next flag', () => {
  // `--style --json` used to look for a style called `--json`, and answered
  // with a paragraph about German regions.
  for (const [args, message] of [
    [['check', '--style', '--json', '-'], /--style needs a name/],
    [['check', '--style', 'fr', '--config', '--no-config', '-'], /--config needs a path/],
    [['check', '-', '--style'], /--style needs a name/],
  ] as const) {
    const r = run(args, 'Bonjour');
    assert.equal(r.status, 2);
    assert.match(r.stderr, message);
    assert.doesNotMatch(r.stderr, /no style called/);
  }
});

test('stdin is named once', () => {
  const r = run(['check', '--style', 'fr', '-', '-'], 'Bonjour!');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /more than once/);
});

test('-h works after a verb, where it used to be read as a filename', () => {
  const r = run(['check', '-h']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /typocheck \d+\.\d+\.\d+ - orthotypography/);
});
