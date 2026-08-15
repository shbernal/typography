// Dutch. Two things here have no counterpart in the other packs and most of this
// file is about them: the word-initial apostrophe, which is the same character
// in the same position as an opening quotation mark, and the consistency rule
// this pack has instead of a ruling on which quotation marks Dutch uses.
//
// Every invisible or lookalike character is spelled by name. U+2018 and U+2019
// are one pixel apart in a source file and this whole pack is about telling them
// apart, so a literal here would be a test that passes while asserting the wrong
// thing.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { nl } from '../src/nl.ts';
import { NO_BREAK, RIGHT_SINGLE_QUOTE as RSQ } from '../src/pack.ts';

const LSQ = '‘';
const LDQ = '“';
const RDQ = '”';
const LOW = '„';

const ids = (text: string) => check(nl, text).map((f) => f.rule);

test('an apostrophe between letters is fixed, from either wrong form', () => {
  // The Dutch plural of a vowel-final noun, which is why this rule fires more
  // here than in French or German.
  assert.equal(nl.normalize("auto's"), `auto${RSQ}s`);
  assert.equal(nl.normalize("zo'n dag"), `zo${RSQ}n dag`);
  // U+2018 in apostrophe position: a smart-quote pass that turned the wrong way.
  // This is the only pack that converts it, and only here, between two letters,
  // where it cannot be opening anything.
  assert.equal(nl.normalize(`auto${LSQ}s`), `auto${RSQ}s`);
});

test('a word-initial elision is fixed', () => {
  assert.equal(nl.normalize("'s morgens"), `${RSQ}s morgens`);
  assert.equal(nl.normalize("'t huis"), `${RSQ}t huis`);
  assert.equal(nl.normalize("'n keer"), `${RSQ}n keer`);
  assert.equal(nl.normalize("'s-Gravenhage"), `${RSQ}s-Gravenhage`);
  // `ns` has to win the alternation against `n`, or the `s` of `'ns` is stranded
  // and the elision goes unrepaired.
  assert.equal(nl.normalize("'ns kijken"), `${RSQ}ns kijken`);
});

test('and it does not touch a quoted word that begins with a clitic letter', () => {
  // The case the closed set and the required boundary exist for. `'strand'` is a
  // quoted word; `'s ` is an elision. Both are a straight quote followed by `s`.
  for (const text of ["'strand' is een woord", "'trein' en 'niets'", "'model' zei hij"]) {
    assert.equal(nl.normalize(text), text, `retyped a quotation mark in ${JSON.stringify(text)}`);
  }
});

test('an apostrophe after a digit or symbol is reported and not fixed', () => {
  // Cited and real: `A4'tje`, `80'ers`, `D66'er`.
  assert.ok(ids("de 80'ers").includes('nl.apostrophe-after-symbol'));
  assert.ok(ids("een A4'tje").includes('nl.apostrophe-after-symbol'));
  // And check-only, because the same three characters are a sized literal.
  assert.equal(nl.normalize("de 80'ers"), "de 80'ers");
  assert.equal(nl.normalize("assign x = 4'b1010;"), "assign x = 4'b1010;");
});

test('Ij is reported and never repaired', () => {
  // Wrong under every reading, which is what makes it detectable, and the repair
  // needs to know whether the sentence just started, which is what makes it
  // unfixable.
  assert.ok(ids('Ijmuiden').includes('nl.ij-capital'));
  const found = check(nl, 'Ijmuiden').find((f) => f.rule === 'nl.ij-capital');
  assert.ok(found);
  assert.equal(found.fixable, false);
  assert.equal(nl.normalize('Ijmuiden'), 'Ijmuiden');
  // Both correct forms are silent.
  assert.equal(ids('IJmuiden').includes('nl.ij-capital'), false);
  assert.equal(ids('Ik eet ijs.').includes('nl.ij-capital'), false);
});

test('mixing two systems of quotation mark is reported', () => {
  const mixed = `Hij zei ${LDQ}ja${RDQ} en zij zei ${LSQ}nee${RSQ}.`;
  assert.ok(ids(mixed).includes('nl.mixed-quotation-marks'));
  // The minority family is the one reported, and it is reported once per opening
  // mark rather than once per document.
  const found = check(nl, mixed).filter((f) => f.rule === 'nl.mixed-quotation-marks');
  assert.equal(found.length, 1);
  assert.equal(mixed[found[0]!.index], LSQ);
});

test('and a text consistent in any one system is silent', () => {
  for (const text of [
    `Hij zei ${LDQ}ja${RDQ} en ${LDQ}nee${RDQ}.`,
    `Hij zei ${LSQ}ja${RSQ} en ${LSQ}nee${RSQ}.`,
    // The low pair is obsolescent and still consistent, so a ballot that could
    // not see it would report every quotation in this line.
    `Hij zei ${LOW}ja${RDQ} en ${LOW}nee${RDQ}.`,
  ]) {
    assert.equal(
      ids(text).includes('nl.mixed-quotation-marks'),
      false,
      `reported a consistent text: ${JSON.stringify(text)}`,
    );
  }
});

test('apostrophes do not vote in the quotation ballot', () => {
  // The trap this pack is built around. U+2019 is the closing single quotation
  // mark and also the apostrophe, so a document full of `auto’s` must not count
  // as a document full of single quotations. The ballot reads openers only, and
  // the opening guard keeps a mis-set U+2018 out of it too.
  const text = `De auto${RSQ}s en de baby${RSQ}s stonden in ${LDQ}de straat${RDQ}.`;
  assert.equal(ids(text).includes('nl.mixed-quotation-marks'), false);
});

test('it is never fixable, however obvious the substitution looks', () => {
  const mixed = `${LDQ}ja${RDQ} en ${LSQ}nee${RSQ}`;
  const found = check(nl, mixed).find((f) => f.rule === 'nl.mixed-quotation-marks');
  assert.ok(found);
  assert.equal(found.fixable, false);
  // Nothing is harmonised. U+2019 closes the single pair and is also the
  // apostrophe, so a pass that rewrote closers would retype every elision.
  assert.equal(nl.normalize(mixed), mixed);
});

test('a space before punctuation is reported and not deleted', () => {
  assert.ok(ids('Wat vind je ?').includes('nl.space-before-punctuation'));
  assert.ok(ids(`Wat vind je${NO_BREAK}?`).includes('nl.space-before-punctuation'));
  assert.equal(nl.normalize('Wat vind je ?'), 'Wat vind je ?');
  assert.equal(nl.normalize('const y = a ? b : c;'), 'const y = a ? b : c;');
  assert.equal(
    ids('Zie https://voorbeeld.nl/a?b=1 ;').includes('nl.space-before-punctuation'),
    false,
  );
});

test('the pack has no rule about which quotation marks Dutch uses', () => {
  // The absence is the deliberate part: the citation fixes consistency and
  // nothing else, so this pack must not assert a system. If a rule ever appears
  // that reports a correctly and consistently set Dutch quotation, it is
  // asserting what its citation does not fix.
  for (const text of [
    `Hij zei ${LDQ}ja${RDQ}.`,
    `Hij zei ${LSQ}ja${RSQ}.`,
    `Hij zei ${LOW}ja${RDQ}.`,
  ]) {
    assert.deepEqual(check(nl, text), [], `reported correctly set Dutch: ${JSON.stringify(text)}`);
  }
});

test('the pack stamps an era', () => {
  assert.equal(nl.id, 'nl@0.1.0');
  assert.equal(nl.lang, 'nl');
});
