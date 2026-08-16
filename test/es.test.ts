// Spanish. The unpaired opening mark is the rule the whole package's shape came
// from, so most of this file is about the ways it must *not* fire.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { es } from '../src/es.ts';

const ids = (text: string) => check(es, text).map((f) => f.rule);

test('a question with no opening mark is reported', () => {
  assert.ok(ids('Como estas?').includes('unpaired-question'));
  assert.ok(ids('Hola. Que tal?').includes('unpaired-question'));
  assert.ok(ids('Increible!').includes('unpaired-exclamation'));
});

test('a correctly paired sentence is silent', () => {
  assert.equal(ids('¿Como estas?').includes('unpaired-question'), false);
  assert.equal(ids('¡Increible!').includes('unpaired-exclamation'), false);
  // The mark opens the clause rather than the sentence, which is exactly why
  // nothing here tries to insert it.
  assert.equal(ids('Si vienes, ¿me avisas?').includes('unpaired-question'), false);
});

test('the pairing scan does not cross a sentence boundary', () => {
  // The `¿` belongs to the first sentence and must not excuse the second.
  assert.ok(ids('¿Vienes? Y tu hermano?').includes('unpaired-question'));
});

test('it stays off URLs, queries and templates', () => {
  for (const text of [
    'https://example.com/a?b=1',
    'Ver /docs/es?lang=es para mas.',
    'El operador a ? b : c en el código.',
    'const v = a ?? b;',
  ]) {
    assert.ok(!ids(text).includes('unpaired-question'), `fired on ${JSON.stringify(text)}`);
  }
});

test('doubling the closing mark does not excuse the missing opening one', () => {
  // `Que??` was written into the exclusion list above on the theory that
  // repeated punctuation is a placeholder. It is not: it is a Spanish question
  // with no `¿`, and the rule was right. Kept as a test so the exclusion is not
  // widened back later.
  assert.ok(ids('Que??').includes('unpaired-question'));
});

test('and it is never fixable', () => {
  const found = check(es, 'Como estas?');
  const unpaired = found.find((f) => f.rule === 'unpaired-question');
  assert.ok(unpaired);
  assert.equal(unpaired.fixable, false);
  // Nothing was inserted. Knowing the mark is missing is not knowing where it
  // goes.
  assert.equal(es.normalize('Como estas?'), 'Como estas?');
});

test('guillemets are closed up, the opposite of French', () => {
  assert.equal(es.normalize('« hola »'), '«hola»');
  assert.equal(es.normalize('«hola»'), '«hola»');
  assert.equal(es.normalize('« hola »'), '«hola»');
});

test('a space after an opening mark is fixable; a space before punctuation is not', () => {
  assert.equal(es.normalize('¿ Como estas?'), '¿Como estas?');
  // Deleting this space looks trivially safe and would corrupt a ternary in a
  // fenced code block, so it is reported instead.
  assert.ok(ids('hola ; adios').includes('punctuation-spacing'));
  assert.equal(es.normalize('hola ; adios'), 'hola ; adios');
  assert.equal(es.normalize('const y = a ? b : c;'), 'const y = a ? b : c;');
});

test('a German quotation inside Spanish text keeps its spaces', () => {
  // Under `es@0.1.0` this returned `Er sagte»Wort«und ging.` and welded two
  // pairs of words. `«` opens a quotation in Spanish and closes one in Germany,
  // and the guillemet rules read the German marks as Spanish ones. Both German
  // packs had the guard from the start; this rule shipped without it.
  assert.equal(es.normalize('Er sagte »Wort« und ging.'), 'Er sagte »Wort« und ging.');
  // Each half of the defect on its own, so a regression in one guard cannot
  // hide behind the other.
  assert.equal(es.normalize('»Wort« und'), '»Wort« und');
  assert.equal(es.normalize('Er sagte »Wort«'), 'Er sagte »Wort«');
});

test('the guard does not cost the Spanish rule anything', () => {
  // Everything the rule is actually for still fixes. The guard only declines a
  // guillemet with a word character on the side a Spanish one never has one.
  assert.equal(es.normalize('dijo: « hola »'), 'dijo: «hola»');
  assert.equal(es.normalize('« hola », dijo.'), '«hola», dijo.');
  assert.equal(es.normalize('(« hola »)'), '(«hola»)');
});

test('the pack stamps an era', () => {
  assert.equal(es.id, 'es@0.2.0');
});
