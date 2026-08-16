// French orthotypography, per the Imprimerie nationale.
//
// The five fixable rules below started as a verbatim extraction from a
// production normalizer, and `gates/fr-reproduction` holds them to byte-for-byte
// agreement with it over every French value that normalizer ever touched. Two of
// them have since been narrowed, and the gate still reports zero differences,
// which is worth understanding before narrowing a third: a reproduction gate
// constrains a rule only where its corpus exercises it.
//
// **The narrowing, and why it is the most important thing in this file.** The
// first version of the guillemet rules rewrote whatever space sat inside a
// guillemet to U+202F. Run past 2.4M characters of professionally typeset French
// - three OpenEdition journals and The Conversation France - they fired on 6,462
// guillemets out of 6,466, because both publishers use U+00A0 and U+202F occurs
// twice in the whole corpus. The rules were not finding a defect. They were
// retyping the inside of every quotation in correctly set French.
//
// The citation does not settle it, which is the substance rather than an excuse.
// The Lexique typesets its own guillemets with a fine space while its own table
// at p.149 specifies `espace mots insécable`, which is U+00A0; the fine space is
// what Swiss practice prescribes. So this style does not pretend to a width the
// standard does not fix. It rules on what is wrong under *both* readings - a
// breaking space, a doubled space, no space - and it repairs in whichever of the
// two no-break spaces the document already uses. Consistency within a document is
// a property this package can honestly assert; a width is not.
//
// `fr.mixed-no-break-space` is the other half of that stance: a document using
// both widths in the same slot is the one thing that is wrong under every
// reading, and it is reported rather than repaired because *which* width to
// settle on is the author's call.
//
// The three check-only rules at the bottom are what French gains from having a
// `check` verb at all. They are the defects the fixable rules decline to repair,
// reported rather than guessed at.
//
// Citations are section-level, to `Lexique des règles typographiques en usage à
// l'Imprimerie nationale` (2002). A rule with no citation does not belong here:
// that is the line between a national standard and a house style, and it is the
// only thing keeping this file from becoming a place where preferences collect.

import { compose, derive } from './compose.ts';
import { NARROW_NO_BREAK, NO_BREAK, type Rule, type Style } from './pack.ts';
import { apostrophe } from './rules/apostrophe.ts';
import { ballot } from './rules/ballot.ts';
import { colonSpacing } from './rules/colon-spacing.ts';
import { innerSpace } from './rules/inner-space.ts';
import { minorityReport } from './rules/minority-report.ts';
import { missingPunctuationSpace } from './rules/missing-punctuation-space.ts';
import { ANY_SPACE_OR_THIN } from './rules/space.ts';
import { requireSpaceBeforePunctuation } from './rules/space-before-punctuation.ts';
import { conform, impose } from './rules/spelling.ts';
import { straightDoubleQuote } from './rules/straight-double-quote.ts';

const LEXIQUE = 'Imprimerie nationale, Lexique des règles typographiques (2002)';

// `ANY_SPACE_OR_THIN` is everything that turns up between a guillemet and the
// word beside it in text that reaches this package. It is spelled out in
// `rules/space.ts`, along with why French names U+2009 and the other three
// styles do not.

/** The two admissible spellings of the no-break space this style has to choose
 * between, and never a third. Passed as `admissible` wherever a rule here has to
 * leave a correct document alone: the two spellings that break a line are then
 * exactly what is left, which is what the standard is about under either
 * reading. U+2009 is the interesting one, right width and wrong behaviour, so it
 * survives proofreading and comes apart when the text reflows. */
const NO_BREAK_SPACE = `[${NO_BREAK}${NARROW_NO_BREAK}]`;

/** The three marks whose space this style ballots over. The colon is not among
 * them: `colonSpacing` rules on it outright, because it is the one position
 * where nothing is in dispute. */
const HIGH_PUNCTUATION = `[;!?]`;

/**
 * The run of spaces beside a guillemet is wrong unless it is exactly one
 * no-break space. That one sentence covers all three defects - a breaking space
 * anywhere in the run, more than one space, no space at all - and exactly one
 * U+00A0 and exactly one U+202F are what it leaves out, which is the whole of
 * what the corpora taught this style.
 *
 * **How it is spelled matters as much as what it says.** The direct translation
 * enumerates the three defects as an alternation:
 *
 *     (?:SPACE*BREAKING SPACE*|SPACE{2,}|absent)
 *
 * A breaking space is a subset of `SPACE`, so the first branch can split a run of
 * spaces at every position in it and the second can re-match what the first gave
 * up. Against a run with no guillemet after it the engine walks that ambiguity:
 * 800 ordinary spaces took 242 ms, 1,600 took 1.5 s, and a single padded
 * 3,000-space line took 15 s. Nothing hostile is required to produce one - an
 * indented block or a wrapped table will do - and this package's own security
 * policy calls a pattern that behaves this way a vulnerability in it.
 *
 * So the rules take the run *once*, greedily, with no second way to match it,
 * and carry the exception as a lookahead at the position where the run begins.
 * Nothing to backtrack means linear, and `test/perf.test.ts` holds it there
 * rather than trusting this comment.
 *
 * That spelling now lives in `rules/inner-space.ts`, where every style in this
 * package gets it, and `NO_BREAK_SPACE` is what French passes as the set of
 * spellings already correct. The other four styles pass no set at all, because
 * closing a mark up leaves nothing to be already correct about.
 */

/** Every position where this style has an opinion about *which* no-break space to
 * use. The colon is deliberately not here: the Lexique specifies the word space
 * before it, both corpora agree with the Lexique 2,458 times and contradict it
 * never, and a rule with nothing in dispute does not need a ballot. */
const BALLOT = `(?<=\u00AB)(.)|(.)(?=\u00BB)|(.)(?=[;!?])`;

/**
 * The two widths, in precedence order.
 *
 * A tie, and a ballot with no evidence either way, goes to U+202F: it is the
 * width the Lexique sets its own pages in, so it is the better default, and
 * breaking the tie toward a fixed side is also what makes `normalize`
 * idempotent. `rules/ballot.ts` states that property once for every style that
 * has one, and here it is what puts the narrow space first in this array.
 *
 * The candidates are the widths themselves rather than names for them, so a
 * verdict is already the string a repair is spelled in and there is no table
 * between the two to get out of step.
 */
const width = ballot({
  candidates: [NARROW_NO_BREAK, NO_BREAK],
  pattern: new RegExp(BALLOT, 'gs'),
  // Most of what sits in these positions is an ordinary character and abstains.
  // Only the two no-break spaces are votes, which is why the pattern captures
  // whatever is there rather than only the widths: a position holding a breaking
  // space is evidence of a defect, not evidence for a width.
  vote: (m) => {
    const space = m[1] ?? m[2] ?? m[3];
    if (space === NO_BREAK) return NO_BREAK;
    return space === NARROW_NO_BREAK ? NARROW_NO_BREAK : null;
  },
});

/**
 * Which no-break space this text already uses, and so which one a repair to it
 * should be spelled in.
 *
 * The unit is the value the caller passed, which for `typocheck` is a whole file
 * and for a translation harness is one field. That is the right grain in both
 * cases and it is not the same grain: a registry normalized field by field can
 * still be inconsistent across rows, which is the defect the harness this was
 * extracted from exists to catch one level up. `surveyWidth` and `withWidth`
 * below are that level up; this one still decides per value, which is what keeps
 * `fr` itself exactly as it was.
 *
 * A `Spelling` rather than a function, so the rules built on it stamp
 * differently from the rules `withWidth` builds by imposing a width. The two
 * produce identical patterns, so without this the two eras would share an id.
 */
const houseWidth = conform(width);

const rules: readonly Rule[] = [
  // The shared builder carries the pattern and the narrowing that makes it safe.
  // What is French about it is the measurement: the corpus this style was
  // extracted from split 711/974 between the straight and the curly form across
  // 2,125 rows, with 4 rows carrying both.
  apostrophe({
    language: 'French',
    wrong: `[']`,
    cite: `${LEXIQUE}, "Apostrophe"`,
  }),

  colonSpacing({
    cite: `${LEXIQUE}, "Ponctuation"`,
  }),

  // The Lexique specifies the fine space here and the publishers measured use
  // U+00A0 for 610 of 612 of them, so this rule converts the breaking space and
  // leaves the choice of width to the document. Before the narrowing it wrote
  // U+202F unconditionally, which was one defect short of the guillemet problem:
  // rarer only because a breaking space before `;` is rarer than a guillemet, not
  // because the reasoning was any better. `admissible` is what holds it off, the
  // same field and the same argument as in the two guillemet rules below.
  requireSpaceBeforePunctuation({
    summary: 'Breaking space before `; ! ?`; French requires a no-break space',
    cite: `${LEXIQUE}, "Ponctuation"`,
    spaces: ANY_SPACE_OR_THIN,
    admissible: NO_BREAK_SPACE,
    marks: HIGH_PUNCTUATION,
    spelling: houseWidth,
  }),

  // The two inserting rules, and the two members of the inner-space family that
  // require the space the other four styles delete. What licenses inserting at
  // all is that a guillemet with no space inside it is wrong however it got
  // there; what the rules no longer do is rewrite a correct guillemet into the
  // other correct spelling, which is what `admissible` holds off. See the
  // header: that behaviour produced 3,231 findings on one corpus and 0 real
  // defects among them.
  //
  // **`guard: false` is a known defect, deliberately left.** `fr` has the hazard
  // `es@0.1.0` had, in the milder form: it reads the `\u00AB` of a German
  // `\u00BBWort\u00AB und` as an opening mark and rewrites the word spaces
  // outside the quotation into a no-break space rather than deleting them, so
  // nothing is welded. Turning the guard on moves `fr@0.2.0` to `fr@0.3.0` and
  // splits 2.4M characters of French corpus into a new era for a hazard no
  // French corpus contains. `FOLLOW-UPS.md` 1b holds the decision. It is a
  // visible `false` here and it was an absent lookaround before, which is a
  // large part of what this extraction is worth.
  innerSpace({
    summary: 'Opening guillemet whose inner space is breaking, doubled or missing',
    cite: `${LEXIQUE}, "Guillemets"`,
    mark: '\u00AB',
    side: 'open',
    spaces: ANY_SPACE_OR_THIN,
    correct: { admissible: NO_BREAK_SPACE, spelling: houseWidth },
    guard: false,
  }),

  innerSpace({
    summary: 'Closing guillemet whose inner space is breaking, doubled or missing',
    cite: `${LEXIQUE}, "Guillemets"`,
    mark: '\u00BB',
    side: 'close',
    spaces: ANY_SPACE_OR_THIN,
    correct: { admissible: NO_BREAK_SPACE, spelling: houseWidth },
    guard: false,
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

  // The rule this style has instead of a ruling on the width. Neither spelling is
  // a defect and using both in one document is, which is a claim the citation
  // supports precisely because it does not fix a width: the Lexique sets its own
  // pages in the fine space and specifies the word space at p.149, so a document
  // is entitled to either and not to both.
  //
  // The pattern is `BALLOT` restricted to the two widths. The ballot counts
  // whatever character occupies those three positions, because a breaking space
  // there is evidence of a defect rather than evidence for a width; this rule
  // reports only the positions actually spelled in the losing width.
  minorityReport({
    id: 'mixed-no-break-space',
    summary: 'Both U+00A0 and U+202F used inside guillemets or before `; ! ?`',
    cite: `${LEXIQUE}, "Guillemets" and "Ponctuation"`,
    ballot: width,
    pattern: new RegExp(
      `(?<=\u00AB)(${NO_BREAK_SPACE})|(${NO_BREAK_SPACE})(?=\u00BB)|(${NO_BREAK_SPACE})(?=[;!?])`,
      'g',
    ),
    spelling: (match) => match[1] ?? match[2] ?? match[3],
  }),

  // The colon is back in scope here, and deliberately: this rule is about the
  // space that is absent, and French requires one before all four marks. It is
  // only *which* no-break space that the colon is exempt from.
  missingPunctuationSpace({
    cite: `${LEXIQUE}, "Ponctuation"`,
  }),

  // Check-only in every style that has it, for the reason the builder states:
  // the two ends are the same character, so choosing between an opening and a
  // closing guillemet is a parse. French is the one style here with a single
  // admissible pair, and it still cannot say which end it is looking at.
  straightDoubleQuote({
    instead: 'French quotation marks are the guillemets',
    cite: `${LEXIQUE}, "Guillemets"`,
  }),
];

/**
 * The French style.
 *
 * `normalize` is the five fixable rules in the order above and nothing else. It
 * satisfies `translation-harness`'s `job.normalize` structurally, so a host
 * binds it without either package importing the other.
 *
 * The stamp is derived from the rule list, so the narrowing this file's header
 * describes moved it without anybody deciding to, and the two `withWidth`
 * derives below carry stamps of their own for the same reason.
 */
export const fr: Style = compose({
  name: 'fr',
  lang: 'fr',
  standard: 'Imprimerie nationale',
  rules,
});

export default fr;

// ---------------------------------------------------------------------------
// Corpus-wide width: for a host normalizing many values
// ---------------------------------------------------------------------------
//
// Everything above decides per value, and for `typocheck`, whose value is a
// whole file, that is the end of it. A translation harness passes one field at a
// time, and there the per-value ballot leaves a real hole: row 1 settles on
// U+00A0 and row 2 on U+202F, each correct alone, and the registry splits. That
// is the defect this module was extracted from a harness to catch, reintroduced
// one level up, and no consumer can close it from outside because the ballot is
// private and a host reimplementing it would drift from the style the first time
// a rule changed.
//
// The two functions below close it, and they are deliberately two rather than
// one. `surveyWidth` reports; `withWidth` acts on the report. Keeping them apart
// is the same stance the style takes everywhere else: this package can say what a
// corpus does and it cannot say what a corpus should do, because the citation
// does not fix a width. `fr.mixed-no-break-space` already reserves that decision
// for the author, and a host surveying its own registry is the author making it.

/** What a corpus's ballot came to. `minority` is null when the corpus uses at
 * most one width, which is the answer a host wants to see. */
export interface WidthSurvey {
  /** Positions spelled with U+00A0. */
  readonly full: number;
  /** Positions spelled with U+202F. */
  readonly narrow: number;
  /** The width the corpus settles on, by the same count and the same tiebreak
   * `normalize` applies to a single value. */
  readonly verdict: string;
  /** The width the corpus uses but did not settle on, or null if it uses at
   * most one. Non-null is the split worth reporting. */
  readonly minority: string | null;
  /** How many positions are spelled in the minority width. Zero when there is
   * no minority, so this is the number of values-worth of drift a host would
   * repair by imposing `verdict`. */
  readonly minorityCount: number;
}

/**
 * Fold the ballot across many values.
 *
 * This is `houseWidth` at corpus grain, and it is the same ballot rather than a
 * second implementation of it: `tally` is additive, so summing per-value tallies
 * is exactly tallying the concatenation. A host runs this over its registry
 * once, reports the split, and decides.
 *
 * Reporting is often the whole use. A corpus with `minority === null` is already
 * consistent and needs nothing done to it; `minorityCount` on a split corpus is
 * the size of the problem, and it is the number a host should look at before
 * reaching for `withWidth`, because harmonizing rewrites text that is correct.
 */
export function surveyWidth(values: Iterable<string>): WidthSurvey {
  const counts = width.fold(values);
  const minority = width.minority(counts)[0] ?? null;
  return {
    full: counts[NO_BREAK],
    narrow: counts[NARROW_NO_BREAK],
    verdict: width.verdict(counts),
    minority,
    minorityCount: minority === null ? 0 : counts[minority],
  };
}

/**
 * The patterns above, widened to match a correct guillemet spelled in the other
 * admissible width.
 *
 * **This is the part that is not just a pinned `choose`, and the reason matters.**
 * The shipped rules pass an `admissible` set to exclude *both* correct
 * spellings, which is the narrowing that took `fr` from 6,817 false positives to
 * 103. So pinning `choose` to a fixed width changes nothing at all: the rows
 * that split a corpus are correct-in-the-other-width, the shipped patterns do
 * not match them, and `choose` is never consulted. A width imposed that way is a
 * silent no-op, which is worse than not offering one.
 *
 * So these pass `admissible: null` and take the run unconditionally. That is
 * `fr@0.1.0` behaviour, re-admitted on purpose and reachable only through
 * `withWidth`, where a host has stated the width. Still linear: the mark and the
 * run anchor make each run a candidate once, and there is still one way to match
 * it. `admissible: null` is the only thing separating these from the shipped
 * pair, which is the clearest statement of what the narrowing actually was.
 */
function harmonizingRules(width: string): readonly Rule[] {
  return [
    requireSpaceBeforePunctuation({
      summary: `Space before \`; ! ?\` that is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Ponctuation"`,
      spaces: ANY_SPACE_OR_THIN,
      admissible: null,
      marks: HIGH_PUNCTUATION,
      spelling: impose(width),
    }),
    innerSpace({
      summary: `Opening guillemet whose inner space is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Guillemets"`,
      mark: '«',
      side: 'open',
      spaces: ANY_SPACE_OR_THIN,
      correct: { admissible: null, spelling: impose(width) },
      guard: false,
    }),
    innerSpace({
      summary: `Closing guillemet whose inner space is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Guillemets"`,
      mark: '»',
      side: 'close',
      spaces: ANY_SPACE_OR_THIN,
      correct: { admissible: null, spelling: impose(width) },
      guard: false,
    }),
  ];
}

/**
 * A French style that spells one width at every position where the width was ever
 * in question, for a host that has surveyed its corpus and settled it.
 *
 * Use it with `surveyWidth`: survey the registry once, then normalize every
 * value under the one verdict. Per-value behaviour is unchanged for everyone
 * else, because this returns a new style and does not touch `fr`.
 *
 * **The positions are the three on the ballot** - inside an opening guillemet,
 * inside a closing one, and before `; ! ?` - and they are the three because they
 * are exactly what `BALLOT` counts, so a corpus normalized here is consistent by
 * the same measure `surveyWidth` reported it as split by. The space before a
 * colon stays U+00A0 under either width, and is not an exception to tidy away
 * later: it is the one position where nothing is in dispute, the Lexique
 * specifies the word space and the corpora use it 2,458 times against no
 * counter-example. Imposing U+202F there would be this style asserting what its
 * citation does not fix, in the one function whose whole subject is the
 * difference between those two things.
 *
 * **Three different stamps, and that is the load-bearing part.** A corpus
 * normalized by one of these has had correct text retyped into the imposed
 * width; one normalized by `fr` has not; and the two widths retype it in
 * opposite directions. Those are three typography eras by exactly the argument
 * that separated the first version of this style from the second, and one stamp
 * across them would say the corpora were set the same way.
 *
 * The stamp used to say so by hand, as `fr@0.2.0+house-00A0`. It says so by
 * construction now: `impose(U+00A0)` and `impose(U+202F)` sign differently, the
 * dropped rule is one fewer signature in the list, and the hash moves for all of
 * it without anybody choosing a suffix. That is worth reading twice, because the
 * two harmonizing rule sets build **character-for-character identical
 * patterns** - the width is in the `Spelling` and nowhere else - so a stamp
 * hashed over patterns alone would have quietly said the two eras were one.
 * `rules/spelling.ts` exists for that sentence.
 *
 * `mixed-no-break-space` is **not** in this style. Its whole content is that
 * choosing a width is the author's call, and reaching this function is the
 * author making it. It would also now be a lie in the report: it is check-only,
 * so every finding carries `fixable: false`, while this style's `normalize`
 * repairs every position it detects. The three rules above cover the same three
 * ballot positions exactly, so nothing is lost by dropping it.
 *
 * Throws on any width other than the two the standard admits. U+2009 is the
 * reason: it is the right width and it breaks lines, so a host that reached for
 * it would be imposing a defect on every value it owns.
 */
export function withWidth(width: string): Style {
  if (width !== NO_BREAK && width !== NARROW_NO_BREAK)
    throw new Error(
      'withWidth: the width must be NO_BREAK (U+00A0) or NARROW_NO_BREAK (U+202F). ' +
        'Those are the two spellings the Lexique admits, and nothing else is a no-break space.',
    );

  // The three override verbs, and this is what they are for: `replace` and
  // `drop` both throw if `fr` stops having the rule they name, so a rule renamed
  // upstairs breaks this function rather than silently turning it into a style
  // that imposes nothing. The hand-rolled `flatMap` this replaces did the same
  // work and would have carried on doing it with an id that no longer matched.
  return derive(fr, {
    replace: harmonizingRules(width),
    drop: ['mixed-no-break-space'],
  });
}
