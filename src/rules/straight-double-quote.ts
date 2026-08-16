// The straight double quote, in every style that has a curly pair to prefer.
//
// The purest case in the inventory and the reason this directory exists. Four
// packs declared this rule and all four declared `/"/g`, `severity: 'warning'`
// and no `fix`. What differed was the sentence and the citation, which is to say
// nothing that a regular expression can tell apart. Four copies of one pattern,
// required to stay equal, with nothing keeping them equal.
//
// **Why no style fixes it, stated once instead of four times.** The two ends of
// a straight double quote are the same character, so choosing between an opening
// and a closing mark means tracking pairing across the whole value, and a value
// may legitimately carry one half of a pair quoted from elsewhere. A `"` inside
// a code token has to survive as well, and nothing in a regex separates the two.
// So this is a parse rather than a substitution, and the `check` verb is what
// this package has instead of a guess. It is a warning and not an error for the
// same reason.
//
// Each caller adds what is true of its own style on top: German has two
// admissible pairs to choose between once you know which end you have, Dutch has
// three, French has one pair and gets to say so.

import { detectRule, type Rule } from '../pack.ts';

export function straightDoubleQuote(spec: {
  id: string;
  /** Completes `Straight double quote; ...`: what this style sets instead.
   * The shared half of the sentence stays shared, which is the half a reader
   * comparing two reports is entitled to see spelled the same way. */
  instead: string;
  cite: string;
}): Rule {
  return detectRule({
    id: spec.id,
    summary: `Straight double quote; ${spec.instead}`,
    cite: spec.cite,
    severity: 'warning',
    pattern: /"/g,
  });
}
