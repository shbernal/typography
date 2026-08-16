// The composition layer: what `compose` and `derive` promise to somebody who is
// not this repository.
//
// `styles.test.ts` holds the five shipped bundles to the claims their comments
// make. This file is about the other half of the pivot, the half that has no
// maintainer: a style assembled in somebody's config out of rules that were
// never reviewed together. Two things have to hold for that to be worth
// shipping. The stamp has to move whenever the rules do, or a corpus normalized
// under two configurations is unrecoverable afterwards. And `audit` has to
// actually catch a broken composition, which is why half of this file builds
// broken ones on purpose: a property test that has never failed is a property
// test nobody has checked.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { audit, compose, derive, stampOf } from '../src/compose.ts';
import { deCH } from '../src/de-CH.ts';
import { es } from '../src/es.ts';
import { fr, withWidth } from '../src/fr.ts';
import { conformRule, NARROW_NO_BREAK, NO_BREAK, type Rule, replaceRule } from '../src/pack.ts';
import { straightDoubleQuote } from '../src/rules/straight-double-quote.ts';
import { texts } from './fixtures.ts';

const CITE = 'ACME house style v3, section 2';

/** A pair of rules that undo each other, which is the hazard a composed rule
 * set has and a reviewed one mostly does not. Each is correct on its own. */
const toDagger = replaceRule({
  id: 'to-dagger',
  summary: 'A section sign where this style sets a dagger',
  cite: CITE,
  pattern: /\u00A7/g,
  replacement: '\u2020',
});

const toSection = replaceRule({
  id: 'to-section',
  summary: 'A dagger where this style sets a section sign',
  cite: CITE,
  pattern: /\u2020/g,
  replacement: '\u00A7',
});

// ---------------------------------------------------------------------------
// The stamp
// ---------------------------------------------------------------------------

test('the same rules stamp the same way, whatever the style is called', () => {
  // The property that makes a stamp worth carrying beside a corpus: it answers
  // "were these two bodies of text put through the same rules", and nothing
  // else. A user who copies a shipped rule list under their own name gets their
  // own name and the same stamp, which is exactly what is true of their text.
  const mine = compose({ name: 'acme-house', standard: 'ACME', rules: fr.rules });
  assert.equal(mine.stamp, fr.stamp);
  assert.notEqual(mine.id, fr.id);
  assert.equal(mine.id, `acme-house@${fr.stamp}`);
});

test('order is part of the stamp', () => {
  // `normalize` is the fixable rules in sequence, so two orderings are two
  // functions and a stamp that could not tell them apart would be claiming
  // something false about a corpus.
  const reversed = [...fr.rules].reverse();
  assert.notEqual(stampOf(reversed), stampOf(fr.rules));
});

test('the stamp moves when what a rule reports moves', () => {
  // Not only when a pattern moves. A citation is what a report answers a dispute
  // with, so two corpora checked under two citations were not checked the same
  // way even if every offset agreed.
  const one = straightDoubleQuote({ instead: 'this style sets `«»`', cite: CITE });
  const two = straightDoubleQuote({ instead: 'this style sets `«»`', cite: `${CITE}, revised` });
  assert.equal(one.find('"x"').length, two.find('"x"').length);
  assert.notEqual(stampOf([one]), stampOf([two]));
});

test('two imposed widths stamp differently though their patterns are identical', () => {
  // The case the whole `Spelling` design exists for, and the one a naive stamp
  // gets wrong silently. `withWidth` builds character-for-character identical
  // patterns for the two widths, because the width reaches the text through
  // `choose` and never through the pattern. A corpus retyped into U+00A0 and one
  // retyped into U+202F would then have carried one id.
  const wide = withWidth(NO_BREAK);
  const narrow = withWidth(NARROW_NO_BREAK);
  const probe = 'il a dit « mot » ; voila';

  // Everything a reader can see of the two styles is the same, including which
  // offsets they report, because the width is in neither the pattern nor the
  // sentence. Only the repair differs.
  const shapeOf = (rules: readonly Rule[]) =>
    rules.map((rule) => `${rule.id}:${rule.summary}:${JSON.stringify(rule.find(probe))}`);
  assert.deepEqual(shapeOf(wide.rules), shapeOf(narrow.rules));
  assert.notEqual(wide.normalize(probe), narrow.normalize(probe));

  assert.notEqual(wide.stamp, narrow.stamp);
  assert.notEqual(wide.stamp, fr.stamp);
});

test('a style is stamped the same way twice', () => {
  // Nothing in the hash may depend on when it ran or on object identity, or a
  // stamp written into a corpus on Tuesday means nothing on Wednesday.
  assert.equal(stampOf(fr.rules), stampOf(fr.rules));
  assert.equal(compose({ name: 'fr', lang: 'fr', standard: 'x', rules: fr.rules }).stamp, fr.stamp);
});

// ---------------------------------------------------------------------------
// What compose refuses
// ---------------------------------------------------------------------------

test('one style has one opinion about a position', () => {
  // Ids are global and collide across styles on purpose, since
  // `guillemet-open-space` is one question. Twice in one style is a composition
  // mistake with no useful reading, and it is invisible in a report, where the
  // two print as one rule disagreeing with itself.
  assert.throws(
    () => compose({ name: 'x', standard: 'x', rules: [...es.rules, ...deCH.rules] }),
    /declares .* twice/,
  );
});

test('a style with no rules and a style with no usable name are both refused', () => {
  assert.throws(() => compose({ name: 'x', standard: 'x', rules: [] }), /no rules/);
  assert.throws(
    () => compose({ name: 'acme house', standard: 'x', rules: fr.rules }),
    /not a usable style name/,
  );
  // The `@` above all, since it is what separates the name from the stamp.
  assert.throws(() => compose({ name: 'acme@1', standard: 'x', rules: fr.rules }), /usable style/);
});

// ---------------------------------------------------------------------------
// Override semantics
// ---------------------------------------------------------------------------

test('dropping, replacing and adding all assert something about the base', () => {
  // The reason these are three verbs and not one merge. A user's config outlives
  // the version of this package it was written against, and the failure it must
  // not have is the quiet one: a `drop` that stops dropping anything because the
  // rule was renamed, leaving a style that silently gained a rule.
  assert.throws(() => derive(fr, { drop: ['no-such-rule'] }), /no rule no-such-rule to drop/);
  assert.throws(() => derive(fr, { replace: [toDagger] }), /no rule to-dagger to replace/);
  assert.throws(
    () => derive(fr, { add: [straightDoubleQuote({ instead: 'x', cite: CITE })] }),
    /already has a rule straight-double-quote/,
  );
  // And the same rule named by two verbs at once, which is two answers to one
  // question rather than an order of operations to work out.
  assert.throws(
    () => derive(fr, { drop: ['apostrophe'], replace: [fr.rules[0]!] }),
    /both dropped and replaced/,
  );
});

test('a replaced rule keeps its position and an added one goes last', () => {
  // Position is not cosmetic: `normalize` applies the fixable rules in order, so
  // a replacement that moved to the end would change what the style does to text
  // without changing any rule.
  const swapped = straightDoubleQuote({ instead: 'a house pair', cite: CITE });
  const derived = derive(fr, { replace: [swapped], add: [toDagger] });
  const ids = derived.rules.map((rule) => rule.id);
  assert.deepEqual(
    ids.slice(0, -1),
    fr.rules.map((rule) => rule.id),
  );
  assert.equal(ids.at(-1), 'to-dagger');
  assert.equal(derived.rules[ids.indexOf('straight-double-quote')]!.cite, CITE);
});

test('a derived style keeps the base name and tag, and stamps differently', () => {
  // Two styles under one name and two stamps are two eras of that name, which is
  // what `fr.withWidth` produces and is the whole job of the `@`.
  const derived = derive(fr, { drop: ['straight-double-quote'] });
  assert.equal(derived.name, 'fr');
  assert.equal(derived.lang, 'fr');
  assert.equal(derived.standard, fr.standard);
  assert.notEqual(derived.stamp, fr.stamp);
});

test('a derived style can be renamed, and then it answers for itself', () => {
  const mine = derive(fr, {
    name: 'acme-fr',
    standard: 'ACME house style v3',
    drop: ['straight-double-quote'],
  });
  assert.equal(mine.id, `acme-fr@${mine.stamp}`);
  assert.equal(mine.lang, 'fr');
  assert.equal(mine.standard, 'ACME house style v3');
  assert.ok(!mine.rules.some((rule) => rule.id === 'straight-double-quote'));
  assert.equal(mine.normalize('il a dit "oui"'), fr.normalize('il a dit "oui"'));
});

// ---------------------------------------------------------------------------
// The properties
// ---------------------------------------------------------------------------

/** Enough text to reach the rules under test. `audit` is conditional on its
 * samples and a sample set that touches nothing passes everything, which is the
 * same trap the corpora had. */
const SAMPLES = ['a \u00A7 and a \u2020 in one line', 'nothing interesting here'];

test('audit catches two rules that undo each other', () => {
  // Neither rule is wrong. Together they are a style whose `normalize` never
  // settles, and no corpus of published text could have caught it, because the
  // defect is in the rule list rather than in anybody's prose.
  const style = compose({ name: 'ping-pong', standard: CITE, rules: [toDagger, toSection] });
  const found = audit(style, SAMPLES);

  const interference = found.filter((v) => v.property === 'non-interference');
  assert.equal(interference.length, 1);
  assert.equal(interference[0]!.rule, 'to-dagger');
  assert.equal(interference[0]!.culprit, 'to-section');
  // And the promise itself fails, which is what a user would actually notice:
  // `check` after `fix` still reports something `fix` claims to repair.
  assert.ok(found.some((v) => v.property === 'conformance' && v.rule === 'to-dagger'));
  // The sample is revealed rather than quoted raw, like every other report here.
  assert.ok(interference[0]!.sample.startsWith('"'));
});

test('audit catches a repair that does not settle', () => {
  // A `choose` that returns something its own pattern still matches. `fix` then
  // grows the text on every pass and each pass looks like progress.
  const style = compose({
    name: 'never-settles',
    standard: CITE,
    rules: [
      conformRule({
        id: 'doubling',
        summary: 'A section sign this style respells, badly',
        cite: CITE,
        pattern: /\u00A7/g,
        choose: () => '\u00A7\u00A7',
        params: ['test'],
      }),
    ],
  });
  const found = audit(style, SAMPLES);
  assert.ok(found.some((v) => v.property === 'idempotence' && v.rule === 'doubling'));
  assert.ok(found.some((v) => v.property === 'idempotence' && v.rule === 'normalize'));
  assert.ok(found.some((v) => v.property === 'conformance' && v.rule === 'doubling'));
});

test('a derived style inherits the properties, over the whole fixture set', () => {
  // The shipped styles are held to all three in `hazards.test.ts`, over these
  // fixtures and the generated battery. What is worth asserting *here* is the
  // half this file is about: `derive` produces a style nobody declared, and it
  // has to come out of that holding what its base held. `withWidth` is the one
  // the package ships, and it drops a rule and replaces three, which is every
  // verb `derive` has.
  for (const width of [NO_BREAK, NARROW_NO_BREAK])
    assert.deepEqual(
      audit(withWidth(width), texts()),
      [],
      'a derived French style fails a property',
    );
});
