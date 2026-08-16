// Invariants that hold for every pack. These are the claims the comments in
// `src/` make, asserted rather than asserted-in-prose, and they are the tests
// that will catch a fifth language getting one of them wrong.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check, fix, packFor, packs } from '../src/check.ts';
import type { TypographyPack } from '../src/pack.ts';

/** Text designed to be hostile to every pack at once: code, URLs, both
 * guillemet conventions, both apostrophes, all three spaces, and prose in each
 * language. Every invariant below runs over all of it. */
const HOSTILE: readonly string[] = [
  '',
  ' ',
  'Plain ASCII with nothing interesting in it.',
  "L'apostrophe et l'accent : voici « une citation » ; puis un point !",
  'Voir https://example.com/a?b=1 et C:\\Windows\\System32 pour la suite.',
  'const x = a ? b : c; // a ternary inside prose',
  '¿Como estas? ¡Claro! Pero: como estas?',
  'Dijo « hola » y despues « adios ».',
  'Er sagte »Wort« und sie sagte „Wort“.',
  'Er sagte « Wort » wie in der Schweiz.',
  'Sie sagte «Wort» und ging.',
  'Il a dit «Bonjour» sans espaces.',
  'Mixed \u00a0 no-break \u202f narrow \u2019 curly \u0027 straight.',
  '«»„“‚‘¿¡;:!?',
  'A line\nwith a break\r\nand a CRLF one.',
  '"straight double quotes" everywhere',
  'Zahlen 12:30 und 1 : 2 und Port 8080:80',
];

function everyPack(fn: (pack: TypographyPack) => void): void {
  for (const pack of packs) fn(pack);
}

test('a rule without a citation does not ship', () => {
  everyPack((pack) => {
    for (const rule of pack.rules) {
      assert.ok(rule.cite.length > 10, `${rule.id} has no usable citation`);
      assert.ok(rule.summary.length > 10, `${rule.id} has no usable summary`);
      // Ids are global and name the position rather than the verdict, so they
      // carry no language and collide across styles on purpose. What this
      // asserts is the shape, which is the thing a reintroduced `fr.` prefix
      // would break: one lowercase kebab token, no dot, no tag.
      assert.match(rule.id, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, `${rule.id} is not a global id`);
    }
  });
});

test('rules sharing an id are about the same position', () => {
  // The invariant a global id buys, and the one nothing else here checks. Two
  // styles may answer `guillemet-open-space` in opposite directions, which is
  // the point, but they must not be answering two different questions under one
  // name. A summary is the closest thing to the question in machine-readable
  // form, so this holds the weaker property that is still worth having: a shared
  // id means a shared citation topic is *not* asserted, but a shared id with
  // wildly unrelated summaries is a naming mistake nobody would otherwise see.
  const byId = new Map<string, Set<string>>();
  everyPack((pack) => {
    for (const rule of pack.rules) {
      const seen = byId.get(rule.id) ?? new Set<string>();
      seen.add(rule.summary);
      byId.set(rule.id, seen);
    }
  });
  for (const [id, summaries] of byId) {
    // Every summary for one id has to share a word with every other. Opposite
    // verdicts about one position always do, because they name the position:
    // `Space after an opening guillemet` and `Opening guillemet whose inner
    // space is breaking` share `guillemet`. Two unrelated rules filed under one
    // id would not.
    const words = [...summaries].map((s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []));
    for (const a of words)
      for (const b of words)
        assert.ok(
          [...a].some((w) => b.has(w)),
          `${id} covers summaries with nothing in common, so it names two positions`,
        );
  }
});

test('rule ids are unique within a pack', () => {
  everyPack((pack) => {
    const ids = pack.rules.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `${pack.id} has duplicate rule ids`);
  });
});

test('normalize is idempotent', () => {
  // A backfill that does not converge rewrites the same corpus forever and each
  // pass looks like progress. This is the one property whose absence is
  // invisible in a single run.
  everyPack((pack) => {
    for (const text of HOSTILE) {
      const once = pack.normalize(text);
      assert.equal(
        pack.normalize(once),
        once,
        `${pack.id} is not idempotent on ${JSON.stringify(text)}`,
      );
    }
  });
});

test('every individual fix is idempotent', () => {
  // Composition can hide a non-idempotent rule when a later rule happens to
  // normalise its output, so each is checked alone.
  everyPack((pack) => {
    for (const rule of pack.rules) {
      if (!rule.fix) continue;
      for (const text of HOSTILE) {
        const once = rule.fix(text);
        assert.equal(
          rule.fix(once),
          once,
          `${rule.id} is not idempotent on ${JSON.stringify(text)}`,
        );
      }
    }
  });
});

test('a fixable rule changes the text exactly when it reports a finding', () => {
  // The property the single-pattern rule constructor exists to buy. If `find`
  // and `fix` were written separately this is where they would be caught
  // drifting; because they are not, this test is the proof that they cannot.
  everyPack((pack) => {
    for (const rule of pack.rules) {
      const apply = rule.fix;
      if (!apply) continue;
      for (const text of HOSTILE) {
        const reported = rule.find(text).length > 0;
        const rewrote: boolean = apply(text) !== text;
        assert.equal(
          reported,
          rewrote,
          `${rule.id} disagrees with itself on ${JSON.stringify(text)}`,
        );
      }
    }
  });
});

test('check reports nothing fixable once normalize has run', () => {
  // `fix` is a subset of `check`, so a normalized value must have no fixable
  // findings left. Anything still reported is check-only by construction, which
  // is the asymmetry stated as a test.
  everyPack((pack) => {
    for (const text of HOSTILE) {
      const clean = pack.normalize(text);
      const left = check(pack, clean).filter((f) => f.fixable);
      assert.deepEqual(left, [], `${pack.id} still reports fixable findings after normalize`);
    }
  });
});

test('findings are ordered by position in the text', () => {
  everyPack((pack) => {
    for (const text of HOSTILE) {
      const found = check(pack, text);
      const offsets = found.map((f) => f.index);
      assert.deepEqual(
        offsets,
        [...offsets].sort((a, b) => a - b),
      );
    }
  });
});

test('a finding never quotes raw invisible characters', () => {
  // A report that printed the raw slice would show a reader two
  // identical-looking strings, and it would look completely fine.
  everyPack((pack) => {
    for (const text of HOSTILE) {
      for (const f of check(pack, text)) {
        assert.ok(!f.excerpt.includes('\u00a0'), `${f.rule} leaked a raw NBSP`);
        assert.ok(!f.excerpt.includes('\u202f'), `${f.rule} leaked a raw NNBSP`);
      }
    }
  });
});

test('line and column locate the finding', () => {
  const text = 'ligne une\nvoici une erreur : ici\nligne trois';
  const found = check(packFor('fr')!, text);
  assert.ok(found.length > 0);
  const first = found[0]!;
  assert.equal(first.line, 2);
  const lines = text.split('\n');
  assert.equal(text[first.index], lines[first.line - 1]![first.column - 1]);
});

test('a pack satisfies the harness protocol structurally', () => {
  // `translation-harness` binds `{ id, normalize }` through `job.normalize`.
  // Neither package imports the other and there is no registration call, so this
  // is the only thing holding the two shapes together.
  const bind = (pack: { readonly id: string; readonly normalize: (v: string) => string }) =>
    `${pack.id}:${pack.normalize("l'ete")}`;
  everyPack((pack) => {
    assert.match(bind(pack), /@\d+\.\d+\.\d+:/);
  });
});

test('pack ids name a version, and there is no bare de', () => {
  everyPack((pack) => {
    assert.match(pack.id, new RegExp(`^${pack.lang}@\\d+\\.\\d+\\.\\d+$`));
  });
  assert.equal(packFor('de'), undefined);
  assert.ok(packFor('de-DE'));
  assert.ok(packFor('de-CH'));
});

test('a region never silently falls back to another region', () => {
  // `de-AT` follows the German convention, and this package still refuses to
  // answer for it. A host that wants the substitution makes it in its own
  // dispatch, where somebody can see it.
  assert.equal(packFor('de-AT'), undefined);
  assert.equal(packFor('fr-CA'), undefined);
  assert.equal(packFor('es-MX'), undefined);
});

test('packFor is case-insensitive on the tag', () => {
  assert.equal(packFor('DE-ch'), packFor('de-CH'));
});

test('fix is exactly normalize', () => {
  everyPack((pack) => {
    for (const text of HOSTILE) assert.equal(fix(pack, text), pack.normalize(text));
  });
});
