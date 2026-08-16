// Dutch orthotypography, per the Nederlandse Taalunie.
//
// The centre of gravity here is different from the other three packs, and the
// difference is the point rather than a gap. French, Spanish and German each
// have a national standard that rules on quotation marks, so each of those packs
// leads with them. Dutch does not. The Taalunie's Technische Handleiding is a
// *spelling* standard: it fixes where an apostrophe goes and says nothing about
// spacing or about quotation marks, and Taaladvies.net, which does cover both,
// says outright that there is no rule to state:
//
//     Er zijn geen vaste regels voor het gebruik van enkele of dubbele
//     aanhalingstekens.
//
// So this pack has no rule about which quotation marks Dutch uses, because there
// is nothing to cite. What it has instead is `nl.mixed-quotation-marks`, and the
// same sentence that removes the first rule licenses that one:
//
//     We raden aan om consequent voor één systeem te kiezen.
//
// That is the `fr.mixed-no-break-space` stance arrived at from the other
// direction. French had to infer a consistency claim from a standard that
// declines to fix a width; Dutch is told to be consistent in as many words. A
// pack must not assert what its citation does not fix, and a citation that fixes
// only consistency yields a rule about consistency and no other.
//
// **Why there is no `withStyle` here, and this is the measured part.** `fr`
// offers `withWidth` so a host that has surveyed its corpus can impose one
// no-break space everywhere. The analogue would impose one quotation system, and
// it cannot be written safely: U+2019 is both the closing single quotation mark
// and the apostrophe. Across the Technische Handleiding's own 427,000 characters
// there are 537 of them, and the opening marks pair with exactly 144, so 393 are
// apostrophes. A pack that harmonised `‘…’` into `“…”` would retype those 393 as
// closing double quotes. Changing a width is a substitution; changing a
// quotation system is a parse, which is the reason every pack here already
// declines to repair a straight double quote.
//
// Citations are to the Technische Handleiding (oktober 2016) for spelling and to
// Taaladvies.net for punctuation. Taaladvies disclaims binding force, which is a
// real weakness in two of these citations and is recorded in `gates/README.md`
// rather than hidden: it is the joint advisory service of the Taalunie, the
// Instituut voor de Nederlandse Taal and Onze Taal, and it is the most
// authoritative statement that exists on Dutch punctuation, because the treaty
// body declined to make one.

import {
  composeNormalize,
  detectRule,
  LEFT_SINGLE_QUOTE,
  RIGHT_SINGLE_QUOTE,
  type Rule,
  replaceRule,
  type TypographyPack,
} from './pack.ts';
import { looksMachine } from './prose.ts';
import { apostrophe } from './rules/apostrophe.ts';
import { spaceBeforePunctuation } from './rules/space-before-punctuation.ts';
import { straightDoubleQuote } from './rules/straight-double-quote.ts';

const HANDLEIDING = 'Nederlandse Taalunie, Technische Handleiding (oktober 2016)';
const TAALADVIES = 'Taaladvies.net (Nederlandse Taalunie, INT, Onze Taal)';

/** Bumps when a rule changes, and never for a release that does not touch one. */
const VERSION = '0.1.0';

// U+2018 opens a quotation in Dutch and is never a weglatingsteken, which is
// what makes the rules below able to convert it: across the Technische
// Handleiding all 144 of them open a quotation and none stands in for an elided
// letter. Software that "smartens" a leading straight quote produces it in
// apostrophe position anyway, and that is the defect those rules are for.

/** Everything that turns up where a Dutch apostrophe belongs and is not one. */
const WRONG_APOSTROPHE = `['${LEFT_SINGLE_QUOTE}]`;

/**
 * The words that may carry a word-initial apostrophe.
 *
 * A closed set, and it has to be closed. Word-initial is the position where a
 * Dutch apostrophe and an opening single quotation mark are the same character
 * in the same place: `'s morgens` is an elision and `'strand'` is a quoted word,
 * and no amount of lookaround distinguishes them in general. What does
 * distinguish them is that the elisions are a short list the standard
 * enumerates - `'s 't 'n 'k 'm 'r 'ns` - and every one of them is a whole word,
 * so a following space or hyphen closes it. `'strand'` fails on both counts:
 * `s` is followed by `t`, not by a boundary.
 *
 * `ns` precedes the single letters in the alternation because the engine takes
 * the first branch that matches, and `n` alone would strand the `s` of `'ns`.
 */
const CLITIC = `(?:ns|[stnkmr])`;

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
   * occurs nowhere in any Dutch source measured for this pack, including the
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

/** How many openings of each family voted. Additive, like the French ballot, so
 * this could be folded across a corpus if a host ever needed it to be. */
interface Ballot {
  readonly single: number;
  readonly double: number;
  readonly low: number;
}

function tally(value: string): Ballot {
  let single = 0;
  let double = 0;
  let low = 0;
  for (const m of value.matchAll(new RegExp(OPENING, 'gu'))) {
    if (m[1] === OPENERS.single) single++;
    else if (m[1] === OPENERS.double) double++;
    else low++;
  }
  return { single, double, low };
}

/**
 * Which system a document settles on.
 *
 * The order below breaks a tie, and only its last place is cited: Onze Taal
 * records the low pair as falling out of use, so a document that uses it exactly
 * as often as a high pair is likelier to be drifting out of it than into it.
 * Between the two high pairs the order is arbitrary and stable, which is all a
 * check-only rule needs it to be. Nothing is rewritten on the strength of this,
 * so an arbitrary tiebreak costs a reader one report on a document that is
 * genuinely using two systems in equal measure and is inconsistent either way.
 */
const PRECEDENCE = ['double', 'single', 'low'] as const;

type Family = (typeof PRECEDENCE)[number];

function verdictOf(counts: Ballot): Family {
  let winner: Family = PRECEDENCE[0];
  for (const family of PRECEDENCE) if (counts[family] > counts[winner]) winner = family;
  return winner;
}

/**
 * The opening marks of every family this text uses but did not settle on, as a
 * character class body, or null when it uses at most one family.
 *
 * Null is the ordinary answer and means there is nothing to report, which is the
 * same shape `fr.mixed-no-break-space` uses and for the same reason: the survey
 * runs once per value, and a value here is a whole document.
 */
function minorityOpeners(value: string): string | null {
  const counts = tally(value);
  const used = PRECEDENCE.filter((family) => counts[family] > 0);
  if (used.length < 2) return null;
  const verdict = verdictOf(counts);
  return used
    .filter((family) => family !== verdict)
    .map((family) => OPENERS[family])
    .join('');
}

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
  apostrophe({
    id: 'nl.apostrophe',
    language: 'Dutch',
    wrong: WRONG_APOSTROPHE,
    cite: `${HANDLEIDING}, hoofdstuk 11 "Het weglatingsteken"`,
  }),

  replaceRule({
    id: 'nl.apostrophe-elision',
    summary: 'Straight quote or U+2018 on a word-initial elision such as `’s` or `’t`',
    cite: `${HANDLEIDING}, hoofdstuk 11 "Het weglatingsteken"`,
    // The rule that has no counterpart in the other three packs, because no
    // other language here elides at the front of a word. `'s morgens`,
    // `'t huis`, `'n keer`, `'s-Gravenhage`.
    //
    // Fixable only because `CLITIC` is closed and the boundary after it is
    // required; see the comment there for what that is holding off. Widening
    // either one turns this into a rule that retypes the opening quotation mark
    // of any quoted word beginning with s, t, n, k, m or r, which is a defect
    // this pack would be introducing rather than finding.
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${WRONG_APOSTROPHE}(?=${CLITIC}[ \\-])`, 'gu'),
    replacement: RIGHT_SINGLE_QUOTE,
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

  detectRule({
    id: 'nl.apostrophe-after-symbol',
    summary: 'Straight quote after a digit or symbol where Dutch takes U+2019',
    cite: `${HANDLEIDING}, paragraaf 11.5`,
    // Dutch attaches a suffix to a number, an initialism or a symbol with an
    // apostrophe: `A4'tje`, `80'ers`, `2'en`, `D66'er`, `65+'er`, `@'je`. The
    // standard sets 18 of these and 7 more after `@ & +`.
    //
    // Check-only, and the reason is the one `es.space-before-punctuation` gives
    // at length. A digit to the left of a straight quote followed by letters is
    // also a sized literal in hardware description languages - `4'b1010`,
    // `8'hFF` - and a foot-and-inch measure is the same three characters again.
    // The letter-to-letter rule above has a lookbehind that separates prose from
    // those; here there is none, because the digit *is* the context. The repair
    // is obvious and it is still not this pack's to make unattended.
    pattern: new RegExp(`(?<=[\\p{N}@&+])${WRONG_APOSTROPHE}(?=\\p{L})`, 'gu'),
    refine: (match, value) =>
      looksMachine(value, match.index) ? null : { index: match.index, length: 1 },
  }),

  detectRule<string | null>({
    id: 'nl.mixed-quotation-marks',
    summary: 'More than one system of quotation marks used in the same text',
    cite: `${TAALADVIES}, "Dubbele of enkele aanhalingstekens bij een citaat"`,
    severity: 'warning',
    // The rule this pack has instead of a ruling on quotation marks, and the
    // second instance in this package of a standard declining to choose. Where
    // `fr.mixed-no-break-space` infers its claim from a standard that specifies
    // one width and typesets another, this one is told: Taaladvies says there
    // are no fixed rules and then recommends picking one system and keeping to
    // it. So the defect is not a mark, it is a document.
    //
    // Not fixable, and here the reason is stronger than it is for French.
    // Choosing between two no-break spaces is a substitution once the choice is
    // made. Choosing between `‘…’` and `“…”` is not, because U+2019 closes the
    // first and is also the apostrophe: see the header for the count. Which
    // system to settle on is the author's call and carrying it out is not a
    // regular expression's job even after they have made it.
    pattern: new RegExp(OPENING, 'gu'),
    survey: minorityOpeners,
    refine: (match, _value, minority) => {
      if (minority === null) return null;
      return minority.includes(match[1]!) ? { index: match.index, length: 1 } : null;
    },
  }),

  detectRule({
    id: 'nl.ij-capital',
    summary: 'Word-initial `Ij`; the Dutch digraph capitalises as `ij` or `IJ`, never `Ij`',
    cite: `${HANDLEIDING}, paragraaf 2.4`,
    // The most Dutch rule in this package and a clean instance of the shape the
    // whole thing is built around. IJ is one letter written with two signs, so
    // it capitalises whole: `IJmuiden`, `IJszee`, `IJzermonding`, and `ijs`
    // lowercase in the middle of a sentence. `Ij` is therefore wrong under every
    // reading, which is exactly what makes it detectable.
    //
    // And not repairable, for the reason `es.unpaired-question` is not: knowing
    // the form is wrong does not tell you which way to correct it. `Ijs` at the
    // start of a sentence wants `IJs` and the same word inside one wants `ijs`,
    // and choosing between them means knowing where the sentence began and
    // whether the word is a proper noun. That is a parse. The standard's own
    // text has 63 lowercase `ij`, 3 `IJ` and no `Ij` at all.
    pattern: /(?<![\p{L}\p{N}])Ij(?=\p{Ll})/gu,
  }),

  // Worth having in a Dutch style specifically, which is not obvious from a
  // standard that says nothing about spacing. Dutch and French are in daily
  // contact in Belgium, and French spacing carried into Dutch is a defect under
  // the Belgian half of the Taalunie's own authority rather than a Belgian
  // convention, which is why this is one pack and not `nl-BE` plus `nl-NL`.
  spaceBeforePunctuation({
    id: 'nl.space-before-punctuation',
    language: 'Dutch',
    cite: `${TAALADVIES}, "Wel of geen spaties voor en na leestekens en symbolen"`,
  }),

  // Dutch has three admissible pairs to choose between rather than two, with
  // nothing in any citation that would settle which, so the parse the builder
  // declines to attempt is one branch wider here than anywhere else.
  straightDoubleQuote({
    id: 'nl.straight-double-quote',
    instead: 'Dutch quotation marks are a matched curly pair',
    cite: `${TAALADVIES}, "Dubbele of enkele aanhalingstekens bij een citaat"`,
  }),
];

/**
 * The Dutch pack.
 *
 * One pack and no regions, unlike German. The Taalunie is a treaty body whose
 * spelling binds the Netherlands, Flanders and Suriname alike, so there is no
 * second Dutch convention for a tag to name - which is the same test that gives
 * German two packs and gives this one none.
 *
 * `normalize` carries the two apostrophe rules and none of the five detections.
 */
export const nl: TypographyPack = {
  id: `nl@${VERSION}`,
  lang: 'nl',
  standard: 'Nederlandse Taalunie',
  rules,
  normalize: composeNormalize(rules),
};

export default nl;
