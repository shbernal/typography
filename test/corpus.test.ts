// `gates/corpora.json` carries two regular expressions per corpus that decide
// what the findings gate is actually measuring: `region` says where the article
// is on the page, and `drop` says which parts of it the publisher's template
// wrote rather than an author. Both are patterns against somebody else's markup,
// so both can stop matching without anybody touching this repository.
//
// `region` failing is already loud: the extraction comes back empty and
// `fetch-corpus.ts` counts it and exits non-zero. `drop` failing is quieter in
// one direction and dangerous in the other. Matching nothing means the dropped
// blocks return, the fingerprint moves and the gate fails, which is fine. Matching
// too much means the corpus quietly loses text, and a corpus of professionally
// typeset prose stops being evidence the moment something is choosing which
// sentences it contains.
//
// So the pattern that ships is exercised here against the markup it was written
// for, rather than by a rebuild that asks a publisher for 43 documents to find
// out. The fixture is verbatim from theconversation.com: two paragraphs of the
// article with one of its inline callouts between them, and the `<hr>`-fenced
// summary box that the callout pattern must not touch.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { toText } from '../scripts/fetch-corpus.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface CorpusSpec {
  id: string;
  fetch?: { region?: string; drop?: string };
}

const corpora = (
  JSON.parse(readFileSync(join(ROOT, 'gates', 'corpora.json'), 'utf8')) as {
    corpora: CorpusSpec[];
  }
).corpora;

function dropFor(id: string): RegExp {
  const spec = corpora.find((c) => c.id === id);
  assert.ok(spec?.fetch?.drop, `corpora.json declares no drop for ${id}`);
  return new RegExp(spec.fetch.drop, 'g');
}

// Verbatim from https://theconversation.com/ce-que-les-sciences-sociales-doivent-a-edgar-morin-289070,
// with the article body shortened. The indentation inside the callout is the
// publisher's.
const ARTICLE = `<hr>

<p><strong>L’ESSENTIEL</strong>.</p>

<ul>
<li><p>Edgar Morin est décédé en mai dernier à l’âge de 104 ans.</p></li>
</ul>

<hr>

<p>Il a toujours refusé de s’enfermer dans une discipline.</p>

<hr>
<p>
  <em>
    <strong>
      À lire aussi :
      <a href="https://theconversation.com/entretien-avec-edgar-morin-93045">Entretien avec Edgar Morin : « Mai 68 »</a>
    </strong>
  </em>
</p>
<hr>


<p>Ce refus des cadres établis plonge ses racines dans une histoire personnelle.</p>`;

test('the theconversation-fr drop removes the callout and nothing else', () => {
  const drop = dropFor('theconversation-fr');
  const before = toText(ARTICLE);
  const after = toText(ARTICLE, undefined, drop);

  assert.match(before, /À lire aussi :/, 'the fixture is supposed to contain a callout');
  assert.doesNotMatch(after, /À lire aussi/, 'the callout survived the drop');
  assert.doesNotMatch(
    after,
    /Entretien avec Edgar Morin/,
    'the callout headline survived the drop',
  );

  // The summary box is fenced by `<hr>` exactly as the callout is, and is
  // editorial content. A pattern keyed on the fence alone would take it.
  assert.match(after, /L’ESSENTIEL/, 'the drop reached past the callout into the summary box');
  assert.match(after, /Edgar Morin est décédé en mai dernier/);
  assert.match(after, /Il a toujours refusé de s’enfermer dans une discipline\./);
  assert.match(after, /Ce refus des cadres établis/);
});

test('the theconversation-fr drop does not weld the paragraphs it sat between', () => {
  const after = toText(ARTICLE, undefined, dropFor('theconversation-fr'));
  const lines = after.split('\n');

  // Splicing the two sides together would put the sentence before the callout
  // and the sentence after it on one line, which is how a corpus reader
  // manufactures a finding nobody wrote.
  assert.ok(
    lines.includes('Il a toujours refusé de s’enfermer dans une discipline.'),
    `the paragraph before the callout did not survive intact: ${JSON.stringify(lines)}`,
  );
  assert.ok(
    lines.includes('Ce refus des cadres établis plonge ses racines dans une histoire personnelle.'),
    `the paragraph after the callout did not survive intact: ${JSON.stringify(lines)}`,
  );
});

test('the theconversation-fr drop matches once per callout', () => {
  const drop = dropFor('theconversation-fr');
  const twice = `${ARTICLE}\n${ARTICLE}`;

  assert.equal((ARTICLE.match(drop) ?? []).length, 1);
  assert.equal((twice.match(new RegExp(drop.source, 'g')) ?? []).length, 2);
});

test('every declared drop compiles and matches something rather than nothing', () => {
  for (const spec of corpora) {
    const pattern = spec.fetch?.drop;
    if (!pattern) continue;

    let compiled: RegExp;
    try {
      compiled = new RegExp(pattern, 'g');
    } catch (error) {
      assert.fail(
        `${spec.id}: drop is not a valid regular expression: ${(error as Error).message}`,
      );
    }

    // A pattern that can match the empty string would splice a newline between
    // every pair of characters in the corpus, which is a rebuild that destroys
    // the text rather than trimming it.
    assert.ok(!compiled.test(''), `${spec.id}: drop matches the empty string`);
  }
});
