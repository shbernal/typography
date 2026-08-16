// The rules run over attacker-controllable text, so a pattern that backtracks
// catastrophically is a denial of service in any host that checks user input.
// `SECURITY.md` says so and calls such a pattern a vulnerability in this package,
// which makes this file the assertion behind that claim rather than a benchmark.
//
// What it is guarding against, concretely. `guillemet-open-space` and
// `guillemet-close-space` were once written as an alternation over
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

import { check, fix, styles } from '../src/check.ts';
import { withWidth } from '../src/fr.ts';
import { NARROW_NO_BREAK, NO_BREAK, THIN } from '../src/pack.ts';

/** The registry plus the two styles `withWidth` derives. Those carry patterns the
 * registry ones do not - the guillemet runs with the correct-spelling exclusion
 * removed - and a pattern that takes a space run is exactly the shape this file
 * exists to watch. Left out, they would be the fourth instance of the bug in the
 * header, shipping unmeasured. */
const MEASURED = [...styles, withWidth(NO_BREAK), withWidth(NARROW_NO_BREAK)];

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
    for (const pack of MEASURED) within(`check(${pack.id}) on ${name}`, () => check(pack, text));
  });

  test(`fix stays linear on ${name}`, () => {
    for (const pack of MEASURED) within(`fix(${pack.id}) on ${name}`, () => fix(pack, text));
  });
}

/** How long a batch of repeats must run before its timing is worth reading.
 *
 * A single `check` of the smaller input below costs about 0.05 ms in the German
 * packs, which is far beneath what a loaded shared runner resolves, so timing one
 * call there measures the scheduler and not the rules. An earlier version of this
 * test timed one call of a much larger input and floored the result at 1 ms to
 * keep the division safe, which meant `de-DE` and `de-CH` were never actually
 * being checked: their cost sat under the floor, the ratio came out below 1, and
 * the assertion passed without having measured anything. Repeating the call into
 * a batch this long and dividing back out measures the same quantity with the
 * noise averaged down, and gives every pack a baseline that means something.
 *
 * It also decouples precision from size, which is what lets the inputs below be
 * small. Resolution now comes from the repeat count and not from handing the
 * rules a bigger string. */
const BATCH_MS = 25;

/** How many batches of each size to take, alternating between the two sizes.
 *
 * The alternation is the part that matters. Measuring one size to completion and
 * then the other puts anything that changes between the two phases - a frequency
 * step, a co-tenant waking up, a GC cycle - undiluted into the ratio, because it
 * moves one measurement and not the other. Sampling both across the same window
 * moves them together. Measured over fifteen trials of the four packs then shipping, that took
 * the worst ratio seen from 4.8x down to 3.9x, against a bound of 5x, and put
 * every pack's median between 3.1x and 3.3x, which is what linear looks like
 * here. */
const ROUNDS = 3;

/** Cost of one call, from a batch of `runs` of them. */
function perRun(fn: () => unknown, runs: number): number {
  return (
    milliseconds(() => {
      for (let i = 0; i < runs; i++) fn();
    }) / runs
  );
}

/** How many repeats of `fn` it takes to fill `BATCH_MS`. */
function batchSize(fn: () => unknown): number {
  let runs = 1;
  while (runs < 1 << 20) {
    const took = milliseconds(() => {
      for (let i = 0; i < runs; i++) fn();
    });
    if (took >= BATCH_MS) break;
    runs *= 2;
  }
  return runs;
}

// The budget above catches a blowup. This catches the subtler thing: a rule that
// is linear but with a cost per character that grows with the input, which reads
// as "slow" long before it reads as "hung".
//
// The input is tripled rather than doubled, and the bound is 5x, because those
// two numbers have to straddle a gap. A linear rule given 3x the text takes about
// 3x the time and a quadratic one takes about 9x, so 5x sits between them with
// room on both sides. Doubling does not offer that: linear lands on 2x and
// quadratic on 4x, so a 4x bound is placed exactly where a quadratic rule lands
// and catches it or misses it on the noise of the day. Measured here, with a
// deliberately quadratic function against a deliberately linear one: quadratic
// came in at 7.4x to 10.6x and linear at 2.5x to 3.4x, five trials each, with no
// overlap. At 2x and a 4x bound the same quadratic function scored 3.5x to 4.5x
// and went undetected in three trials out of five.
test('cost grows no faster than the text does', () => {
  const line = (n: number) =>
    `Il a dit :${' '.repeat(n)}\nEt puis « bonjour » ;\n${'a?'.repeat(n / 2)}`;

  // Built once, out here, because `line` allocates in proportion to `n`. Building
  // it inside the measured region charged the rules for the string builder too,
  // and charged the larger size three times as much of it as the smaller one,
  // which is a growing cost per character that has nothing to do with the rules.
  //
  // Both are small on purpose, and both stay small. The comparison assumes the
  // only thing that changes between them is how much text there is, and a buffer
  // large enough to fall out of cache breaks that: the same linear rule reads a
  // bigger string more slowly per character, and the ratio reports it as
  // superlinear. At 20,000 against 60,000 that is not hypothetical. CI's Linux
  // runner scored `de-DE` at 5.0x, 0.42 ms against 2.09 ms per run, and this
  // repository's development machine scored `fr` at 4.7x, both on rules that had
  // not changed. At the sizes below every pack sits near 3.1x on both. The
  // budgets at the top of this file are where the 20,000-character shapes are
  // exercised, and they are the right instrument for it, because an absolute
  // budget does not care how the cost is divided up.
  const small = line(5_000);
  const large = line(15_000);

  for (const pack of MEASURED) {
    // Warm the JIT on a shape it will meet in the measured runs, so the first
    // measurement is not paying for compilation the second one gets free.
    check(pack, line(4_000));

    const smallRuns = batchSize(() => check(pack, small));
    const largeRuns = batchSize(() => check(pack, large));

    // Fastest rather than average, because the interference here is one-sided:
    // nothing makes a run finish sooner than its own cost, so the minimum is the
    // closest reading available to the cost with the interference taken out.
    let smallCost = Number.POSITIVE_INFINITY;
    let largeCost = Number.POSITIVE_INFINITY;
    for (let round = 0; round < ROUNDS; round++) {
      smallCost = Math.min(
        smallCost,
        perRun(() => check(pack, small), smallRuns),
      );
      largeCost = Math.min(
        largeCost,
        perRun(() => check(pack, large), largeRuns),
      );
    }

    assert.ok(
      largeCost < smallCost * 5,
      `${pack.id}: tripling the input took ${(largeCost / smallCost).toFixed(1)}x the time ` +
        `(${smallCost.toFixed(2)} ms then ${largeCost.toFixed(2)} ms per run), which is superlinear. ` +
        'A linear rule lands near 3x here.',
    );
  }
});
