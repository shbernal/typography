// A guillemet used the way the other convention uses it.
//
// Two rules, exact inverses, and the pair is the cleanest instance in this
// package of a family whose members contradict each other on purpose. Germany
// and Austria open a quotation with `»` and close it with `«`; Switzerland and
// France do the reverse with the identical two characters. So `«Wort»` is
// correct Swiss and a defect in Germany, and `»Wort«` is correct German and a
// defect in Switzerland, and a single builder given *which mark this style opens
// with* produces both.
//
// **Check-only, and the reason is not the usual one.** Everywhere else in this
// package a rule declines to repair because the repair needs information the
// pattern does not have. Here the repair is mechanically obvious: swap the two
// characters. It is still not safe, because the text may be right and the *style*
// wrong. A Swiss quotation inside a German document is a citation, not an error,
// and nothing in the sentence says which it is. Reporting it lets a reader decide;
// repairing it would silently edit somebody's quotation of somebody else.
//
// That the two rules are mirror images used to be a sentence in `de-CH.ts`
// asserting parity with `de-DE.ts`. `de-common.ts` records what a comment like
// that was worth the last time one was checked: `es` and `de-CH` claimed the same
// parity for two pack versions while one of them was missing a guard. Here the
// parity is a fact about the program.

import { detectRule, type Rule } from '../pack.ts';

/** The two guillemets, and which direction a style points them when it opens a
 * quotation with each. Naming the direction rather than deriving it from the
 * character keeps the summaries reading the way a typographer would say it. */
const DIRECTION = { '«': 'outward', '»': 'inward' } as const;

export type Guillemet = keyof typeof DIRECTION;

/** The mark that closes a quotation this style opened with `mark`. */
const CLOSES: Record<Guillemet, Guillemet> = { '«': '»', '»': '«' };

export function guillemetDirection(spec: {
  /** The guillemet **this style opens a quotation with**. The rule is about the
   * other one, which is what makes one parameter produce both members. */
  opens: Guillemet;
  /** The convention the reported setting belongs to, named so the report tells a
   * reader that the text may be correct somewhere else. */
  convention: string;
  cite: string;
}): Rule {
  const foreign = CLOSES[spec.opens];
  const direction = DIRECTION[foreign];
  return detectRule({
    id: 'guillemet-direction',
    summary:
      `Guillemets point ${direction} (\`${foreign}Wort${CLOSES[foreign]}\`), ` +
      `which is the ${spec.convention} setting`,
    cite: spec.cite,
    // The foreign mark immediately followed by a word character is that mark
    // being used to *open* a quotation. A guillemet with a space or a letter on
    // the other side is doing the job this style gives it and is not reported.
    pattern: new RegExp(`${foreign}(?=[\\p{L}\\p{N}])`, 'gu'),
  });
}
