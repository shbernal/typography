// What a generated document does to the rules.
//
// This is the file the corpus gates were replaced by, and it asks a different
// question than they did. They asked whether a rule misfires on text a
// professional already set correctly, over 5.8M downloaded characters. This asks
// whether a rule can tell a sentence from a token, over `test/fixtures.ts`,
// because the input this package is now for arrives with a fenced block and a
// JSON payload in the middle of it.
//
// Four properties, and the order is the argument:
//
// 1. **The fixtures reach every rule.** A zero is not a result. This is asserted
//    first because every property below it is conditional on it, and a fixture
//    set that drifts out of contact with a rule turns three passing tests into
//    three tests of nothing.
// 2. **Every style holds its own three properties** over all of it, which is
//    `audit` run on the shipped styles the way a user runs it on theirs.
// 3. **These rules rewrite syntax, and no others.** A written-down list, because
//    two of them do. The list is a ratchet: a rule that starts reading code as
//    prose fails here and names the fixture it read.
// 4. **No fix joins two words.** The invariant behind every guillemet guard in
//    the package, stated once over everything instead of as one hand-written
//    example per style.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { styles } from '../src/check.ts';
import { audit, derive } from '../src/compose.ts';
import { deCH } from '../src/de-CH.ts';
import { deDE } from '../src/de-DE.ts';
import { es } from '../src/es.ts';
import { fr, withWidth } from '../src/fr.ts';
import {
  LEFT_SINGLE_QUOTE as LSQ,
  NARROW_NO_BREAK,
  NO_BREAK,
  RIGHT_SINGLE_QUOTE as RSQ,
  reveal,
  type Style,
} from '../src/pack.ts';
import { innerSpace } from '../src/rules/inner-space.ts';
import { ANY_SPACE } from '../src/rules/space.ts';
import { FIXTURES, MACHINE, texts } from './fixtures.ts';

/** Every style a caller can be handed, the two derived French ones included.
 * `withWidth` produces a style nobody in this repo declared, which is the shape
 * a user's config has, so it belongs in front of the same fixtures. */
const ALL: readonly Style[] = [...styles, withWidth(NO_BREAK), withWidth(NARROW_NO_BREAK)];

function fixture(name: string): string {
  const found = FIXTURES.find((sample) => sample.name === name);
  assert.ok(found, `no fixture named ${name}`);
  return found.text;
}

// ---------------------------------------------------------------------------
// 1. The fixtures reach the rules
// ---------------------------------------------------------------------------

test('every rule in every shipped style fires on at least one fixture', () => {
  // The trap the corpora had, and the one `audit` names in its own doc comment:
  // a rule reports nothing either because the text was set correctly or because
  // it contained nothing the rule could match, and only the first is evidence.
  // A fixture file is a corpus somebody wrote on purpose, so it has no excuse
  // for the second.
  for (const style of styles) {
    const reached = new Set<string>();
    for (const sample of FIXTURES)
      for (const rule of style.rules) if (rule.find(sample.text).length > 0) reached.add(rule.id);
    for (const rule of style.rules)
      assert.ok(
        reached.has(rule.id),
        `no fixture reaches ${style.name}'s ${rule.id}, so every property below is silent about it`,
      );
  }
});

// ---------------------------------------------------------------------------
// 2. The three properties
// ---------------------------------------------------------------------------

test('every style holds idempotence, conformance and non-interference', () => {
  // `compose.test.ts` shows these bite, by composing styles that fail them on
  // purpose. This is the same three properties over the shipped and derived
  // styles and the whole fixture set, which is the closest thing left to what a
  // gate run used to be, at the cost of a test rather than a network fetch.
  for (const style of ALL) {
    const violations = audit(style, texts());
    assert.deepEqual(
      violations,
      [],
      `${style.id} fails ${violations[0]?.property} on ${violations[0]?.rule}: ${violations[0]?.detail}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 3. Which rules read syntax as prose
// ---------------------------------------------------------------------------

/**
 * The rules that rewrite machine text today, by style name, with the fixtures
 * each one rewrites.
 *
 * **Every entry here is a defect**, and the list exists because writing "no rule
 * touches machine text" would have been false. `FOLLOW-UPS.md` 4 holds the
 * apostrophe one, which is the same rewrite in four styles: `it's` between two
 * letters is an elision in prose and a string delimiter in code, and nothing in
 * `apostrophe` looks at which. The French pair is the same shape one position
 * over, where `a ? b : c` inside a code span is a ternary and gets a no-break
 * space in front of both marks.
 *
 * A rule appearing here that is not written down fails the test, which is the
 * point: this is a ratchet on how much syntax the package is willing to rewrite,
 * and it only moves when somebody decides to move it.
 */
const APOSTROPHE_IN_CODE = ['fenced-javascript', 'json-payload', 'html-attributes'];
const REWRITES_SYNTAX: Record<string, Record<string, readonly string[]>> = {
  'de-CH': { apostrophe: APOSTROPHE_IN_CODE },
  'de-DE': { apostrophe: APOSTROPHE_IN_CODE },
  // English rewrites the same three and nothing else, which is worth reading
  // rather than assuming: it is the style with the most rules about the
  // apostrophe, and the two it adds are both narrowed by something the
  // letter-to-letter rule has no equivalent of. `apostrophe-elision` needs a
  // closed clitic set closed by a boundary, so `{ unit: 'em' }` fails it on the
  // quote that follows; `decade-apostrophe` needs a digit and an `s`. The rule
  // that does reach code is the one with the widest licence and the oldest
  // follow-up.
  en: { apostrophe: APOSTROPHE_IN_CODE },
  // Spanish rewrites none of it, and that is not luck: it has no apostrophe rule,
  // and its spacing rule is check-only precisely because deleting the space in
  // `a ? b : c` would corrupt a ternary.
  fr: {
    apostrophe: APOSTROPHE_IN_CODE,
    'colon-spacing': ['fenced-python', 'inline-code-span'],
    'punctuation-spacing': ['fenced-python', 'inline-code-span', 'log-line'],
  },
  nl: { apostrophe: APOSTROPHE_IN_CODE },
};

test('these rules rewrite machine text, and no others do', () => {
  const found: Record<string, Record<string, string[]>> = {};
  for (const style of ALL)
    for (const sample of MACHINE)
      for (const rule of style.rules) {
        if (!rule.fix || rule.fix(sample.text) === sample.text) continue;
        found[style.name] ??= {};
        const perStyle = found[style.name]!;
        perStyle[rule.id] ??= [];
        const perRule = perStyle[rule.id]!;
        if (!perRule.includes(sample.name)) perRule.push(sample.name);
      }
  assert.deepEqual(
    found,
    REWRITES_SYNTAX,
    'a rule started or stopped rewriting machine text. If it started, that is a ' +
      'rule reading code as prose; if it stopped, delete its row and the follow-up.',
  );
});

test('the derived French styles reach the same syntax as `fr`, in another width', () => {
  // `withWidth` widens two guillemet patterns and drops the ballot, so it is the
  // one derived style whose reach could differ from its base. It does not: it
  // touches the same positions in the same fixtures and writes a different
  // character into them, which is the whole of what an imposed width is. That is
  // why the ratchet above files all three French styles under one row, and it is
  // worth asserting rather than assuming, since the difference between the two
  // outputs is a character nobody can see.
  const fold = (value: string) => value.replaceAll(NO_BREAK, '#').replaceAll(NARROW_NO_BREAK, '#');
  for (const width of [NO_BREAK, NARROW_NO_BREAK]) {
    const house = withWidth(width);
    for (const sample of MACHINE)
      assert.equal(
        fold(house.normalize(sample.text)),
        fold(fr.normalize(sample.text)),
        `${reveal(width)} reaches something different from fr on ${sample.name}`,
      );
  }
});

// ---------------------------------------------------------------------------
// 4. No fix joins two words
// ---------------------------------------------------------------------------

/** The words in a value, with every quotation mark treated as transparent.
 *
 * Transparent is the whole point. A style deleting the space inside `« mot »` is
 * doing its job and the word count must not move for it; a style deleting the
 * space in `»Wort« und` has welded two words and the count drops. Insertion is
 * fine in the other direction, since French inserting a space inside a closed-up
 * quotation splits `«mot»` into three. */
function words(value: string): string[] {
  return value
    .replace(new RegExp(`[«»„“”\\u201a${LSQ}${RSQ}"'¿¡]`, 'gu'), '')
    .split(/\s+/u)
    .filter(Boolean);
}

test('no fix joins two words, in any style, on any fixture', () => {
  // The invariant every `guard` in `rules/inner-space.ts` exists to protect, and
  // until now it was asserted by two hand-written German examples. `«` opens a
  // quotation in Spanish, French and Switzerland and closes one in Germany, so a
  // rule closing up the wrong one of those deletes the space between two words.
  // That shipped in `es@0.1.0` and nine corpora could not see it.
  for (const style of ALL)
    for (const sample of FIXTURES) {
      const after = style.normalize(sample.text);
      assert.ok(
        words(after).length >= words(sample.text).length,
        `${style.id} welded words in ${sample.name}: ${reveal(sample.text)} -> ${reveal(after)}`,
      );
    }
});

test('the joined-words property bites', () => {
  // A zero is not a result, so here is the style that fails it: Spanish with the
  // two lookarounds taken back off, which is exactly what shipped in `es@0.1.0`.
  // Without this the test above passes for any set of rules that happens not to
  // delete anything.
  const unguarded = derive(es, {
    name: 'es-unguarded',
    replace: [
      innerSpace({
        summary: 'Space after an opening guillemet, with the cross-language guard removed',
        cite: 'FOLLOW-UPS.md 1, reconstructing es@0.1.0',
        mark: '«',
        side: 'open',
        spaces: ANY_SPACE,
        correct: '',
        guard: false,
      }),
      innerSpace({
        summary: 'Space before a closing guillemet, with the cross-language guard removed',
        cite: 'FOLLOW-UPS.md 1, reconstructing es@0.1.0',
        mark: '»',
        side: 'close',
        spaces: ANY_SPACE,
        correct: '',
        guard: false,
      }),
    ],
  });
  const german = 'Er sagte »Wort« und ging.';
  assert.equal(unguarded.normalize(german), 'Er sagte»Wort«und ging.');
  assert.ok(words(unguarded.normalize(german)).length < words(german).length);
  // And the shipped style, on the same input, for the contrast.
  assert.equal(es.normalize(german), german);
});

// ---------------------------------------------------------------------------
// A quotation from another convention
// ---------------------------------------------------------------------------

test('what each style does to a French quotation inside its own prose', () => {
  // Mixed-language quotation is the hazard no corpus could hold, since each was
  // one publisher writing one language correctly (`FOLLOW-UPS.md` 1c). It is
  // ordinary in generated text, so what each style does to it is written down
  // rather than left to be discovered.
  const german = fixture('french-title-in-german');

  // Swiss German uses the same pair pointing the same way, so closing it up is a
  // correction: the text comes out correct under the style that was asked for.
  assert.equal(deCH.normalize(german), 'Er las «Le Monde» gestern Abend.');
  assert.equal(es.normalize(german), 'Er las «Le Monde» gestern Abend.');

  // **de-DE moves both spaces to the outside of the marks.** `FOLLOW-UPS.md` 1d.
  // Germany points the pair the other way, so `«` is a closing mark here and the
  // guard, which reads the character immediately outside the mark, cannot tell a
  // German closer with a stray space in front of it from a French opener with a
  // legitimate one after it. The two are the same string. Resolving it needs
  // pairing, which is a parse, which is where `check` stops being a superset of
  // `fix` for a reason. The assertion is here to be deleted the day that is
  // fixed, and to be seen in the meantime.
  assert.equal(deDE.normalize(german), 'Er las« Le Monde »gestern Abend.');
});

test('what French does to a German quotation inside its own prose', () => {
  // `FOLLOW-UPS.md` 1b, the milder half of the same hazard, and the reason
  // `fr`'s two inner-space rules carry `guard: false` with a paragraph beside
  // them. French reads the German closing `«` as an opening guillemet and
  // rewrites the word spaces on the *outside* of the quotation. Nothing is
  // welded, which is why it is milder and why the test above passes.
  const french = fixture('german-title-in-french');
  assert.equal(
    fr.normalize(french),
    `Il a lu${NARROW_NO_BREAK}»Die Zeit«${NARROW_NO_BREAK}hier soir.`,
  );
});
