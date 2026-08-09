// Spanish. The unpaired opening mark is the rule the whole package's shape came
// from, so most of this file is about the ways it must *not* fire.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { es } from '../src/es.ts';

const ids = (text: string) => check(es, text).map((f) => f.rule);

test('a question with no opening mark is reported', () => {
  assert.ok(ids('Como estas?').includes('es.unpaired-question'));
  assert.ok(ids('Hola. Que tal?').includes('es.unpaired-question'));
  assert.ok(ids('Increible!').includes('es.unpaired-exclamation'));
});

test('a correctly paired sentence is silent', () => {
  assert.equal(ids('¿Como estas?').includes('es.unpaired-question'), false);
  assert.equal(ids('¡Increible!').includes('es.unpaired-exclamation'), false);
  // The mark opens the clause rather than the sentence, which is exactly why
  // nothing here tries to insert it.
  assert.equal(ids('Si vienes, ¿me avisas?').includes('es.unpaired-question'), false);
});

test('the pairing scan does not cross a sentence boundary', () => {
  // The `¿` belongs to the first sentence and must not excuse the second.
  assert.ok(ids('¿Vienes? Y tu hermano?').includes('es.unpaired-question'));
});

test('it stays off URLs, queries and templates', () => {
  for (const text of [
    'https://example.com/a?b=1',
    'Ver /docs/es?lang=es para mas.',
    'El operador a ? b : c en el codigo.',
    'const v = a ?? b;',
  ]) {
    assert.ok(!ids(text).includes('es.unpaired-question'), `fired on ${JSON.stringify(text)}`);
  }
});

test('doubling the closing mark does not excuse the missing opening one', () => {
  // `Que??` was written into the exclusion list above on the theory that
  // repeated punctuation is a placeholder. It is not: it is a Spanish question
  // with no `¿`, and the rule was right. Kept as a test so the exclusion is not
  // widened back later.
  assert.ok(ids('Que??').includes('es.unpaired-question'));
});

test('and it is never fixable', () => {
  const found = check(es, 'Como estas?');
  const unpaired = found.find((f) => f.rule === 'es.unpaired-question');
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
  assert.ok(ids('hola ; adios').includes('es.space-before-punctuation'));
  assert.equal(es.normalize('hola ; adios'), 'hola ; adios');
  assert.equal(es.normalize('const y = a ? b : c;'), 'const y = a ? b : c;');
});

test('the pack stamps an era', () => {
  assert.equal(es.id, 'es@0.1.0');
});
