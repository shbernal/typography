// The mark in front of a shortened decade: `the ’90s`, `the ’20s`.
//
// One caller, English, and it is a separate rule from `apostrophe-elision.ts`
// rather than one more branch of that alternation because the position is
// different in the one way that decides a pattern: what follows is a digit, so
// the boundary that makes the elision rule safe is not the thing making this one
// safe. It also has its own citation, and a rule with two citations under one id
// is how a style comes to assert something neither of them says.
//
// **This is the English case the mark is most often wrong in.** A smart-quote
// pass that meets a leading straight quote produces an *opening* single
// quotation mark, so `'90s` becomes `‘90s`, and both manuals rule on it in as
// many words: what stands in for the omitted century is an apostrophe and not a
// quotation mark. The two characters differ by which way the mark curls, which
// at a report's font size is nothing, so this is exactly the class of defect
// that survives proofreading.
//
// The `s` is required, which is what keeps this off `'08` in `the class of '08`.
// That is the same character doing the same job and it is not distinguishable
// from a quoted number: `'08'` is two marks around a figure, and the rule would
// have to know that the second one is a closing quote to leave the first alone.

import { RIGHT_SINGLE_QUOTE, type Rule, replaceRule } from '../pack.ts';
import { wrongApostropheMarks } from './apostrophe.ts';

export function decadeApostrophe(spec: {
  /** Everything that turns up in this position and is not U+2019. Shared with
   * the style's other apostrophe rules. */
  wrong: string;
  cite: string;
}): Rule {
  return replaceRule({
    id: 'decade-apostrophe',
    summary: `${wrongApostropheMarks(spec.wrong)} on a decade such as \`${RIGHT_SINGLE_QUOTE}90s\``,
    cite: spec.cite,
    // The lookbehind keeps this off the `1990s` half of `the 1990s`, where there
    // is no elision and no mark; the trailing lookahead keeps it off `'90st` and
    // anything else that is a token rather than a decade.
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${spec.wrong}(?=[0-9]0s(?![\\p{L}\\p{N}]))`, 'gu'),
    replacement: RIGHT_SINGLE_QUOTE,
  });
}
