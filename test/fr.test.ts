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

test('the colon takes the full no-break space and the rest take the narrow one', () => {
  // Imprimerie nationale distinguishes them; Unicode encodes them separately.
  // Using one for both would be wrong in a way no reader could see.
  assert.equal(fr.normalize('a : b'), `a${NBSP}: b`);
  assert.equal(fr.normalize('a ; b'), `a${NNBSP}; b`);
});

test('guillemets are the one inserting rule', () => {
  assert.equal(fr.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize('« mot »'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize(`«${NBSP}mot${NBSP}»`), `«${NNBSP}mot${NNBSP}»`);
  // Already correct: unchanged, and no finding.
  const correct = `«${NNBSP}mot${NNBSP}»`;
  assert.equal(fr.normalize(correct), correct);
  assert.ok(!ids(correct).includes('fr.guillemet-open'));
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
  assert.equal(fr.id, 'fr@0.1.0');
  assert.equal(fr.lang, 'fr');
});
