// German, both regions. The interesting half of this file is the pair of tests
// at the bottom: the same two characters, set opposite ways, and each pack has
// to leave the other's convention alone rather than silently converting it.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { deCH } from '../src/de-CH.ts';
import { deDE } from '../src/de-DE.ts';

const RSQUO = '’';
const idsDE = (text: string) => check(deDE, text).map((f) => f.rule);
const idsCH = (text: string) => check(deCH, text).map((f) => f.rule);

test('the apostrophe rule is shared and needs a letter on both sides', () => {
  assert.equal(deDE.normalize("geht's"), `geht${RSQUO}s`);
  assert.equal(deCH.normalize("geht's"), `geht${RSQUO}s`);
  assert.equal(deDE.normalize("x['key']"), "x['key']");
});

test('German quotation marks are set closed up', () => {
  assert.equal(deDE.normalize('» Wort «'), '»Wort«');
  assert.equal(deDE.normalize('„ Wort'), '„Wort');
  assert.equal(deCH.normalize('« Wort »'), '«Wort»');
});

test('the closing low-quote counterpart deliberately does not exist', () => {
  // U+201C opens a quotation in English, and German technical prose quotes
  // English constantly. Deleting the space before it would weld `said "hello"`
  // together.
  assert.equal(deDE.normalize('er sagte "hello"'), 'er sagte "hello"');
  assert.equal(deDE.normalize('er sagte “hello”'), 'er sagte “hello”');
});

test('de-DE reports Swiss guillemets and does not rewrite them', () => {
  assert.ok(idsDE('Sie sagte «Wort» und ging.').includes('de-DE.outward-guillemets'));
  assert.equal(deDE.normalize('Sie sagte «Wort» und ging.'), 'Sie sagte «Wort» und ging.');
});

test('de-CH reports German guillemets and does not rewrite them', () => {
  assert.ok(idsCH('Sie sagte »Wort« und ging.').includes('de-CH.inward-guillemets'));
  assert.equal(deCH.normalize('Sie sagte »Wort« und ging.'), 'Sie sagte »Wort« und ging.');
});

test('neither pack welds a word onto the other region s quotation mark', () => {
  // The guard that makes the two packs safe to run over mixed text. Without the
  // lookaround, de-DE reads the closing `»` of a Swiss quotation as an opening
  // mark and deletes the space after it.
  assert.equal(deDE.normalize('Sie sagte «Wort» und ging.'), 'Sie sagte «Wort» und ging.');
  assert.equal(deCH.normalize('Sie sagte »Wort« und ging.'), 'Sie sagte »Wort« und ging.');
});

test('a space before punctuation is reported in both and fixed in neither', () => {
  assert.ok(idsDE('Hallo ; Welt').includes('de.space-before-punctuation'));
  assert.equal(deDE.normalize('Hallo ; Welt'), 'Hallo ; Welt');
  assert.equal(deCH.normalize('const y = a ? b : c;'), 'const y = a ? b : c;');
});

test('the two packs stamp two different eras', () => {
  assert.equal(deDE.id, 'de-DE@0.1.0');
  assert.equal(deCH.id, 'de-CH@0.1.0');
  assert.notEqual(deDE.id, deCH.id);
});
