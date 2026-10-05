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
// The three copies were in fact equal and the fourth was not: French matched
// U+2009 as well and the other three did not, so `es.normalize` and
// `deCH.normalize` both left `«<THINSP>hola<THINSP>»` exactly as they found it,
// and a thin space before `;` went unreported in every style but `fr`. Nobody
// had decided that; the merge put the two classes side by side and it was
// visible. There is one class now.

import { NARROW_NO_BREAK, NO_BREAK, THIN } from '../pack.ts';

/**
 * Every space that turns up between a mark and the word beside it in text that
 * reaches this package: space, U+00A0, U+202F and U+2009.
 *
 * U+2009 is in it because it is the trap in that family: right width, breaks
 * lines, so a proof looks correct and the line comes apart in a browser. French
 * names it because French is the style that rules on *which* no-break space, and
 * 18 of them sat inside guillemets in the French corpora. Spanish, German, Dutch
 * and English rule that the positions they look at take no space at all, which
 * makes a thin space there wrong by their own summaries, so the class is the same
 * for every style and only the verdict on it differs.
 */
export const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}${THIN}]`;

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
 * Derived from `ANY_SPACE` and from nothing else. When there were two space
 * classes this was a function of one of them, and a lookbehind pinned to the
 * narrower one would have let a thin space start a second match.
 */
export const RUN_START = `(?<!${ANY_SPACE})`;
