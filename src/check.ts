// The runner: a pack plus text gives findings.
//
// This is where the check/fix asymmetry becomes visible to a caller rather than
// just true in the types. `check` runs every rule. `fix` runs the fixable subset
// and is exactly `pack.normalize`, re-exported under a name that says what it
// does at a call site. There is no third thing that runs some rules.
//
// The registry lives here too. It is a lookup from a BCP 47 tag to a pack, and
// it is deliberately not a plugin system: a pack is a plain object, nothing
// registers itself, and a consumer who wants one language imports one subpath
// and never touches this file.

import { deCH } from './de-CH.ts';
import { deDE } from './de-DE.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { nl } from './nl.ts';
import { excerptAt, type Finding, type TypographyPack } from './pack.ts';

/** Every pack this package ships, in tag order.
 *
 * There is no bare `de`. German is two conventions and a tag that named neither
 * would be a stamp that lies about which one a corpus was set in. `nl` is bare
 * for the same test read the other way: the Taalunie's spelling binds the
 * Netherlands, Flanders and Suriname, so there is one convention for the tag to
 * name. */
export const packs: readonly TypographyPack[] = [deCH, deDE, es, fr, nl];

/**
 * The pack for a BCP 47 tag, or undefined.
 *
 * Matching is exact and case-insensitive, and there is **no fallback from a
 * region to a bare language**: `de-AT` does not silently resolve to `de-DE`
 * however plausible that is, because the whole cost of getting this wrong is
 * paid by a user who never learns a substitution happened. A host that wants
 * `de-AT` treated as `de-DE` says so in its own dispatch, where the decision is
 * visible.
 */
export function packFor(lang: string): TypographyPack | undefined {
  const want = lang.toLowerCase();
  return packs.find((p) => p.lang.toLowerCase() === want);
}

/** Every finding in `text`, in the order they appear rather than by rule, since
 * a report is read top to bottom against the text it describes. */
export function check(pack: TypographyPack, text: string): Finding[] {
  const starts = lineStarts(text);
  const findings: Finding[] = [];

  for (const rule of pack.rules) {
    for (const at of rule.find(text)) {
      const { line, column } = position(starts, at.index);
      findings.push({
        ...at,
        rule: rule.id,
        summary: rule.summary,
        cite: rule.cite,
        severity: rule.severity,
        fixable: rule.fix !== undefined,
        line,
        column,
        excerpt: excerptAt(text, at),
      });
    }
  }

  return findings.sort((a, b) => a.index - b.index || a.rule.localeCompare(b.rule));
}

/**
 * The fixable subset applied, which is `pack.normalize` and nothing more.
 *
 * Idempotent, so running it over its own output is a no-op and a backfill
 * converges. `test/packs.test.ts` asserts that for every pack over every fixture
 * rather than leaving it as a claim in a comment.
 */
export function fix(pack: TypographyPack, text: string): string {
  return pack.normalize(text);
}

/** Findings that `fix` would *not* resolve. The interesting half of a report:
 * everything here needs a human or a model to decide. */
export function unfixable(findings: readonly Finding[]): Finding[] {
  return findings.filter((f) => !f.fixable);
}

// ---------------------------------------------------------------------------

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

function position(starts: readonly number[], index: number): { line: number; column: number } {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= index) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: index - starts[lo]! + 1 };
}
