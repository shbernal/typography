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
// what Swiss practice prescribes. So this pack does not pretend to a width the
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

import {
  composeNormalize,
  conformRule,
  detectRule,
  NARROW_NO_BREAK,
  NO_BREAK,
  RIGHT_SINGLE_QUOTE,
  type Rule,
  replaceRule,
  THIN,
  type TypographyPack,
} from './pack.ts';

const LEXIQUE = 'Imprimerie nationale, Lexique des règles typographiques (2002)';

/** Bumps when a rule changes, and never for a release that does not touch one.
 * This is the era stamp a corpus gets tagged with, so a version that moved for a
 * README fix would split a corpus into two eras that are in fact identical.
 *
 * 0.2.0 narrowed the two guillemet rules and `fr.space-before-high-punctuation`
 * from a fixed U+202F to whichever no-break space the document uses, and added
 * `fr.mixed-no-break-space`. A corpus normalized under `fr@0.1.0` had the inside
 * of every quotation retyped and one under `fr@0.2.0` did not, so the two are
 * genuinely different eras of this pack. */
const VERSION = '0.2.0';

/** Space, U+00A0, U+202F and U+2009: everything that turns up between a
 * guillemet and the word beside it in text that reaches this package. */
const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}${THIN}]`;

/** The two that break a line, and so are wrong in these positions under every
 * reading of the standard. U+2009 is the interesting one: right width, wrong
 * behaviour, so it survives proofreading and comes apart when the text reflows. */
const BREAKABLE = `[ ${THIN}]`;

/** The two admissible spellings of the no-break space this pack has to choose
 * between, and never a third. */
const NO_BREAK_SPACE = `[${NO_BREAK}${NARROW_NO_BREAK}]`;

/**
 * The run of spaces beside a guillemet is wrong unless it is exactly one
 * no-break space. That one sentence covers all three defects - a breaking space
 * anywhere in the run, more than one space, no space at all - and exactly one
 * U+00A0 and exactly one U+202F are what it leaves out, which is the whole of
 * what the corpora taught this pack.
 *
 * **How it is spelled matters as much as what it says.** The direct translation
 * enumerates the three defects as an alternation:
 *
 *     (?:ANY_SPACE*BREAKABLE ANY_SPACE*|ANY_SPACE{2,}|absent)
 *
 * `BREAKABLE` is a subset of `ANY_SPACE`, so the first branch can split a run of
 * spaces at every position in it and the second can re-match what the first gave
 * up. Against a run with no guillemet after it the engine walks that ambiguity:
 * 800 ordinary spaces took 242 ms, 1,600 took 1.5 s, and a single padded
 * 3,000-space line took 15 s. Nothing hostile is required to produce one - an
 * indented block or a wrapped table will do - and this package's own security
 * policy calls a pattern that behaves this way a vulnerability in it.
 *
 * So the rules below take the run *once*, greedily, with no second way to match
 * it, and carry the exception as a lookahead at the position where the run
 * begins. Nothing to backtrack means linear, and `test/perf.test.ts` holds it
 * there rather than trusting this comment.
 */
const CORRECT_AFTER_OPEN = `(?!${NO_BREAK_SPACE}(?!${ANY_SPACE}))`;
const CORRECT_BEFORE_CLOSE = `(?!${NO_BREAK_SPACE}»)`;

/** The start of a space run, so a run is a candidate once rather than once per
 * character in it. Without this the close rule is quadratic even with an
 * unambiguous body, because every position inside a run starts a fresh scan. */
const RUN_START = `(?<!${ANY_SPACE})`;

/** Every position where this pack has an opinion about *which* no-break space to
 * use. The colon is deliberately not here: the Lexique specifies the word space
 * before it, both corpora agree with the Lexique 2,458 times and contradict it
 * never, and a rule with nothing in dispute does not need a ballot. */
const BALLOT = `(?<=\u00AB)(.)|(.)(?=\u00BB)|(.)(?=[;!?])`;

/** How many of each width voted. Additive: the tally of two values concatenated
 * is the tally of one plus the tally of the other, which is the whole reason
 * `surveyWidth` can fold a corpus without re-deriving the ballot. */
interface Ballot {
  readonly full: number;
  readonly narrow: number;
}

function tally(value: string): Ballot {
  let full = 0;
  let narrow = 0;
  for (const m of value.matchAll(new RegExp(BALLOT, 'gs'))) {
    const space = m[1] ?? m[2] ?? m[3];
    if (space === NO_BREAK) full++;
    else if (space === NARROW_NO_BREAK) narrow++;
  }
  return { full, narrow };
}

/**
 * Which width a ballot settles on.
 *
 * A tie, and a ballot with no evidence either way, goes to U+202F: it is the
 * width the Lexique sets its own pages in, so it is the better default, and
 * breaking the tie toward a fixed side is also what makes `normalize`
 * idempotent. Every fix moves the count further toward the side already chosen
 * and never away from it, so the second pass reaches the same verdict as the
 * first.
 */
function verdictOf({ full, narrow }: Ballot): string {
  return full > narrow ? NO_BREAK : NARROW_NO_BREAK;
}

/** The width a ballot uses but did not settle on, or null if it uses at most
 * one. Null is the ordinary answer and means there is nothing to report. */
function minorityOf(counts: Ballot): string | null {
  if (counts.full === 0 || counts.narrow === 0) return null;
  return verdictOf(counts) === NO_BREAK ? NARROW_NO_BREAK : NO_BREAK;
}

/**
 * Which no-break space this text already uses, and so which one a repair to it
 * should be spelled in.
 *
 * The unit is the value the caller passed, which for `typocheck` is a whole file
 * and for a translation harness is one field. That is the right grain in both
 * cases and it is not the same grain: a registry normalized field by field can
 * still be inconsistent across rows, which is the defect the harness this was
 * extracted from exists to catch one level up. `surveyWidth` and `withWidth`
 * below are that level up; this function is unchanged and still decides per
 * value, which is what keeps `fr` itself exactly as it was.
 */
function houseWidth(value: string): string {
  return verdictOf(tally(value));
}

/** The width this text uses but did not settle on, or null if it uses only one. */
function minorityWidth(value: string): string | null {
  return minorityOf(tally(value));
}

const rules: readonly Rule[] = [
  replaceRule({
    id: 'fr.apostrophe',
    summary: `Straight apostrophe between letters; French uses U+2019`,
    cite: `${LEXIQUE}, "Apostrophe"`,
    // Requiring a letter on *both* sides is the whole rule. It keeps the
    // substitution off a quote character used as a quote, an apostrophe inside a
    // preserved code token, and anything adjacent to a digit or a bracket. The
    // corpus this came from split 711/974 between the straight and curly forms
    // across 2,125 rows, with 4 rows carrying both.
    pattern: /(?<=\p{L})'(?=\p{L})/gu,
    replacement: RIGHT_SINGLE_QUOTE,
  }),

  replaceRule({
    id: 'fr.space-before-colon',
    summary: 'Breaking space before a colon; French requires U+00A0',
    cite: `${LEXIQUE}, "Ponctuation"`,
    // Converts and never inserts. Inserting before a colon would fire on every
    // `https://`, and there is no way to tell a French sentence from a URL with
    // a lookbehind. What a real corpus holds is the space already (137 rows in
    // the corpus above), so conversion is the whole measured defect.
    //
    // The only rule here that still names a width outright, because it is the
    // only one where nothing is in dispute: the Lexique says the word space and
    // the published corpora use it 2,458 times against no counter-example.
    pattern: / (?=:)/g,
    replacement: NO_BREAK,
  }),

  conformRule({
    id: 'fr.space-before-high-punctuation',
    summary: 'Breaking space before `; ! ?`; French requires a no-break space',
    cite: `${LEXIQUE}, "Ponctuation"`,
    // The Lexique specifies the fine space here and the publishers measured use
    // U+00A0 for 610 of 612 of them, so this rule converts the breaking space
    // and leaves the choice of width to the document. Before the narrowing it
    // wrote U+202F unconditionally, which was one defect short of the guillemet
    // problem: rarer only because a breaking space before `;` is rarer than a
    // guillemet, not because the reasoning was any better.
    //
    // U+2009 is in scope and U+00A0 and U+202F are not: the first breaks lines
    // and the other two do not, which is the property the standard is about.
    pattern: new RegExp(`${BREAKABLE}(?=[;!?])`, 'g'),
    choose: houseWidth,
  }),

  conformRule({
    id: 'fr.guillemet-open',
    summary: 'Opening guillemet whose inner space is breaking, doubled or missing',
    cite: `${LEXIQUE}, "Guillemets"`,
    // The one inserting rule, licensed only because guillemets are unambiguous:
    // there is no other construction to mistake them for, and a guillemet with
    // no space inside it is wrong however it got there.
    //
    // What it no longer does is rewrite a correct guillemet to the other correct
    // spelling. See the header: that behaviour produced 3,231 findings on one
    // corpus and 0 real defects among them.
    //
    // `\u00AB` fixes where the run starts, the lookahead rejects the one correct
    // spelling, and `ANY_SPACE*` then takes the rest with nothing after it to
    // backtrack for.
    pattern: new RegExp(`\u00AB${CORRECT_AFTER_OPEN}${ANY_SPACE}*`, 'g'),
    choose: (value) => `\u00AB${houseWidth(value)}`,
  }),

  conformRule({
    id: 'fr.guillemet-close',
    summary: 'Closing guillemet whose inner space is breaking, doubled or missing',
    cite: `${LEXIQUE}, "Guillemets"`,
    // The mirror, with the run anchored on its left instead of by `\u00AB`. The
    // no-space case is the position of `\u00BB` itself, where the run is empty and
    // the lookbehind reads the character before it.
    pattern: new RegExp(`${RUN_START}${CORRECT_BEFORE_CLOSE}${ANY_SPACE}*\u00BB`, 'g'),
    choose: (value) => `${houseWidth(value)}\u00BB`,
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

  detectRule<string | null>({
    id: 'fr.mixed-no-break-space',
    summary: 'Both U+00A0 and U+202F used inside guillemets or before `; ! ?`',
    cite: `${LEXIQUE}, "Guillemets" and "Ponctuation"`,
    severity: 'warning',
    // The rule this pack has instead of a ruling on the width. Neither spelling
    // is a defect and using both in one document is, which is a claim the
    // citation supports precisely because it does not fix a width: the Lexique
    // sets its own pages in the fine space and specifies the word space at
    // p.149, so a document is entitled to either and not to both.
    //
    // Not fixable, and for the same reason `es.unpaired-question` is not: the
    // substitution is obvious and the *decision* is not this package's. On a
    // document near an even split, harmonising would silently retype half of it,
    // which is the failure this whole rule exists to have stopped doing.
    //
    // The survey runs once per value. Counting inside `refine` would be
    // quadratic, and the values here are whole documents.
    pattern: new RegExp(
      `(?<=\u00AB)(${NO_BREAK_SPACE})|(${NO_BREAK_SPACE})(?=\u00BB)|(${NO_BREAK_SPACE})(?=[;!?])`,
      'g',
    ),
    survey: minorityWidth,
    refine: (match, _value, minority) => {
      if (minority === null) return null;
      const space = match[1] ?? match[2] ?? match[3];
      return space === minority ? { index: match.index, length: 1 } : null;
    },
  }),

  detectRule({
    id: 'fr.missing-space-before-high-punctuation',
    summary: 'No space at all before `; : ! ?`, where French requires one',
    cite: `${LEXIQUE}, "Ponctuation"`,
    // This is the French half of the finding that shapes the whole package. The
    // defect is real and common, and inserting the space is not a substitution:
    // `https://`, `C:\\`, `!important`, `?query=` and every port number are the
    // same three characters in a construction that must not be touched.
    //
    // So the pattern is deliberately conservative in both directions. A letter
    // before rules out `12:30` and a bare `:` after a bracket. Whitespace, a
    // closing mark or end-of-string after rules out `!important` and `?utf8`,
    // where the punctuation is carrying syntax rather than ending a sentence.
    // Even so this is the rule most likely to fire on technical prose, which is
    // exactly why it reports and does not rewrite. On the journals corpus 355 of
    // its 355 findings were foreign-language titles in bibliographies.
    pattern: /\p{L}[;:!?](?=[\s»)\]"'’]|$)/gu,
    refine: (match) => ({ index: match.index + 1, length: 1 }),
  }),

  detectRule({
    id: 'fr.straight-double-quote',
    summary: 'Straight double quote; French quotation marks are the guillemets',
    cite: `${LEXIQUE}, "Guillemets"`,
    severity: 'warning',
    // Not fixable, for a reason worth stating: the two ends are the same
    // character, so choosing between an opening and a closing guillemet means
    // tracking pairing across the whole value, and a value may legitimately
    // carry one half of a pair quoted from elsewhere. A `"` inside a code token
    // must also survive, and nothing in a regex can tell one from the other.
    // Warning rather than error for that reason.
    pattern: /"/g,
  }),
];

/**
 * The French pack.
 *
 * `normalize` is the five fixable rules in the order above and nothing else. It
 * satisfies `translation-harness`'s `job.normalize` structurally, so a host
 * binds it without either package importing the other.
 */
export const fr: TypographyPack = {
  id: `fr@${VERSION}`,
  lang: 'fr',
  standard: 'Imprimerie nationale',
  rules,
  normalize: composeNormalize(rules),
};

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
// private and a host reimplementing it would drift from the pack the first time
// a rule changed.
//
// The two functions below close it, and they are deliberately two rather than
// one. `surveyWidth` reports; `withWidth` acts on the report. Keeping them apart
// is the same stance the pack takes everywhere else: this package can say what a
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
  let full = 0;
  let narrow = 0;
  for (const value of values) {
    const counts = tally(value);
    full += counts.full;
    narrow += counts.narrow;
  }
  const counts: Ballot = { full, narrow };
  const minority = minorityOf(counts);
  return {
    full,
    narrow,
    verdict: verdictOf(counts),
    minority,
    minorityCount: minority === null ? 0 : minority === NO_BREAK ? full : narrow,
  };
}

/**
 * The patterns above, widened to match a correct guillemet spelled in the other
 * admissible width.
 *
 * **This is the part that is not just a pinned `choose`, and the reason matters.**
 * `CORRECT_AFTER_OPEN` and `CORRECT_BEFORE_CLOSE` exist to exclude *both*
 * correct spellings, which is the narrowing that took `fr` from 6,817 false
 * positives to 103. So pinning `choose` to a fixed width changes nothing at all:
 * the rows that split a corpus are correct-in-the-other-width, the shipped
 * patterns do not match them, and `choose` is never consulted. A width imposed
 * that way is a silent no-op, which is worse than not offering one.
 *
 * These patterns drop the exclusion and take the run unconditionally. That is
 * `fr@0.1.0` behaviour, re-admitted on purpose and reachable only through
 * `withWidth`, where a host has stated the width. Still linear: `«` and
 * `RUN_START` anchor each run so it is a candidate once, and there is still one
 * way to match it.
 */
function harmonizingRules(width: string): readonly Rule[] {
  return [
    conformRule({
      id: 'fr.space-before-high-punctuation',
      summary: `Space before \`; ! ?\` that is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Ponctuation"`,
      pattern: new RegExp(`${ANY_SPACE}(?=[;!?])`, 'g'),
      choose: () => width,
    }),
    conformRule({
      id: 'fr.guillemet-open',
      summary: `Opening guillemet whose inner space is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Guillemets"`,
      pattern: new RegExp(`«${ANY_SPACE}*`, 'g'),
      choose: () => `«${width}`,
    }),
    conformRule({
      id: 'fr.guillemet-close',
      summary: `Closing guillemet whose inner space is not the corpus's no-break space`,
      cite: `${LEXIQUE}, "Guillemets"`,
      pattern: new RegExp(`${RUN_START}${ANY_SPACE}*»`, 'g'),
      choose: () => `${width}»`,
    }),
  ];
}

/**
 * A French pack that spells one width at every position where the width was ever
 * in question, for a host that has surveyed its corpus and settled it.
 *
 * Use it with `surveyWidth`: survey the registry once, then normalize every
 * value under the one verdict. Per-value behaviour is unchanged for everyone
 * else, because this returns a new pack and does not touch `fr`.
 *
 * **The positions are the three on the ballot** - inside an opening guillemet,
 * inside a closing one, and before `; ! ?` - and they are the three because they
 * are exactly what `BALLOT` counts, so a corpus normalized here is consistent by
 * the same measure `surveyWidth` reported it as split by. The space before a
 * colon stays U+00A0 under either width, and is not an exception to tidy away
 * later: it is the one position where nothing is in dispute, the Lexique
 * specifies the word space and the corpora use it 2,458 times against no
 * counter-example. Imposing U+202F there would be this pack asserting what its
 * citation does not fix, in the one function whose whole subject is the
 * difference between those two things.
 *
 * **The id is a different era stamp, and that is the load-bearing part.** A
 * corpus normalized by this pack has had correct text retyped into the imposed
 * width; one normalized by `fr` has not. Those are two typography eras by
 * exactly the argument that separates `fr@0.1.0` from `fr@0.2.0`, and a stamp
 * that read `fr@0.2.0` on both would say the two corpora were set the same way.
 * So the id carries the width: `fr@0.2.0+house-00A0`.
 *
 * `fr.mixed-no-break-space` is **not** in this pack. Its whole content is that
 * choosing a width is the author's call, and reaching this function is the
 * author making it. It would also now be a lie in the report: it is check-only,
 * so every finding carries `fixable: false`, while this pack's `normalize`
 * repairs every position it detects. The three rules above cover the same three
 * ballot positions exactly, so nothing is lost by dropping it.
 *
 * Throws on any width other than the two the standard admits. U+2009 is the
 * reason: it is the right width and it breaks lines, so a host that reached for
 * it would be imposing a defect on every value it owns.
 */
export function withWidth(width: string): TypographyPack {
  if (width !== NO_BREAK && width !== NARROW_NO_BREAK)
    throw new Error(
      'withWidth: the width must be NO_BREAK (U+00A0) or NARROW_NO_BREAK (U+202F). ' +
        'Those are the two spellings the Lexique admits, and nothing else is a no-break space.',
    );

  const harmonizing = new Map(harmonizingRules(width).map((rule) => [rule.id, rule]));
  const derived = rules.flatMap((rule) =>
    rule.id === 'fr.mixed-no-break-space' ? [] : [harmonizing.get(rule.id) ?? rule],
  );

  return {
    id: `fr@${VERSION}+house-${width === NO_BREAK ? '00A0' : '202F'}`,
    lang: 'fr',
    standard: 'Imprimerie nationale',
    rules: derived,
    normalize: composeNormalize(derived),
  };
}
