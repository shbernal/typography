// Invariants that hold for every shipped style. These are the claims the
// comments in `src/` make, asserted rather than asserted-in-prose, and they are
// the tests that will catch a sixth style getting one of them wrong.
//
// The properties that hold for *any* style, including one a user composed, are
// in `compose.test.ts`. The split is the point: this file is about the five
// bundles this package ships, and that file is about what `compose` promises to
// somebody assembling their own.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check, fix, styleFor, styles } from '../src/check.ts';
import type { Style } from '../src/pack.ts';

/** Text designed to be hostile to every style at once: code, URLs, both
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

function everyStyle(fn: (style: Style) => void): void {
  for (const style of styles) fn(style);
}

test('a rule without a citation does not ship', () => {
  everyStyle((style) => {
    for (const rule of style.rules) {
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
  everyStyle((style) => {
    for (const rule of style.rules) {
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

test('rule ids are unique within a style', () => {
  // `compose` refuses to build a style with two rules under one id, so this
  // holds by construction now and is kept because it says what the constructor
  // is for: a duplicate id is invisible in a report, where the two print as one
  // rule disagreeing with itself.
  everyStyle((style) => {
    const ids = style.rules.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length, `${style.id} has duplicate rule ids`);
  });
});

test('normalize is idempotent', () => {
  // A backfill that does not converge rewrites the same corpus forever and each
  // pass looks like progress. This is the one property whose absence is
  // invisible in a single run.
  everyStyle((style) => {
    for (const text of HOSTILE) {
      const once = style.normalize(text);
      assert.equal(
        style.normalize(once),
        once,
        `${style.id} is not idempotent on ${JSON.stringify(text)}`,
      );
    }
  });
});

test('every individual fix is idempotent', () => {
  // Composition can hide a non-idempotent rule when a later rule happens to
  // normalise its output, so each is checked alone.
  everyStyle((style) => {
    for (const rule of style.rules) {
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
  everyStyle((style) => {
    for (const rule of style.rules) {
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
  everyStyle((style) => {
    for (const text of HOSTILE) {
      const clean = style.normalize(text);
      const left = check(style, clean).filter((f) => f.fixable);
      assert.deepEqual(left, [], `${style.id} still reports fixable findings after normalize`);
    }
  });
});

test('findings are ordered by position in the text', () => {
  everyStyle((style) => {
    for (const text of HOSTILE) {
      const found = check(style, text);
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
  everyStyle((style) => {
    for (const text of HOSTILE) {
      for (const f of check(style, text)) {
        assert.ok(!f.excerpt.includes('\u00a0'), `${f.rule} leaked a raw NBSP`);
        assert.ok(!f.excerpt.includes('\u202f'), `${f.rule} leaked a raw NNBSP`);
      }
    }
  });
});

test('line and column locate the finding', () => {
  const text = 'ligne une\nvoici une erreur : ici\nligne trois';
  const found = check(styleFor('fr')!, text);
  assert.ok(found.length > 0);
  const first = found[0]!;
  assert.equal(first.line, 2);
  const lines = text.split('\n');
  assert.equal(text[first.index], lines[first.line - 1]![first.column - 1]);
});

test('a style satisfies the harness protocol structurally', () => {
  // `translation-harness` binds `{ id, normalize }` through `job.normalize`.
  // Neither package imports the other and there is no registration call, so this
  // is the only thing holding the two shapes together.
  const bind = (style: { readonly id: string; readonly normalize: (v: string) => string }) =>
    `${style.id}:${style.normalize("l'ete")}`;
  everyStyle((style) => {
    assert.match(bind(style), /@[0-9a-f]{12}:/);
  });
});

test('a shipped style is named for its tag and stamped by its rules', () => {
  // Two halves, and the second is the one that changed when versions stopped
  // being written down. The name is the language tag, so a report header still
  // reads as a language; the stamp is derived, so it moves when a rule moves and
  // at no other time, and nobody has to remember to move it.
  everyStyle((style) => {
    assert.equal(style.name, style.lang);
    assert.equal(style.id, `${style.name}@${style.stamp}`);
    assert.match(style.stamp, /^[0-9a-f]{12}$/);
  });
  // And no two of them are the same set of rules under two names, which a
  // shared stamp would say outright.
  assert.equal(new Set(styles.map((style) => style.stamp)).size, styles.length);
});

test('there is no bare de', () => {
  assert.equal(styleFor('de'), undefined);
  assert.ok(styleFor('de-DE'));
  assert.ok(styleFor('de-CH'));
});

test('a region never silently falls back to another region', () => {
  // `de-AT` follows the German convention, and this package still refuses to
  // answer for it. A host that wants the substitution makes it in its own
  // dispatch, where somebody can see it.
  assert.equal(styleFor('de-AT'), undefined);
  assert.equal(styleFor('fr-CA'), undefined);
  assert.equal(styleFor('es-MX'), undefined);
});

test('styleFor is case-insensitive on the tag', () => {
  assert.equal(styleFor('DE-ch'), styleFor('de-CH'));
});

test('fix is exactly normalize', () => {
  everyStyle((style) => {
    for (const text of HOSTILE) assert.equal(fix(style, text), style.normalize(text));
  });
});
