// No space at all before `; : ! ?`, in a style that requires one.
//
// The counterpart of `space-before-punctuation.ts` at the same position: that
// rule is about the space that is there and wrong, this one about the space that
// is not there. Only a style that requires the space can have it, which for now
// means French alone.
//
// **Check-only, and this is the French half of the finding that shapes the whole
// package.** The defect is real and common, and inserting the space is not a
// substitution: `https://`, `C:\`, `!important`, `?query=` and every port number
// are the same characters in a construction that must not be touched.
//
// So the pattern is conservative in both directions. A letter before rules out
// `12:30` and a bare `:` after a bracket. Whitespace, a closing mark or
// end-of-string after rules out `!important` and `?utf8`, where the punctuation
// carries syntax rather than ending a sentence. Even so this is the rule most
// likely to fire on technical prose, which is exactly why it reports and does not
// rewrite: on the journals corpus 355 of its 355 findings were foreign-language
// titles in bibliographies.

import { detectRule, type Rule } from '../pack.ts';

export function missingPunctuationSpace(spec: { cite: string }): Rule {
  return detectRule({
    id: 'missing-punctuation-space',
    summary: 'No space at all before `; : ! ?`, where French requires one',
    cite: spec.cite,
    pattern: /\p{L}[;:!?](?=[\s»)\]"'’]|$)/gu,
    // The letter is context and not the defect, so the report points at the
    // punctuation mark that is missing its space.
    refine: (match) => ({ index: match.index + 1, length: 1 }),
  });
}
