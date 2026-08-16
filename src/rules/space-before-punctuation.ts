// The space before `; : ! ?`, in the two styles a standard can take on it.
//
// Three packs declared the forbidding rule and the pattern was character for
// character the same in all three. French requires a space in the same position,
// which used to be given as the reason the two could not be one thing. They are
// one *position* with two verdicts, and the position is what a rule id names, so
// they live in one module and are two builders rather than one with a switch:
// unlike the inner-space family, the two verdicts here share no pattern skeleton
// at all. Forbidding takes the whole run and needs a letter in front of it;
// requiring converts one space and needs to know which spellings are already
// right.
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

import { conformRule, detectRule, type Rule } from '../pack.ts';
import { looksMachine } from '../prose.ts';
import { ANY_SPACE } from './space.ts';
import type { Spelling } from './spelling.ts';

/** One id for the position, named once for the two builders that answer it.
 * Two literals would be the same defect this directory exists to remove, one
 * character wide and invisible in a report. */
const PUNCTUATION_SPACING = 'punctuation-spacing';

export function spaceBeforePunctuation(spec: {
  /** The language, in English, completing `..., which ${language} does not take`. */
  language: string;
  cite: string;
}): Rule {
  return detectRule({
    id: PUNCTUATION_SPACING,
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

/**
 * The other verdict: the position takes a no-break space, and what is there is
 * not one.
 *
 * Fixable where the forbidding rule is not, and the asymmetry is not an
 * oversight. Deleting a space corrupts a ternary or a ratio that rendered
 * correctly; converting a space that is already there to a no-break space of the
 * same visual width changes only how the line breaks. So this one repairs and
 * never inserts, and the rule about the space that is *missing* is check-only and
 * lives in `missing-punctuation-space.ts`.
 *
 * `admissible` is the same field, doing the same work, as in
 * `inner-space.ts`: the spellings this style will not retype. French passes the
 * two no-break spaces, so only a breaking space matches and a correct document is
 * left alone; `withWidth` passes null and takes the position unconditionally,
 * which is the whole difference between the two. `spelling` is the other field
 * those two share, and it is data for the same reason in both.
 */
export function requireSpaceBeforePunctuation(spec: {
  summary: string;
  cite: string;
  /** Every space that turns up in this position, as a class body. */
  spaces: string;
  /** The spellings already correct here, as a class body, or null to take the
   * position whatever it holds. */
  admissible: string | null;
  /** The marks this rule is about, as a class body. French excludes the colon,
   * which `colon-spacing.ts` rules on separately and without a ballot. */
  marks: string;
  /** How the repair is spelled: `impose(...)` or `conform(ballot)`. Data rather
   * than a function for the reason `rules/spelling.ts` gives, which this rule is
   * half of: the width never reaches the pattern, so a bare function would let
   * the two `withWidth` derives stamp the same. */
  spelling: Spelling;
}): Rule {
  // One space, not a run: the position is a single character wide, and taking a
  // run here would let this rule and the guillemet rules fight over `» ;`.
  const already = spec.admissible === null ? '' : `(?!${spec.admissible})`;
  return conformRule({
    id: PUNCTUATION_SPACING,
    summary: spec.summary,
    cite: spec.cite,
    pattern: new RegExp(`${already}${spec.spaces}(?=${spec.marks})`, 'gu'),
    choose: spec.spelling.of,
    params: [spec.spelling.signature],
  });
}
