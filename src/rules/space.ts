// The space classes the rule builders match on. Vocabulary rather than rules:
// nothing here is a `Rule` and nothing here decides anything.
//
// **Why this is shared where it deliberately was not.** `es.ts`, `de-common.ts`
// and `nl.ts` each spelled out an `ANY_SPACE` of their own, and each carried the
// same comment saying why: the day RAE and Duden disagree about what counts as a
// space, a shared constant would have to be split under time pressure by whoever
// is holding the release. That argument is about which standards body owns a
// rule, and it does not survive the pivot, which takes the standards bodies out
// of the ownership question entirely. A style is a bundle of rules with
// defaults, a user composing their own bundle is not a standards body, and three
// copies of a character class required to stay equal with nothing keeping them
// equal is the failure this package is about one level down. `prose.ts` made the
// same crossing first and its header argues it at length.
//
// The three copies were in fact equal. The fourth was not, and that is the thing
// worth carrying out of the merge: see `ANY_SPACE_OR_THIN`.

import { NARROW_NO_BREAK, NO_BREAK, THIN } from '../pack.ts';

/** Space, U+00A0 and U+202F. Spanish, German and Dutch take none of the three
 * where their rules look, so all three are the defect. */
export const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}]`;

/**
 * The same three plus U+2009, which is the class the French rules match on.
 *
 * The difference is real and nobody decided it. French names the thin space
 * because French is the style that rules on *which* no-break space, and U+2009 is
 * the trap in that family: right width, breaks lines, so a proof looks correct
 * and the line comes apart in a browser. 18 of them sit inside guillemets in the
 * French corpora.
 *
 * The other three styles rule that the position takes no space at all, which
 * makes a thin space there wrong by their own summaries, and they do not match
 * it: `es.normalize` and `deCH.normalize` both leave `«<THINSP>hola<THINSP>»`
 * exactly as they found it. That is an inconsistency this merge made visible
 * rather than one it introduced, it changes behaviour to fix, and step 1 is a
 * pure refactor. `FOLLOW-UPS.md` 3 holds it.
 */
export const ANY_SPACE_OR_THIN = `[ ${NO_BREAK}${NARROW_NO_BREAK}${THIN}]`;

/**
 * The start of a run of spaces, so a run is a candidate once rather than once
 * per character in it.
 *
 * Every pattern that opens with a space quantifier needs this, and the reason is
 * not obvious enough to leave to whoever writes the next one. A pattern like
 * `ANY_SPACE+«` re-enters at every character of a run of spaces, and at each one
 * it consumes to the end of the run and backtracks the whole way looking for the
 * `«` that is not there. That is quadratic in the length of the run, and a run
 * of spaces is what an indented block or a padded table produces without
 * anybody meaning to. Anchoring the start makes a run a candidate once.
 *
 * It changes nothing about what matches: a match could only ever begin at the
 * start of a run, because the engine scans left to right and takes the first
 * one. `test/perf.test.ts` is what found this, in the German rules, after the
 * same defect had been fixed in `fr.ts` and thought to be French-only.
 *
 * A function rather than a constant because it is derived from a space class and
 * there are two of those. A `RUN_START` pinned to the wrong one is a lookbehind
 * that silently lets a thin space start a second match.
 */
export function runStart(spaces: string): string {
  return `(?<!${spaces})`;
}
