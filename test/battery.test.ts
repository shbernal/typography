// The battery: 8,799 generated inputs through all eight styles.
//
// `hazards.test.ts` asks whether the rules can tell a sentence from a token, over
// text somebody wrote. This asks the mechanical question the corpora used to:
// does anything move. Every mark against every space run against every outer
// context, which is more combinations than anybody writes by hand and none of
// them a sentence, which is the point. Most of what a rule gets wrong is in text
// nobody would ever publish.
//
// **Why there is a digest and not only properties.** A property holds before and
// after a change that broke something a property does not name, and the stamp in
// `src/compose.ts` cannot help: it hashes what each rule *declares*, so a change
// to `src/prose.ts`, to a runner in `src/pack.ts` or to a helper any builder
// calls changes what every style does to text and moves no stamp at all. The
// digest is the one signal in this repo that watches behaviour rather than
// declarations. It replaces `gate-findings --verify`, which watched 5.8M
// characters of downloaded corpus to answer the same question and needed a
// network to do it.
//
// **When it fails.** Nothing here tells you what moved, only that something did.
// `pnpm battery` prints the dump the digest is over:
//
// ```bash
// git stash && pnpm battery > /tmp/before.txt && git stash pop
// pnpm battery > /tmp/after.txt && diff /tmp/before.txt /tmp/after.txt
// ```
//
// If the diff is the change you meant, re-cut the table below from the tail of
// `pnpm battery` and say in the commit message what moved and by how many lines.
// That is the same discipline the committed gate baselines had, at seven lines
// instead of nine files.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digest, everyInput, everyStyle } from '../scripts/battery.ts';
import { audit } from '../src/compose.ts';
import { combinations } from './fixtures.ts';

/**
 * What each style currently does to the generated inputs.
 *
 * Cut from `pnpm battery`. A row moves when a rule's pattern, its repair, its
 * summary, its citation or its severity moves, and also when something no stamp
 * can see moves. It does **not** move when a written fixture is added, which is
 * why the digest covers the generated half only: a baseline that moves for
 * reasons the reader already knows about stops being read.
 */
const DIGESTS: Record<string, string> = {
  'de-CH': 'ce18734a695d',
  'de-DE': '62c2c138ebc4',
  en: '328d500db6b4',
  es: 'c490cf732002',
  fr: '77b868df38ad',
  nl: '2507ee04f1f0',
  'fr+00A0': 'ec2e2510f41f',
  'fr+202F': '252fd267c366',
};

test('the battery generates what it claims to', () => {
  // The count is here because every assertion below is over these inputs, and a
  // generator that silently produced eleven of them would pass all of them.
  assert.equal(combinations().length, 8799);
  assert.equal(everyStyle().length, 8);
});

test('every style holds its three properties over every generated input', () => {
  // Idempotence, conformance and non-interference, which is `audit` doing on
  // 8,851 inputs what a user runs it for on their own text. The inputs are
  // deliberately not prose: an inserting rule that fails to match its own output
  // converges on `« mot »` and not on `«`, and this is where that shows.
  for (const { label, style } of everyStyle()) {
    const violations = audit(style, everyInput());
    assert.deepEqual(
      violations,
      [],
      `${label} fails ${violations[0]?.property} on ${violations[0]?.rule}: ${violations[0]?.detail}`,
    );
  }
});

test('nothing in any style moved', () => {
  const found: Record<string, string> = {};
  for (const { label, style } of everyStyle()) found[label] = digest(style, label);
  assert.deepEqual(
    found,
    DIGESTS,
    'a style behaves differently than it did. Run `pnpm battery` on this tree and ' +
      'on the one before the change, diff the two, and re-cut this table if the ' +
      'difference is the one you meant.',
  );
});
