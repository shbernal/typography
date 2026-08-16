// Counting which of several admissible spellings a text already uses.
//
// The family nobody named. `fr` counts U+00A0 against U+202F to decide which
// no-break space a repair should be spelled in; `nl` counts three systems of
// quotation mark to decide which one a document has settled on. Both have a
// `tally`, a precedence-ordered verdict, a minority, and a `detectRule` whose
// whole subject is a document that uses more than one. They are the same machine
// with different alphabets, and they were written twice.
//
// **This is the half of `withWidth` that generalizes.** `nl.ts` worked the other
// half out first and wrote it down: `fr` can impose one no-break space because
// that is a substitution, and the `withStyle` that would impose one quotation
// system cannot exist, because U+2019 is the closing single quotation mark *and*
// the apostrophe. Across the Taalunie's own 427,000 characters there are 537 of
// them and the opening marks pair with 144, so harmonizing `‘…’` into `“…”`
// would retype 393 apostrophes. So the ballot travels to every style that has
// two admissible spellings of anything, and the imposer travels only where the
// repair is a substitution.
//
// Nothing here is a rule. A ballot is what a rule's `choose` or `survey` is
// built out of.

/** How many votes each candidate got. */
export type Tally<K extends string> = Readonly<Record<K, number>>;

export interface Ballot<K extends string> {
  /** The candidates, in precedence order. */
  readonly candidates: readonly K[];
  /**
   * What this ballot is, for the signature of any rule built on it.
   *
   * The candidates in order and the pattern that collects the votes, which is
   * everything about a ballot that a style chose. `vote` is a closure and is
   * not in here: it decodes a match of that pattern into one of those
   * candidates, so two ballots agreeing on both and disagreeing on `vote` would
   * have to be reading the same captures two ways. That is the residue this
   * design leaves, and it is a builder's to avoid rather than a style's, since
   * no style writes a `vote`.
   */
  readonly signature: string;
  /** Count one value. */
  readonly tally: (value: string) => Tally<K>;
  /** Count many. Additive, which is the whole reason a host can fold a corpus
   * without re-deriving the ballot: the tally of two values concatenated is the
   * tally of one plus the tally of the other. */
  readonly fold: (values: Iterable<string>) => Tally<K>;
  /** Which candidate this tally settles on. */
  readonly verdict: (counts: Tally<K>) => K;
  /** Every candidate with votes that did not win, empty when at most one
   * candidate got any. Empty is the ordinary answer and means there is nothing
   * to report. */
  readonly minority: (counts: Tally<K>) => readonly K[];
}

export function ballot<K extends string>(spec: {
  /**
   * The candidates, **in precedence order**: the first is the default and wins
   * a tie.
   *
   * A tiebreak toward a fixed side is not a nicety. A `choose` built on this has
   * to be stable under its own fix or `normalize` stops converging, and it is
   * stable exactly because every repair moves the count further toward the side
   * already chosen and never away from it, so the second pass reaches the same
   * verdict as the first. A ballot with no votes at all returns the first
   * candidate for the same reason.
   */
  candidates: readonly K[];
  /** Global. Every match is one ballot paper. */
  pattern: RegExp;
  /** Which candidate this match votes for, or null to abstain. Abstentions are
   * the common case for a pattern that takes a position rather than a
   * character: French counts whatever sits inside a guillemet and only two of
   * the things that can sit there are votes. */
  vote: (match: RegExpExecArray) => K | null;
}): Ballot<K> {
  const { candidates, pattern, vote } = spec;
  if (candidates.length < 2) throw new Error('ballot: a ballot with one candidate decides nothing');
  if (!pattern.global) throw new Error('ballot: pattern must be global');

  const empty = (): Record<K, number> =>
    Object.fromEntries(candidates.map((c) => [c, 0])) as Record<K, number>;

  // A fresh copy per call, so a global pattern's `lastIndex` is never shared
  // between two values. `pack.ts` says at length what that costs when it is
  // missed: a rule that finds a defect on the first row and misses it on the
  // second.
  const tally = (value: string): Tally<K> => {
    const counts = empty();
    for (const m of value.matchAll(new RegExp(pattern.source, pattern.flags))) {
      const choice = vote(m);
      if (choice !== null) counts[choice]++;
    }
    return counts;
  };

  const verdict = (counts: Tally<K>): K => {
    let winner = candidates[0]!;
    for (const candidate of candidates) if (counts[candidate] > counts[winner]) winner = candidate;
    return winner;
  };

  return {
    candidates,
    signature: JSON.stringify([...candidates, pattern.source, pattern.flags]),
    tally,
    fold: (values) => {
      const total = empty();
      for (const value of values) {
        const counts = tally(value);
        for (const candidate of candidates) total[candidate] += counts[candidate];
      }
      return total;
    },
    verdict,
    minority: (counts) => {
      const used = candidates.filter((candidate) => counts[candidate] > 0);
      if (used.length < 2) return [];
      const won = verdict(counts);
      return used.filter((candidate) => candidate !== won);
    },
  };
}
