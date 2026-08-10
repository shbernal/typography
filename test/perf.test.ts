// The rules run over attacker-controllable text, so a pattern that backtracks
// catastrophically is a denial of service in any host that checks user input.
// `SECURITY.md` says so and calls such a pattern a vulnerability in this package,
// which makes this file the assertion behind that claim rather than a benchmark.
//
// What it is guarding against, concretely. `fr.guillemet-open` and
// `fr.guillemet-close` were once written as an alternation over
// `ANY_SPACE*BREAKABLE ANY_SPACE*`, and `BREAKABLE` is a subset of `ANY_SPACE`,
// so a run of ordinary spaces with no guillemet after it could be split at every
// position in it. That cost 242 ms at 800 spaces, 1.5 s at 1,600 and 15 s for a
// single padded 3,000-space line - reachable from an indented block or a wrapped
// table, with nothing exotic in the text at all. `es`'s token scan was quadratic
// for a different reason: it walked to the nearest whitespace once per `?`.
//
// The budgets below are deliberately loose. A shared CI runner is slow and
// variable, and the failure being caught is three orders of magnitude, not three
// percent: everything here finishes in single-digit milliseconds once the
// patterns are unambiguous. A budget tight enough to be flaky would get deleted
// the first time it went red for the wrong reason, and then nothing would be
// watching.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check, fix, packs } from '../src/check.ts';
import { NARROW_NO_BREAK, NO_BREAK, THIN } from '../src/pack.ts';

/** Generous enough to survive a loaded runner, tight enough that any return of
 * super-linear behaviour blows straight through it. */
const BUDGET_MS = 2000;

function milliseconds(fn: () => unknown): number {
  const started = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - started) / 1e6;
}

function within(what: string, fn: () => unknown): void {
  const took = milliseconds(fn);
  assert.ok(
    took < BUDGET_MS,
    `${what} took ${took.toFixed(0)} ms, over the ${BUDGET_MS} ms budget. ` +
      'This is the shape of a backtracking blowup rather than a slow machine.',
  );
}

/** Inputs that are ordinary text, not adversarial constructions. Every one of
 * them is something a real document contains: a padded line, an indented block,
 * a run of no-break spaces from a bad paste, a long URL. */
const SHAPES: readonly { name: string; text: string }[] = [
  { name: 'a 20,000-space line', text: `Voici du texte.\n${' '.repeat(20_000)}\nEt la suite.` },
  { name: 'a 20,000-character run of U+00A0', text: `Texte ${NO_BREAK.repeat(20_000)} fin` },
  { name: 'a 20,000-character run of U+202F', text: `Texte ${NARROW_NO_BREAK.repeat(20_000)} fin` },
  { name: 'a 20,000-character run of U+2009', text: `Texte ${THIN.repeat(20_000)} fin` },
  {
    name: 'mixed spaces, 20,000 characters',
    text: `Texte ${` ${NO_BREAK}${THIN}${NARROW_NO_BREAK}`.repeat(5_000)} fin`,
  },
  {
    name: 'a space run that does reach a guillemet',
    text: `Il a dit «${' '.repeat(20_000)}bonjour».`,
  },
  { name: 'one unbroken 20,000-character token', text: `a?${'a?'.repeat(10_000)}` },
  {
    name: 'a very long URL',
    text: `Vease https://example.com/${'a/'.repeat(5_000)}?q=1 y luego mas texto.`,
  },
  { name: '20,000 quotation marks', text: '«»'.repeat(10_000) },
  { name: '20,000 sentences', text: '¿Como estas? '.repeat(1_500) },
];

for (const { name, text } of SHAPES) {
  test(`check stays linear on ${name}`, () => {
    for (const pack of packs) within(`check(${pack.lang}) on ${name}`, () => check(pack, text));
  });

  test(`fix stays linear on ${name}`, () => {
    for (const pack of packs) within(`fix(${pack.lang}) on ${name}`, () => fix(pack, text));
  });
}

// The budget above catches a blowup. This catches the subtler thing: a rule that
// is linear but with a cost per character that grows with the input, which reads
// as "slow" long before it reads as "hung". Doubling the input may not double the
// time exactly on a noisy runner, so the bound is 4x for a 2x input, which no
// quadratic rule can slip under and no linear rule can exceed.
test('cost grows no faster than the text does', () => {
  const line = (n: number) =>
    `Il a dit :${' '.repeat(n)}\nEt puis « bonjour » ;\n${'a?'.repeat(n / 2)}`;

  for (const pack of packs) {
    // Warm the JIT on a shape it will meet in the measured runs, so the first
    // measurement is not paying for compilation the second one gets free.
    check(pack, line(4_000));

    const small = Math.max(
      1,
      milliseconds(() => check(pack, line(20_000))),
    );
    const large = milliseconds(() => check(pack, line(40_000)));

    assert.ok(
      large < small * 4,
      `${pack.lang}: doubling the input took ${(large / small).toFixed(1)}x the time ` +
        `(${small.toFixed(1)} ms then ${large.toFixed(1)} ms), which is superlinear.`,
    );
  }
});
