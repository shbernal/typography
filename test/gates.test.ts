// `gates/corpora.json` is the manifest and the prose is a description of it, so
// the prose can drift and nothing notices. It did: four documents said four of
// the six corpora were rebuildable while the manifest said five, and the table
// directly under one of those sentences listed five `yes` rows. A count written
// by hand in five places has five chances to be wrong.
//
// The split those tests guarded is gone: every corpus is rebuildable now. What
// replaced it is a check that this stays true, so the flat claim in four
// documents cannot quietly acquire an exception.
//
// So the count is derived here instead. This is the same move `skill.test.ts`
// makes for SKILL.md: prose that makes a checkable claim about committed data
// gets executed rather than proofread.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface CorpusSpec {
  id: string;
  lang: string;
  exposes?: string[];
  fetch?: { urls: string };
}

const corpora = (
  JSON.parse(readFileSync(join(ROOT, 'gates', 'corpora.json'), 'utf8')) as {
    corpora: CorpusSpec[];
  }
).corpora;

const TOTAL = corpora.length;

const NUMBER = new Map(
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].map(
    (word, value) => [word, value],
  ),
);

/** Every document that states how many corpora there are. `docs/` joined this
 * list when the README stopped carrying the detail: the claim moved, and a
 * check that kept watching only the old locations would have gone quiet rather
 * than gone red. */
const DOCS = [
  'README.md',
  'AGENTS.md',
  'CHANGELOG.md',
  join('gates', 'README.md'),
  join('docs', 'evidence.md'),
  join('docs', 'development.md'),
];

test('the corpus table in gates/README.md lists every corpus and no others', () => {
  const gates = readFileSync(join(ROOT, 'gates', 'README.md'), 'utf8');
  // The corpus table's shape specifically: a backticked corpus id, then a
  // backticked language tag on its own. The language-pairs table further up puts
  // the tag first and follows the id with a colon, so it does not match here.
  const rows = new Set(
    [...gates.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*`([a-zA-Z-]+)`\s*\|/gm)].map((m) => m[1]!),
  );

  for (const spec of corpora)
    assert.ok(rows.has(spec.id), `gates/README.md has no table row for ${spec.id}`);
  for (const id of rows)
    assert.ok(
      corpora.some((c) => c.id === id),
      `gates/README.md has a table row for ${id}, which corpora.json does not define`,
    );
});

test('every corpus is rebuildable, which is what the docs claim', () => {
  // The claim is stated flatly wherever it appears, now that there is no
  // exception to qualify it. If a corpus without a frozen URL list is ever added, this
  // fails and the sentences have to be rewritten rather than quietly becoming
  // untrue, which is exactly how the last count went wrong.
  for (const spec of corpora)
    assert.ok(
      spec.fetch,
      `${spec.id} has no fetch block, so "every corpus is rebuildable" is no longer true`,
    );
});

test('every "N of the M" in the docs is a count corpora.json agrees with', () => {
  // A denominator that is not the corpus count is the drift this test exists
  // for: four documents once said four of the six corpora were rebuildable while
  // the manifest said five. Only the denominator is checkable in general, since
  // a numerator can legitimately count something else.
  const pattern = /\b(\w+) of the (\w+) corpora\b/gi;
  let seen = 0;

  for (const doc of DOCS) {
    const body = readFileSync(join(ROOT, doc), 'utf8');
    for (const match of body.matchAll(pattern)) {
      const denominator = NUMBER.get(match[2]!.toLowerCase());
      if (denominator === undefined) continue;
      seen += 1;
      assert.equal(denominator, TOTAL, `${doc} says "${match[0]}" and there are ${TOTAL} corpora`);
    }
  }
  assert.equal(seen, 0, `expected no "N of the M corpora" phrasing to survive, found ${seen}`);
});

test('the corpus count is stated in the docs and is right', () => {
  // The replacement for the split: the docs say how many corpora there are, and
  // the number is derived from the manifest rather than counted by hand.
  const word = [...NUMBER].find(([, value]) => value === TOTAL)?.[0];
  assert.ok(word, `no number word for ${TOTAL} corpora`);
  let seen = 0;
  for (const doc of DOCS) {
    const body = readFileSync(join(ROOT, doc), 'utf8');
    if (new RegExp(`\\b(${word}|${TOTAL}) corpora\\b`, 'i').test(body)) seen += 1;
  }
  assert.ok(
    seen >= 3,
    `expected "${word} corpora" in at least 3 of ${DOCS.length} docs, found ${seen}`,
  );
});

test('every frozen URL list a corpus names is committed', () => {
  // A corpus claiming to be rebuildable from a list that is not in the repo is
  // the dangling reference this whole arrangement exists to avoid.
  for (const spec of corpora) {
    assert.ok(
      spec.fetch && existsSync(join(ROOT, spec.fetch.urls)),
      `${spec.id} fetches from ${spec.fetch?.urls}, which is not committed`,
    );
  }
});

test('every corpus declares what it exposes the rules to', () => {
  // Zero findings over text containing nothing a rule could match is a vacuous
  // pass. A corpus that declares nothing cannot fail that way visibly.
  for (const spec of corpora)
    assert.ok(
      spec.exposes && spec.exposes.length > 0,
      `${spec.id} declares no exposure, so a zero from it would be unreadable`,
    );
});
