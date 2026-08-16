// The rule a style has instead of a ruling.
//
// This is the other half of `ballot.ts`, and the half that is a rule. A ballot
// counts which admissible spelling a text uses; a minority report is the rule
// that fires on the spellings it did *not* settle on. Two styles have one, and
// both arrived at it from a standard that declines to choose: the Lexique
// specifies one no-break space and typesets another, and Taaladvies says in as
// many words that there are no fixed rules for Dutch quotation marks and then
// recommends picking one system and keeping to it.
//
// So the defect is not a character, it is a document. That is what makes this
// family possible at all under the rule this package will not break, that a
// style must not assert what its citation does not fix: a citation that fixes
// only consistency yields a rule about consistency and no other.
//
// **Check-only, always.** Harmonizing means retyping text that is correct in the
// other admissible spelling, and *which* spelling to settle on is the author's
// call rather than this package's. On a document near an even split, repairing
// would silently retype half of it. French offers `withWidth` for an author who
// has made that call; Dutch cannot offer the analogue, because U+2019 closes the
// single-quote family and is also the apostrophe, and `ballot.ts` carries the
// count. A warning rather than an error for the same reason: nothing here is
// wrong on its own, only together.

import { detectRule, type Rule } from '../pack.ts';
import type { Ballot } from './ballot.ts';

export function minorityReport<K extends string>(spec: {
  id: string;
  summary: string;
  cite: string;
  /** The ballot whose losers this rule reports. Sharing the ballot with whatever
   * else consults it is the point: a rule that counted separately could report a
   * minority the style's own `choose` had already settled the other way. */
  ballot: Ballot<K>;
  /**
   * Where the spellings sit. Not necessarily the ballot's own pattern: French
   * ballots over whatever character occupies three positions, because a breaking
   * space there is evidence of a defect and not evidence for a width, and then
   * reports only the positions actually holding a no-break space.
   */
  pattern: RegExp;
  /** Which spelling this match is written in, or undefined for a match that is
   * not a spelling at all. */
  spelling: (match: RegExpExecArray) => string | undefined;
}): Rule {
  return detectRule<readonly K[]>({
    id: spec.id,
    summary: spec.summary,
    cite: spec.cite,
    severity: 'warning',
    pattern: spec.pattern,
    // The one detection whose narrowing comes from the style rather than from
    // the builder: `survey` reads a ballot this rule was handed. The pattern
    // here is not always the ballot's own, so the ballot has to be signed
    // separately or two styles balloting differently over one pattern would
    // stamp the same.
    params: [spec.ballot.signature],
    // Once per value, not once per match. A value here is a whole document and
    // counting inside `refine` would be quadratic in its length.
    survey: (value) => spec.ballot.minority(spec.ballot.tally(value)),
    refine: (match, _value, minority) => {
      // The ordinary answer, and the reason this rule is quiet on a consistent
      // document: at most one spelling in use means nothing lost the vote.
      if (minority.length === 0) return null;
      const spelled = spec.spelling(match);
      if (spelled === undefined || !(minority as readonly string[]).includes(spelled)) return null;
      return { index: match.index, length: spelled.length };
    },
  });
}
