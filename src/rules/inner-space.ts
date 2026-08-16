// The space on the inside of a quotation mark.
//
// Nine rules across four packs, and this file is the argument that they are one
// family. It is not an obvious argument, because the family contains rules that
// contradict each other: `es.guillemet-open-space` deletes the space after `«`
// and `fr.guillemet-open` requires one there, using the identical character in
// the identical position. `es.ts` gave exactly that as the reason there could be
// no shared rule engine.
//
// **That was an argument about standards bodies, not about rules.** It held
// while a rule's identity came from the clause that authorised it, because then
// two clauses ruling opposite ways were two rules by definition. Under
// composition a style is a bundle with defaults and a user composing one is not
// a standards body, so identity comes from the position instead: *the inside of
// a quotation mark* is one place to have an opinion about, and "no space", "a
// no-break space" and "whichever no-break space this document already uses" are
// three settings of one knob. Opposite is a parameter value.
//
// What each caller still owns is the citation, the sentence, and which mark it
// is talking about. The summary is a plain parameter here and not a template,
// unlike the other three families: a rule that deletes and a rule that inserts
// have no shared sentence to preserve, and inventing one would have cost every
// existing summary its wording for nothing.
//
// **The family is not only guillemets**, which is why this module is not called
// `guillemet-inner-space` as the plan had it. `de-DE.low-quote-space` is about
// U+201E and belongs here on every axis that matters: same position, same
// pattern, same repair. It is also the one member with `guard: false` for a good
// reason rather than an unresolved one.

import { conformRule, type Rule } from '../pack.ts';
import { runStart } from './space.ts';

/**
 * What the inside of the mark should hold.
 *
 * The empty string closes the mark up, which is what Spanish and both German
 * conventions require. The object form is for a style whose sources admit more
 * than one spelling: `choose` says which one *this text* is repaired in, and
 * `admissible` is the set already correct, which the pattern then declines to
 * match at all.
 */
export type InnerSpacing =
  | ''
  | {
      /** The spellings that are already correct here, as a character class body.
       *
       * Null takes the run unconditionally, which is a style that has settled
       * the question and is imposing its answer on text that is correct in the
       * other spelling. `fr.withWidth` is the only caller that does, and the
       * comment there is the one to read before adding a second. */
      readonly admissible: string | null;
      /** The spelling this text is repaired in. Called once per value.
       *
       * Must be stable under its own fix or `normalize` stops converging: a
       * `choose` that counts spellings has to break a tie toward a fixed side.
       * `conformRule` says this at length and `test/packs.test.ts` asserts it. */
      readonly choose: (value: string) => string;
    };

/** No letter or digit on the mark's outside. See `guard`. */
const NOT_WORD_BEFORE = `(?<![\\p{L}\\p{N}])`;
const NOT_WORD_AFTER = `(?![\\p{L}\\p{N}])`;

export function innerSpace(spec: {
  id: string;
  summary: string;
  cite: string;
  /** The mark itself. */
  mark: string;
  /** Which side of the quotation this mark is on, and so whether the space this
   * rule is about follows the mark or precedes it. */
  side: 'open' | 'close';
  /** Every space character that turns up in this position, as a class body.
   * A required parameter and not a default, because the four packs that spelled
   * it out for themselves did not all spell it the same: `rules/space.ts`. */
  spaces: string;
  correct: InnerSpacing;
  /**
   * Whether to assert that the mark is not doing the opposite job.
   *
   * Guillemets are unambiguous *within* a convention and not across them: `«`
   * opens a quotation in Spanish, French and Switzerland and *closes* one in
   * Germany and Austria, and `»` is the mirror. Without the guard, a rule that
   * closes up `«` reads the `«` of a German `»Wort« und` as an opening mark,
   * deletes the space after it and welds two words together. A mark with a
   * letter or a digit immediately on its outside is closing something, whatever
   * the style believes.
   *
   * Set it false only for a reason you can state. `de-DE.low-quote-space` does,
   * because U+201E has exactly one job in every language that uses it. `fr` does
   * not: it has the same hazard in a milder form and turning the guard on there
   * would move `fr@0.2.0` to `fr@0.3.0` for a defect no French corpus contains.
   * `FOLLOW-UPS.md` 1b holds it. Making it a flag at the call site is most of
   * what this builder is worth: the defect used to be a lookaround that was not
   * there, which nothing can see.
   */
  guard: boolean;
}): Rule {
  // Narrowed at each use rather than through `closedUp`, which the checker does
  // not follow back to the union.
  const closedUp = spec.correct === '';
  const inner = spec.correct === '' ? () => '' : spec.correct.choose;
  const admissible = spec.correct === '' ? null : spec.correct.admissible;

  // A rule that deletes need only consider runs of at least one space; a match
  // on an empty run would repair the mark to itself. A rule that *imposes* a
  // space has to match the empty run, or it can never insert one, and it has to
  // match its own output, or `normalize` never converges and every pass looks
  // like progress.
  const run = `${spec.spaces}${closedUp ? '+' : '*'}`;

  if (spec.side === 'open') {
    const already = admissible === null ? '' : `(?!${admissible}(?!${spec.spaces}))`;
    return conformRule({
      id: spec.id,
      summary: spec.summary,
      cite: spec.cite,
      // The mark fixes where the run starts, the lookahead rejects the spellings
      // that are already correct, and the run then takes the rest with nothing
      // after it to backtrack for. One way to match, so it stays linear.
      pattern: new RegExp(`${spec.guard ? NOT_WORD_BEFORE : ''}${spec.mark}${already}${run}`, 'gu'),
      choose: (value) => `${spec.mark}${inner(value)}`,
    });
  }

  const already = admissible === null ? '' : `(?!${admissible}${spec.mark})`;
  return conformRule({
    id: spec.id,
    summary: spec.summary,
    cite: spec.cite,
    // The mirror, anchored on its left by `runStart` instead of by the mark,
    // without which every position inside a run of spaces starts a fresh scan
    // for a mark that is not there.
    pattern: new RegExp(
      `${runStart(spec.spaces)}${already}${run}${spec.mark}${spec.guard ? NOT_WORD_AFTER : ''}`,
      'gu',
    ),
    choose: (value) => `${inner(value)}${spec.mark}`,
  });
}
