// Dutch orthotypography, per the Nederlandse Taalunie.
//
// The centre of gravity here is different from the other three styles, and the
// difference is the point rather than a gap. French, Spanish and German each
// have a national standard that rules on quotation marks, so each of those styles
// leads with them. Dutch does not. The Taalunie's Technische Handleiding is a
// *spelling* standard: it fixes where an apostrophe goes and says nothing about
// spacing or about quotation marks, and Taaladvies.net, which does cover both,
// says outright that there is no rule to state:
//
//     Er zijn geen vaste regels voor het gebruik van enkele of dubbele
//     aanhalingstekens.
//
// So this style has no rule about which quotation marks Dutch uses, because there
// is nothing to cite. What it has instead is `nl.mixed-quotation-marks`, and the
// same sentence that removes the first rule licenses that one:
//
//     We raden aan om consequent voor één systeem te kiezen.
//
// That is the `fr.mixed-no-break-space` stance arrived at from the other
// direction. French had to infer a consistency claim from a standard that
// declines to fix a width; Dutch is told to be consistent in as many words. A
// style must not assert what its citation does not fix, and a citation that fixes
// only consistency yields a rule about consistency and no other.
//
// **Why there is no `withStyle` here, and this is the measured part.** `fr`
// offers `withWidth` so a host that has surveyed its corpus can impose one
// no-break space everywhere. The analogue would impose one quotation system, and
// it cannot be written safely: U+2019 is both the closing single quotation mark
// and the apostrophe. Across the Technische Handleiding's own 427,000 characters
// there are 537 of them, and the opening marks pair with exactly 144, so 393 are
// apostrophes. A style that harmonised `‘…’` into `“…”` would retype those 393 as
// closing double quotes. Changing a width is a substitution; changing a
// quotation system is a parse, which is the reason every style here already
// declines to repair a straight double quote.
//
// Citations are to the Technische Handleiding (oktober 2016) for spelling and to
// Taaladvies.net for punctuation. Taaladvies disclaims binding force, which is a
// real weakness in two of these citations and is recorded in
// `docs/provenance.md` rather than hidden: it is the joint advisory service of the Taalunie, the
// Instituut voor de Nederlandse Taal and Onze Taal, and it is the most
// authoritative statement that exists on Dutch punctuation, because the treaty
// body declined to make one.

import { compose } from '../compose.ts';
import { LEFT_SINGLE_QUOTE, type Rule, type Style } from '../pack.ts';
import { apostrophe } from '../rules/apostrophe.ts';
import { apostropheAfterSymbol } from '../rules/apostrophe-after-symbol.ts';
import { apostropheElision } from '../rules/apostrophe-elision.ts';
import { ballot } from '../rules/ballot.ts';
import { ijCapital } from '../rules/ij-capital.ts';
import { minorityReport } from '../rules/minority-report.ts';
import { spaceBeforePunctuation } from '../rules/space-before-punctuation.ts';
import { straightDoubleQuote } from '../rules/straight-double-quote.ts';

const HANDLEIDING = 'Nederlandse Taalunie, Technische Handleiding (oktober 2016)';
const TAALADVIES = 'Taaladvies.net (Nederlandse Taalunie, INT, Onze Taal)';

// U+2018 opens a quotation in Dutch and is never a weglatingsteken, which is
// what makes the rules below able to convert it: across the Technische
// Handleiding all 144 of them open a quotation and none stands in for an elided
// letter. Software that "smartens" a leading straight quote produces it in
// apostrophe position anyway, and that is the defect those rules are for.

/** Everything that turns up where a Dutch apostrophe belongs and is not one. */
const WRONG_APOSTROPHE = `['${LEFT_SINGLE_QUOTE}]`;

/** The three families of quotation mark that occur in Dutch, keyed by the mark
 * that opens each. The opener is the discriminator and the closer cannot be:
 * U+201D closes both double families, and U+2019 closes the single family while
 * also being the apostrophe. */
const OPENERS = {
  /** U+2018 ... U+2019, the high single pair. */
  single: '‘',
  /** U+201C ... U+201D, the high double pair. */
  double: '“',
  /** U+201E ... U+201D, the low-high pair. Onze Taal calls it "hoe langer hoe
   * meer in onbruik" while noting that some newspapers still set it, and it
   * occurs nowhere in any Dutch source measured for this style, including the
   * Taalunie's own document. It is here because a corpus that does use it is
   * consistent, not defective, and a ballot that could not see it would report
   * every quotation in such a document as a minority of one. */
  low: '„',
} as const;

/**
 * A mark in opening position: not preceded by a letter or a digit, and followed
 * by something other than a space.
 *
 * The guard is what keeps the ballot honest about U+2018. A `‘` sitting between
 * two letters is a mis-set apostrophe, which `nl.apostrophe` repairs, and
 * counting it as a vote for the single-quote family would let a document's
 * apostrophes decide which quotation system it uses.
 */
const OPENING = `(?<![\\p{L}\\p{N}])([${OPENERS.single}${OPENERS.double}${OPENERS.low}])(?=[^\\s])`;

/**
 * The three systems, in precedence order, as the marks that open them.
 *
 * The order breaks a tie, and only its last place is cited: Onze Taal records
 * the low pair as falling out of use, so a document that uses it exactly as
 * often as a high pair is likelier to be drifting out of it than into it.
 * Between the two high pairs the order is arbitrary and stable, which is all a
 * check-only rule needs it to be. Nothing is rewritten on the strength of this,
 * so an arbitrary tiebreak costs a reader one report on a document that is
 * genuinely using two systems in equal measure and is inconsistent either way.
 *
 * The same shared ballot `fr` counts no-break spaces with. Two languages, one
 * counting two widths and one counting three quotation systems, turned out to be
 * one machine with two alphabets: `rules/ballot.ts`.
 */
const PRECEDENCE = [OPENERS.double, OPENERS.single, OPENERS.low] as const;

type Opener = (typeof PRECEDENCE)[number];

function isOpener(mark: string | undefined): mark is Opener {
  return PRECEDENCE.includes(mark as Opener);
}

const system = ballot({
  candidates: PRECEDENCE,
  pattern: new RegExp(OPENING, 'gu'),
  // The class in `OPENING` holds exactly these three, so nothing abstains. The
  // check is here because a widened class that forgot to widen the candidates
  // would otherwise vote for a mark that is not standing.
  vote: (m) => (isOpener(m[1]) ? m[1] : null),
});

const rules: readonly Rule[] = [
  // Dutch reaches for the apostrophe far more often than French or German,
  // because the plural of a vowel-final noun takes one: `auto's`, `baby's`,
  // `taxi's` are 129 of the 287 letter-to-letter apostrophes in the standard's
  // own text.
  //
  // The wide class is what makes this the one caller that passes anything but
  // `[']`, and it is the only style here that may. In French and German a stray
  // U+2018 is a mis-paired quotation mark and the repair is to pair it; in
  // Dutch, between two letters, it can only be a weglatingsteken that a
  // smart-quote pass turned the wrong way, since the standard uses U+2018 to
  // open a quotation 144 times and as an apostrophe never.
  //
  // The wide class has since been held against a register nobody wrote with this
  // checker in mind: 976,000 characters of Dutch statute contain 101 correctly
  // set letter-to-letter apostrophes, all of them the vowel-final plural
  // (`risico's`, `CSIRT's`, `video's`), and not one straight mark or U+2018 in
  // that position. The rule left all 101 alone. `docs/provenance.md` has the run.
  apostrophe({
    language: 'Dutch',
    wrong: WRONG_APOSTROPHE,
    cite: `${HANDLEIDING}, hoofdstuk 11 "Het weglatingsteken"`,
  }),

  // `'s morgens`, `'t huis`, `'n keer`, `'s-Gravenhage`. English is the only
  // other style here that elides at the front of a word, and what the two share
  // is the hazard rather than the words: the builder holds why a closed set and
  // a required boundary are the whole of what makes this safe.
  //
  // `ns` leads the alternation because the engine takes the first branch that
  // matches, and `n` alone would strand the `s` of `'ns`.
  //
  // Both halves are measured, on a small denominator and in the one place it
  // mattered: Dutch statute sets `’s avonds`, `’s ochtends` and
  // `’s Rijksbelastingen` correctly and the rule left all three alone, while the
  // Waterwet sets the last of those with a straight mark and the rule repaired
  // it. One publisher, one phrase, two spellings, which is the uniformity claim
  // arriving in published law rather than in a model's output.
  apostropheElision({
    wrong: WRONG_APOSTROPHE,
    clitics: '(?:ns|[stnkmr])',
    // A hyphen, for `'s-Gravenhage`, which is a word rather than a sentence and
    // is why Dutch does not close a clitic at the end of a value.
    boundary: '[ \\-]',
    examples: ['s', 't'],
    cite: `${HANDLEIDING}, hoofdstuk 11 "Het weglatingsteken"`,
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

  // The standard sets 18 of these and 7 more after `@ & +`, which is what makes
  // it worth a rule in a style this small.
  //
  // Unmeasured outside that standard, and knowing which rules are is the point:
  // two Dutch corpora, 1.86M characters, contain nothing this rule could match in
  // either spelling, so its silence in both is worth nothing. `A4'tje` is not a
  // thing legislation or advice prose has occasion to write.
  apostropheAfterSymbol({
    wrong: WRONG_APOSTROPHE,
    cite: `${HANDLEIDING}, paragraaf 11.5`,
  }),

  // The rule this style has instead of a ruling on quotation marks, and the
  // second instance in this package of a standard declining to choose. Where
  // `fr.mixed-no-break-space` infers its claim from a standard that specifies one
  // width and typesets another, this one is told: Taaladvies says there are no
  // fixed rules and then recommends picking one system and keeping to it.
  //
  // Unlike French, this style ballots and reports over the same pattern. Every
  // mark in opening position is both a vote and a candidate for the report,
  // because a mark is either one of the three systems or not a quotation mark.
  //
  // **A ballot rule cannot be measured one unit at a time**, which is worth
  // knowing before running it past a corpus and believing the zero. It counts a
  // document and reports the minority, so a per-unit run hands it one unit's
  // worth of votes and it can never report anything, whatever the corpus does.
  // The same is true of a sample given to `audit`. Measured that way, 976,000
  // characters of Dutch statute turn out to contain no quotation mark of any of
  // the three systems at all: legislation defines rather than quotes, so this
  // rule's zero there is vacuous and no amount of further statute changes that.
  minorityReport({
    id: 'mixed-quotation-marks',
    summary: 'More than one system of quotation marks used in the same text',
    cite: `${TAALADVIES}, "Dubbele of enkele aanhalingstekens bij een citaat"`,
    ballot: system,
    pattern: new RegExp(OPENING, 'gu'),
    spelling: (match) => match[1],
  }),

  // The least measured rule in the package, and the reason is a fact about
  // registers rather than about the rule. Two Dutch corpora, 1.86M characters,
  // put two words in front of it, `IJsselmeer` and `IJssel`. A bigger corpus of
  // the same kind will not help: the Omgevingswet is the largest statute in Dutch
  // law and those two words are its whole contribution, because legislation names
  // ministries and not places. What would measure this cheaply is geography or
  // journalism, and until it does, its zero is not evidence of anything.
  ijCapital({
    cite: `${HANDLEIDING}, paragraaf 2.4`,
  }),

  // Worth having in a Dutch style specifically, which is not obvious from a
  // standard that says nothing about spacing. Dutch and French are in daily
  // contact in Belgium, and French spacing carried into Dutch is a defect under
  // the Belgian half of the Taalunie's own authority rather than a Belgian
  // convention, which is why this is one style and not `nl-BE` plus `nl-NL`.
  //
  // The best-measured rule this style has, and the register it was measured in is
  // the reason: Dutch statute enumerates, so 976,000 characters of it put 1,498
  // letter-to-`; : ! ?` positions in front of this rule and it reported none of
  // them.
  spaceBeforePunctuation({
    language: 'Dutch',
    cite: `${TAALADVIES}, "Wel of geen spaties voor en na leestekens en symbolen"`,
  }),

  // Dutch has three admissible pairs to choose between rather than two, with
  // nothing in any citation that would settle which, so the parse the builder
  // declines to attempt is one branch wider here than anywhere else.
  //
  // Half measured, and the half that is missing is the one that matters. The
  // Gemeentewet sets its oath formulae with ASCII double quotes and this rule
  // reports all four, so recall holds in published law; but no curly mark stands
  // anywhere in 976,000 characters of statute, so nothing there measures whether
  // it would have left a correct pair alone.
  straightDoubleQuote({
    instead: 'Dutch quotation marks are a matched curly pair',
    cite: `${TAALADVIES}, "Dubbele of enkele aanhalingstekens bij een citaat"`,
  }),
];

/**
 * The Dutch style.
 *
 * One style and no regions, unlike German. The Taalunie is a treaty body whose
 * spelling binds the Netherlands, Flanders and Suriname alike, so there is no
 * second Dutch convention for a tag to name - which is the same test that gives
 * German two styles and gives this one none.
 *
 * `normalize` carries the two apostrophe rules and none of the five detections.
 */
export const nl: Style = compose({
  name: 'nl',
  lang: 'nl',
  standard: 'Nederlandse Taalunie',
  rules,
});

export default nl;
