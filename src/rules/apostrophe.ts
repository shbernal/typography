// A wrong mark standing in for the apostrophe, between two letters.
//
// Three packs declared this. French and German were character for character
// identical; Dutch widened the class by one mark and was otherwise the same
// rule. So there is one parameter here and it is the class of marks that is
// wrong, which is also the only thing that has ever differed.
//
// **Requiring a letter on both sides is the whole rule**, and it is the
// narrowing that makes the substitution safe rather than a detail of it. It
// keeps the rewrite off a quote character used as a quote, off an apostrophe
// inside a preserved code token, and off anything adjacent to a digit or a
// bracket. Measured: the German rule reports `Z'graggen` and leaves `100'000`
// alone, and 22 Swiss thousands separators would otherwise have been repaired.
//
// The replacement is U+2019 in every style that has this rule, which is why it
// is not a parameter. A style that wanted a different mark in apostrophe
// position would be asserting something no source in this repo says.

import { LEFT_SINGLE_QUOTE, RIGHT_SINGLE_QUOTE, type Rule, replaceRule } from '../pack.ts';

export function apostrophe(spec: {
  /** The language, in English, completing `...; ${language} uses U+2019`. */
  language: string;
  /** The marks that are wrong in this position, as a character class body.
   * `[']` for French and German, `['‘]` for Dutch. */
  wrong: string;
  cite: string;
}): Rule {
  return replaceRule({
    id: 'apostrophe',
    summary: summarize(spec.wrong, spec.language),
    cite: spec.cite,
    pattern: new RegExp(`(?<=\\p{L})${spec.wrong}(?=\\p{L})`, 'gu'),
    replacement: RIGHT_SINGLE_QUOTE,
  });
}

/**
 * What a rule converting `wrong` should call the marks it converts.
 *
 * Derived rather than taken as a parameter because the two summaries this
 * replaces had already drifted apart: French and German said "Straight
 * apostrophe" and Dutch said "Straight quote or U+2018", describing the same
 * character two ways in one report. Deriving the phrase from the class means a
 * style that widens the class cannot forget to widen the sentence.
 *
 * Exported for the two other rules built on the same class, in
 * `apostrophe-elision.ts` and `decade-apostrophe.ts`. A style passes one `wrong`
 * to all three of them, so the phrase has to come from one place too, or the
 * report calls one character two things in three lines.
 */
export function wrongApostropheMarks(wrong: string): string {
  return wrong.includes(LEFT_SINGLE_QUOTE) ? 'Straight quote or U+2018' : 'Straight apostrophe';
}

function summarize(wrong: string, language: string): string {
  return `${wrongApostropheMarks(wrong)} between letters; ${language} uses U+2019`;
}
