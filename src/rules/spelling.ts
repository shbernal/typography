// Which admissible spelling a repair is written in.
//
// Vocabulary, like `space.ts` and `ballot.ts`: nothing here is a rule. What it
// exists for is a defect the composition layer would otherwise have shipped on
// its first day.
//
// `conformRule` takes a `choose` function, and two of the builders here used to
// take one straight from the style. `fr` passed a ballot reader and
// `fr.withWidth` passed `() => width`, and the patterns those two produce are
// character for character identical, because the width is not in the pattern.
// So a stamp hashed over what a rule *declares* could not tell a corpus
// normalized into U+00A0 from one normalized into U+202F, which is the exact
// pair of eras `withWidth`'s own id was invented to keep apart.
//
// The fix is not to make the caller declare the width twice, once to `choose`
// and once to the stamp. Two copies required to stay equal is the defect this
// package is about one level down, and this repo has met three instances of it
// in three releases. So a `Spelling` is **data that carries its own behaviour**:
// one declaration produces the function the rule calls and the string the stamp
// hashes, and there is nothing to keep in agreement.
//
// The rule that falls out of it, and it is worth stating as a rule: a builder
// must not accept a bare function for anything that decides what a repair says.
// If it cannot sign the parameter, it cannot take it.

import type { Ballot } from './ballot.ts';

/**
 * One of the spellings a style admits, and how a rule arrives at it.
 *
 * Construct with `impose` or `conform`. The interface is exported because a
 * rule builder holds one; a style should not be writing the pair by hand, since
 * doing so is precisely the two-copies defect the module header describes.
 */
export interface Spelling {
  /** The spelling this value should be repaired in. Called once per value. */
  readonly of: (value: string) => string;
  /** What decided it, for `Rule.signature`. */
  readonly signature: string;
}

/**
 * One spelling, everywhere, whatever the text already does.
 *
 * This is a style that has settled a question its sources leave open and is
 * imposing the answer on text that is correct in the other spelling. Reach for
 * it knowing that: `fr.withWidth` is the only caller, and the comment there is
 * the one to read before adding a second.
 *
 * The empty string is the ordinary case and is not really an imposition at all:
 * closing a mark up leaves nothing for a text to be already correct about.
 */
export function impose(spelling: string): Spelling {
  return {
    of: () => spelling,
    // JSON-encoded, because every interesting value here is an invisible
    // character and a signature is read by a human exactly when something has
    // gone wrong with it.
    signature: `impose ${JSON.stringify(spelling)}`,
  };
}

/**
 * Whichever admissible spelling this text already uses.
 *
 * The stance that separates `fr@0.2.0` from `fr@0.1.0`: a style whose sources
 * admit two spellings must not retype a document that consistently uses the
 * other one, so the repair is spelled the way the text spells it. `Ballot` is
 * what counts, and sharing one ballot between the rules that repair and the
 * rule that reports the split is why a `Spelling` takes the ballot rather than
 * a count.
 *
 * **Stable under its own fix**, which is what keeps `normalize` converging: the
 * ballot breaks a tie toward a fixed candidate, so every repair moves the count
 * further toward the side already chosen and the second pass reaches the same
 * verdict as the first.
 */
export function conform<K extends string>(ballot: Ballot<K>): Spelling {
  return {
    of: (value) => ballot.verdict(ballot.tally(value)),
    signature: `conform ${ballot.signature}`,
  };
}
