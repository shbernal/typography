// A space before `; : ! ?` in a style that does not take one.
//
// Three packs declared this and the pattern was character for character the same
// in all three. It is *not* the French rule about the same characters: French
// requires a space there and these forbid one, so the two are one family only
// under a rule id that names the position rather than the verdict. That merge is
// the `guillemet-inner-space` builder's problem and it is deliberately not this
// one's.
//
// **Why no style fixes it**, which is the boundary worth stating because
// deleting a space looks like the safest edit imaginable. It is not, on the text
// this package exists for: `a ? b : c` is a ternary, `1 : 2` is a ratio, and a
// fenced code block inside technical prose carries both. Deleting those spaces
// silently corrupts code that rendered correctly. The defect is real, it is
// almost always French spacing carried over by a translator or a model, and it
// is still a human's call.
//
// `looksMachine` is the other half of that and it is applied here for every
// caller, which is the point. This rule shipped in the German pack without the
// filter while its comment cited the Spanish file that had it: the two rules
// disagreed about a URL and about nothing else, on `Ver https://ejemplo.es/a
// ?b=1 y ruta/x : y aqui.` Spanish reported nothing and German reported twice.
// A comment claiming parity with another pack is an assertion nothing tests,
// and one builder is the assertion made true by construction.

import { detectRule, type Rule } from '../pack.ts';
import { looksMachine } from '../prose.ts';
import { ANY_SPACE } from './space.ts';

export function spaceBeforePunctuation(spec: {
  id: string;
  /** The language, in English, completing `..., which ${language} does not take`. */
  language: string;
  cite: string;
}): Rule {
  return detectRule({
    id: spec.id,
    summary: `Space before \`; : ! ?\`, which ${spec.language} does not take`,
    cite: spec.cite,
    // The letter before is what keeps this off a bare `:` after a bracket, and
    // the match is trimmed to the run of spaces themselves so the report points
    // at the characters that are wrong rather than at the word beside them.
    pattern: new RegExp(`\\p{L}${ANY_SPACE}+[;:!?]`, 'gu'),
    refine: (match, value) =>
      looksMachine(value, match.index)
        ? null
        : { index: match.index + 1, length: match[0].length - 2 },
  });
}
