// French. The five fixable rules are asserted against explicit code points
// rather than pasted characters, because U+00A0, U+202F and U+0020 are
// indistinguishable in this file and a test that used them literally would pass
// while asserting the wrong thing.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { fr } from '../src/fr.ts';

const NBSP = '\u00a0';
const NNBSP = '\u202f';
const THINSP = '\u2009';
const RSQUO = '\u2019';

const ids = (text: string) => check(fr, text).map((f) => f.rule);

test('the apostrophe rule needs a letter on both sides', () => {
  assert.equal(fr.normalize("l'ete"), `l${RSQUO}ete`);
  // A quote used as a quote, an apostrophe in a code token, and one next to a
  // digit or a bracket all survive. This narrowing is the rule.
  assert.equal(fr.normalize("'quoted'"), "'quoted'");
  assert.equal(fr.normalize("x['key']"), "x['key']");
  assert.equal(fr.normalize("annee '90"), "annee '90");
});

test('spacing before punctuation converts and never inserts', () => {
  assert.equal(fr.normalize('voici : ici'), `voici${NBSP}: ici`);
  assert.equal(fr.normalize('quoi ?'), `quoi${NNBSP}?`);
  assert.equal(fr.normalize('ah ! oui ; bon'), `ah${NNBSP}! oui${NNBSP}; bon`);
  // Nothing is inserted, so a URL and a code literal are untouched.
  assert.equal(fr.normalize('https://example.com'), 'https://example.com');
  assert.equal(fr.normalize('Bonjour!'), 'Bonjour!');
});

test('the colon takes the full no-break space, and it is the only fixed width', () => {
  // Nothing is in dispute before a colon: the Lexique specifies the word space
  // and both published corpora use it 2,458 times with no counter-example.
  assert.equal(fr.normalize('a : b'), `a${NBSP}: b`);
  // Absent any other evidence the rest default to the narrow one, which is what
  // the Lexique sets its own pages in.
  assert.equal(fr.normalize('a ; b'), `a${NNBSP}; b`);
});

test('guillemets are the one inserting rule', () => {
  assert.equal(fr.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize('« mot »'), `«${NNBSP}mot${NNBSP}»`);
  // Already correct: unchanged, and no finding.
  const correct = `«${NNBSP}mot${NNBSP}»`;
  assert.equal(fr.normalize(correct), correct);
  assert.ok(!ids(correct).includes('fr.guillemet-open'));
});

test('U+00A0 inside a guillemet is accepted, not retyped', () => {
  // The finding that moved this pack from 0.1.0 to 0.2.0. Over 2.4M characters
  // of typeset French the previous rules rewrote 6,462 guillemets like this one,
  // every one of which was already right by the reading its own publisher
  // follows. The citation does not fix a width, so neither does this pack.
  const nbspStyle = `«${NBSP}mot${NBSP}»`;
  assert.equal(fr.normalize(nbspStyle), nbspStyle);
  assert.deepEqual(
    ids(nbspStyle).filter((r) => r.startsWith('fr.guillemet')),
    [],
  );
});

test('spacing that is wrong under both readings is still repaired', () => {
  // A breaking space, a thin space (right width, wrong behaviour) and no space
  // at all are defects whichever convention a document follows.
  assert.equal(fr.normalize('« mot »'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize(`«${THINSP}mot${THINSP}»`), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  // A doubled space is a defect in its own right, and it is still evidence of
  // which width the document is set in, so the repair keeps that width rather
  // than falling back to the default.
  assert.equal(fr.normalize(`«${NBSP}${NBSP}mot»`), `«${NBSP}mot${NBSP}»`);
});

test('a repair adopts the width the document already uses', () => {
  // The consistency stance, and the reason `conformRule` exists. The same defect
  // is repaired two different ways because the surrounding text differs.
  const nbspDoc = `«${NBSP}un${NBSP}» et «deux»`;
  assert.equal(fr.normalize(nbspDoc), `«${NBSP}un${NBSP}» et «${NBSP}deux${NBSP}»`);

  const nnbspDoc = `«${NNBSP}un${NNBSP}» et «deux»`;
  assert.equal(fr.normalize(nnbspDoc), `«${NNBSP}un${NNBSP}» et «${NNBSP}deux${NNBSP}»`);

  // And it holds for the high punctuation, which votes in the same ballot.
  assert.equal(fr.normalize(`«${NBSP}un${NBSP}» quoi ?`), `«${NBSP}un${NBSP}» quoi${NBSP}?`);
});

test('mixing the two widths is reported and never repaired', () => {
  // Neither width is a defect and using both is. Reported rather than fixed
  // because which one to settle on is the author's call, and on a near-even
  // split harmonising would silently retype half the document.
  const mixed = `«${NBSP}un${NBSP}» et «${NNBSP}deux${NNBSP}» et «${NBSP}trois${NBSP}»`;
  const found = check(fr, mixed).filter((f) => f.rule === 'fr.mixed-no-break-space');
  assert.equal(found.length, 2, 'both minority occurrences are reported');
  assert.equal(found[0]!.severity, 'warning');
  assert.equal(found[0]!.fixable, false);
  // The minority is what gets reported, not the house width.
  for (const f of found) assert.equal(mixed[f.index], NNBSP);
  assert.equal(fr.normalize(mixed), mixed);
});

test('a document using one width consistently reports no mixing', () => {
  for (const text of [
    `«${NBSP}un${NBSP}» et «${NBSP}deux${NBSP}» ; voici`,
    `«${NNBSP}un${NNBSP}» et «${NNBSP}deux${NNBSP}» ; voici`,
    'aucune ponctuation francaise ici',
  ]) {
    assert.deepEqual(
      ids(text).filter((r) => r === 'fr.mixed-no-break-space'),
      [],
      `fired on ${JSON.stringify(text)}`,
    );
  }
});

test('a missing space before punctuation is reported and not repaired', () => {
  // The French half of the finding this package is built around.
  assert.ok(ids('Bonjour! Ca va?').includes('fr.missing-space-before-high-punctuation'));
  assert.equal(fr.normalize('Bonjour!'), 'Bonjour!');
});

test('the missing-space rule stays off code and URLs', () => {
  for (const text of [
    'https://example.com/a?b=1',
    'C:\\Windows',
    'use !important here',
    'query ?utf8=x',
    'a ? b : c',
    'de 12:30 a 14:00',
  ]) {
    assert.ok(
      !ids(text).includes('fr.missing-space-before-high-punctuation'),
      `fired on ${JSON.stringify(text)}`,
    );
  }
});

test('a straight double quote is a warning, not an error', () => {
  const found = check(fr, 'il a dit "bonjour"');
  const quote = found.find((f) => f.rule === 'fr.straight-double-quote');
  assert.ok(quote);
  assert.equal(quote.severity, 'warning');
  assert.equal(quote.fixable, false);
});

test('the pack stamps an era', () => {
  // 0.2.0 because the guillemet rules changed what they rewrite. A corpus
  // normalized under 0.1.0 had the inside of every quotation retyped and one
  // under 0.2.0 did not, so the stamp has to tell them apart.
  assert.equal(fr.id, 'fr@0.2.0');
  assert.equal(fr.lang, 'fr');
});
