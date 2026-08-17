// English. The style this package spent four releases saying it would not have,
// so this file leads with the two decisions that let it ship: what is in it, and
// what is deliberately not.
//
// Every lookalike character is spelled by name. U+2018 and U+2019 are one pixel
// apart in a source file and two of the three fixable rules here are about
// exactly that difference, so a literal would be a test that passes while
// asserting the wrong thing.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { LEFT_SINGLE_QUOTE as LSQ, RIGHT_SINGLE_QUOTE as RSQ } from '../src/pack.ts';
import { en } from '../src/styles/en.ts';

const ids = (text: string) => check(en, text).map((f) => f.rule);

test('an apostrophe between letters is fixed, from either wrong form', () => {
  assert.equal(en.normalize("it's"), `it${RSQ}s`);
  assert.equal(en.normalize("don't"), `don${RSQ}t`);
  assert.equal(en.normalize("o'clock"), `o${RSQ}clock`);
  // U+2018 in apostrophe position: a smart-quote pass that turned the wrong way.
  assert.equal(en.normalize(`don${LSQ}t`), `don${RSQ}t`);
});

test('a word-initial elision is fixed, and only inside the closed set', () => {
  assert.equal(en.normalize("'tis the season"), `${RSQ}tis the season`);
  assert.equal(en.normalize("give 'em hell"), `give ${RSQ}em hell`);
  assert.equal(en.normalize("'twas brillig"), `${RSQ}twas brillig`);
  assert.equal(en.normalize(`${LSQ}tis so`), `${RSQ}tis so`);
  // The end of a value closes a clitic, which Dutch's boundary deliberately does
  // not do: English elides in a sentence and Dutch inside a name.
  assert.equal(en.normalize("give 'em"), `give ${RSQ}em`);
});

test('a quoted word that begins like a clitic is left alone', () => {
  // The narrowing the whole rule rests on. `'em'` is the CSS unit named in
  // single quotes and `'emphasis'` is a quoted word, and both fail the boundary
  // rather than the clitic set: what follows `em` is a quote in one and a letter
  // in the other.
  for (const text of ["the unit 'em' in CSS", "'emphasis' is the word", "'tissue' sample"])
    assert.equal(en.normalize(text), text, `retyped a quotation mark in ${JSON.stringify(text)}`);
});

test('a possessive after the s is neither fixed nor reported', () => {
  // The ceiling the corpus run found, held here so it is asserted rather than
  // remembered. `apostrophe` needs a letter on both sides, which is what keeps it
  // off a quotation mark, and a plural possessive has a space on its right: the
  // two are the same character in the same position and no lookaround separates
  // them. Measured on 6.66M characters of English in `docs/provenance.md`.
  const text = "the bricklayers' union did a day's work, for goodness' sake";
  const fixed = `the bricklayers' union did a day${RSQ}s work, for goodness' sake`;
  assert.equal(en.normalize(text), fixed);
  // The consequence worth the test: the repaired document still carries two
  // straight apostrophes and the report afterwards is empty, so a caller reading
  // `check` alone cannot tell this document from one that was set correctly.
  assert.deepEqual(ids(fixed), []);
});

test('a decade takes an apostrophe and not an opening quotation mark', () => {
  assert.equal(en.normalize("the '90s"), `the ${RSQ}90s`);
  assert.equal(en.normalize(`the ${LSQ}20s`), `the ${RSQ}20s`);
  // The `s` is required, so a shortened year is out of scope: `'08'` is the same
  // character between two marks around a figure, and knowing which is which is
  // the parse this package does not attempt.
  assert.equal(en.normalize("the class of '08"), "the class of '08");
  // And the unshortened form, which has no elision and takes no mark at all.
  assert.equal(en.normalize('the 1990s'), 'the 1990s');
});

test('a double hyphen is reported and never rewritten', () => {
  const found = check(en, 'wait--no, that was the plan');
  assert.deepEqual(
    found.map((f) => f.rule),
    ['double-hyphen'],
  );
  assert.equal(found[0]!.fixable, false);
  // The summary names both admissible repairs rather than choosing one, which is
  // the reason there is no repair: Chicago closes an em dash up and Oxford sets
  // a spaced en dash, so writing either retypes text correct in the other.
  assert.match(found[0]!.summary, /U\+2014.*U\+2013/);
  assert.equal(en.normalize('wait--no'), 'wait--no');
});

test('a double hyphen inside machine text is not reported, as far as that goes', () => {
  // What `looksMachine` catches. The token carries a `/` or an `=`, so a slug and
  // an attribute are both out.
  assert.deepEqual(ids('see https://example.com/a--b for more'), []);
  // Single-quoted, because a double-quoted attribute is two findings of the
  // rule this test is not about.
  assert.deepEqual(ids("<div class='button--primary'>x</div>"), []);
  // And what it does not: a bare BEM selector in a stylesheet is a token that
  // looks like two words to every heuristic in this package. It is reported, and
  // that is the whole reason this rule does not repair. A report a reader
  // dismisses costs a line; a rewrite of somebody's class name costs a build.
  assert.deepEqual(ids('.button--primary { color: red; }'), ['double-hyphen']);
});

test('a space before punctuation is reported and not deleted', () => {
  assert.ok(ids('really ?').includes('punctuation-spacing'));
  assert.equal(en.normalize('really ?'), 'really ?');
  // The exemption is per token, so a URL is out and a bare ternary is not: the
  // token around the letter in `a ?` is `a`, which looks like a word to every
  // heuristic here. It is reported, and the rule is check-only precisely because
  // deleting that space would corrupt the ternary rather than repair a sentence.
  assert.equal(ids('see https://example.com/a?b=1 ;').includes('punctuation-spacing'), false);
  assert.ok(ids('const y = a ? b : c;').includes('punctuation-spacing'));
  assert.equal(en.normalize('const y = a ? b : c;'), 'const y = a ? b : c;');
});

test('a straight double quote is a warning and is never converted', () => {
  const found = check(en, 'she said "hello" and left').filter(
    (f) => f.rule === 'straight-double-quote',
  );
  assert.equal(found.length, 2);
  assert.equal(found[0]!.severity, 'warning');
  assert.equal(found[0]!.fixable, false);
  assert.equal(en.normalize('"hello"'), '"hello"');
});

test('there is no rule about the serial comma', () => {
  // The decision this style exists on the other side of, asserted rather than
  // remembered. Chicago requires it and other authorities forbid it, so it is a
  // divergence, and this style rules only on what is wrong under both readings.
  // A list without one is not a finding, and neither is a list with one.
  assert.deepEqual(check(en, 'apples, pears and figs'), []);
  assert.deepEqual(check(en, 'apples, pears, and figs'), []);
});

test('correctly set English is reported clean', () => {
  const correct = [
    `It${RSQ}s the ${RSQ}90s again, and ${RSQ}tis fine.`,
    'The build ran; it passed. Did it? Yes!',
    'A well-known dash, a range of 10-20, and a flag like --write.',
  ];
  for (const text of correct)
    assert.deepEqual(check(en, text), [], `reported correct English: ${JSON.stringify(text)}`);
});

test('the style is named for its tag and carries a derived stamp', () => {
  assert.match(en.id, /^en@[0-9a-f]{12}$/);
  assert.equal(en.lang, 'en');
  // Three fixable rules and three detections, and every fixable one is about the
  // same character in a different position.
  assert.deepEqual(
    en.rules.filter((rule) => rule.fix).map((rule) => rule.id),
    ['apostrophe', 'apostrophe-elision', 'decade-apostrophe'],
  );
});
