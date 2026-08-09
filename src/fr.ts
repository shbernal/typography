// French orthotypography, per the Imprimerie nationale.
//
// The five fixable rules below are extracted verbatim from a production
// normalizer that has run over a 2,125-row corpus, and `gates/fr-reproduction`
// holds them to that: the pack must reproduce that normalizer byte for byte over
// every French row it ever touched. They are narrow on purpose and each is
// narrow in a *different* way, which is the part worth reading before editing
// one.
//
// The two check-only rules at the bottom are what French gains from having a
// `check` verb at all. They are the same defects the fixable rules decline to
// repair, reported rather than guessed at.
//
// Citations are section-level, to `Lexique des règles typographiques en usage à
// l'Imprimerie nationale` (2002). A rule with no citation does not belong here:
// that is the line between a national standard and a house style, and it is the
// only thing keeping this file from becoming a place where preferences collect.

import {
  composeNormalize,
  detectRule,
  NARROW_NO_BREAK,
  NO_BREAK,
  RIGHT_SINGLE_QUOTE,
  type Rule,
  replaceRule,
  type TypographyPack,
} from './pack.ts';

const LEXIQUE = 'Imprimerie nationale, Lexique des règles typographiques (2002)';

/** Bumps when a rule changes, and never for a release that does not touch one.
 * This is the era stamp a corpus gets tagged with, so a version that moved for a
 * README fix would split a corpus into two eras that are in fact identical. */
const VERSION = '0.1.0';

/** Space, U+00A0 and U+202F. The class an existing space inside guillemets can
 * already be, whichever of the three it is. */
const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}]`;

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
    pattern: / (?=:)/g,
    replacement: NO_BREAK,
  }),

  replaceRule({
    id: 'fr.space-before-high-punctuation',
    summary: 'Breaking space before `; ! ?`; French requires U+202F',
    cite: `${LEXIQUE}, "Ponctuation"`,
    // The narrow no-break space, not the full one. Imprimerie nationale
    // distinguishes them and Unicode encodes them as separate characters, so
    // using U+00A0 here would be wrong in a way no reader could see.
    pattern: / (?=[;!?])/g,
    replacement: NARROW_NO_BREAK,
  }),

  replaceRule({
    id: 'fr.guillemet-open',
    summary: 'Opening guillemet without the narrow no-break space after it',
    cite: `${LEXIQUE}, "Guillemets"`,
    // The one inserting rule, licensed only because guillemets are unambiguous:
    // there is no other construction to mistake them for, and a guillemet with
    // no space inside it is wrong however it got there.
    //
    // Matching zero-or-more spaces is what makes it inserting; matching the
    // no-break forms too is what keeps it idempotent, since its own output would
    // otherwise be a fresh zero-space match to insert into again.
    pattern: new RegExp(`\u00AB${ANY_SPACE}*`, 'g'),
    replacement: `\u00AB${NARROW_NO_BREAK}`,
  }),

  replaceRule({
    id: 'fr.guillemet-close',
    summary: 'Closing guillemet without the narrow no-break space before it',
    cite: `${LEXIQUE}, "Guillemets"`,
    pattern: new RegExp(`${ANY_SPACE}*\u00BB`, 'g'),
    replacement: `${NARROW_NO_BREAK}\u00BB`,
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

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
    // exactly why it reports and does not rewrite.
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
