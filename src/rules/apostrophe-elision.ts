// A word-initial elision mark: `’s morgens`, `’t huis`, `’n keer`.
//
// One caller, because Dutch is the only language here that elides at the front
// of a word. It is in `rules/` rather than in the style anyway, for the reason
// every module here is: the pattern is shared with nothing and the citation is
// still the style's to supply.
//
// **Word-initial is where a Dutch apostrophe and an opening single quotation
// mark are the same character in the same place.** `'s morgens` is an elision
// and `'strand'` is a quoted word, and no amount of lookaround distinguishes
// them in general. What does distinguish them is that the elisions are a short
// list the standard enumerates and every one of them is a whole word, so a
// following space or hyphen closes it. `'strand'` fails on both counts: `s` is
// followed by `t`, not by a boundary.
//
// So this rule is fixable only because the clitic set is closed and the boundary
// after it is required. Widening either one turns it into a rule that retypes the
// opening quotation mark of any quoted word beginning with s, t, n, k, m or r,
// which is a defect the style would be introducing rather than finding.

import { RIGHT_SINGLE_QUOTE, type Rule, replaceRule } from '../pack.ts';

/**
 * The words that may carry a word-initial apostrophe: `'s 't 'n 'k 'm 'r 'ns`.
 *
 * `ns` precedes the single letters in the alternation because the engine takes
 * the first branch that matches, and `n` alone would strand the `s` of `'ns`.
 */
const CLITIC = `(?:ns|[stnkmr])`;

export function apostropheElision(spec: {
  id: string;
  /** Everything that turns up in this position and is not U+2019. Shared with
   * the style's other apostrophe rules, which is why it is a parameter. */
  wrong: string;
  cite: string;
}): Rule {
  return replaceRule({
    id: spec.id,
    summary: 'Straight quote or U+2018 on a word-initial elision such as `’s` or `’t`',
    cite: spec.cite,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${spec.wrong}(?=${CLITIC}[ \\-])`, 'gu'),
    replacement: RIGHT_SINGLE_QUOTE,
  });
}
