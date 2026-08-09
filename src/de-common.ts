// The German rules that do not vary by region. Internal: this is not a pack and
// there is no `./de` subpath export, because there is no German convention for a
// bare `de` to name. Germany and Austria open a quotation with `»`; Switzerland
// opens it with `«`. A pack id of `de@0.1.0` stamped on a Swiss corpus would be
// a stamp that lies, which is the one thing an era stamp may not do.
//
// What is shared here is a *rule list*, not a parameterized rule. `de-DE.ts` and
// `de-CH.ts` each spell out their own quotation marks and prepend these. The
// alternative was writing the apostrophe rule twice and hoping the two copies
// stayed equal, which is the shape this repo is supposed to be able to detect.
//
// Citations are section-level, to Duden, `Die deutsche Rechtschreibung`,
// Richtlinien zur Rechtschreibung und Zeichensetzung.

import {
  detectRule,
  NARROW_NO_BREAK,
  NO_BREAK,
  RIGHT_SINGLE_QUOTE,
  type Rule,
  replaceRule,
} from './pack.ts';

export const DUDEN = 'Duden, Die deutsche Rechtschreibung, Richtlinien';

/** Space, U+00A0 and U+202F. German takes none of the three inside a quotation. */
export const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}]`;

/** Rules common to every German region. Region packs prepend their own. */
export const germanCommonRules: readonly Rule[] = [
  replaceRule({
    id: 'de.apostrophe',
    summary: 'Straight apostrophe between letters; German uses U+2019',
    cite: `${DUDEN}, "Apostroph"`,
    // Same shape and same narrowing as the French rule, and for the same
    // reasons: a letter on both sides keeps it off a quote used as a quote, an
    // apostrophe inside a code token, and anything next to a digit or a bracket.
    // German needs it less often than French (`geht's`, `Ku'damm`) and gets it
    // wrong just as reliably.
    pattern: /(?<=\p{L})'(?=\p{L})/gu,
    replacement: RIGHT_SINGLE_QUOTE,
  }),

  detectRule({
    id: 'de.space-before-punctuation',
    summary: 'Space before `; : ! ?`, which German does not take',
    cite: `${DUDEN}, "Zeichensetzung"`,
    // Check-only, for the reason set out at length in `es.ts`: deleting the
    // space looks trivially safe and corrupts `a ? b : c` in a fenced code
    // block. In German corpora this fires almost exclusively on text a
    // French-speaking translator touched, which makes it useful and still not
    // automatic.
    pattern: new RegExp(`\\p{L}${ANY_SPACE}+[;:!?]`, 'gu'),
    refine: (match) => ({ index: match.index + 1, length: match[0].length - 2 }),
  }),

  detectRule({
    id: 'de.straight-double-quote',
    summary: 'Straight double quote; German quotation marks are a matched pair',
    cite: `${DUDEN}, "Anfuehrungszeichen"`,
    severity: 'warning',
    // Not fixable: the two ends are the same character, so choosing between an
    // opening and a closing mark means pairing across the whole value, and
    // German has two accepted pairs to choose between even once you know which
    // end it is.
    pattern: /"/g,
  }),
];
