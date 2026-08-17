// The German rules that do not vary by region. Internal: this is not a style and
// there is no `./de` subpath export, because there is no German convention for a
// bare `de` to name. Germany and Austria open a quotation with `»`; Switzerland
// opens it with `«`. A style named `de` stamped on a Swiss corpus would be
// a stamp that lies, which is the one thing an era stamp may not do.
//
// What is left here after the shared families moved into `rules/` is a *rule
// list*: three calls that name their citations and their language, prepended by
// `de-DE.ts` and `de-CH.ts` to their own quotation marks. This file used to
// argue that a rule list was the sharable unit and a parameterized rule was not,
// on the grounds that a shared constant would have to be split by whoever was
// holding the release the day RAE and Duden disagreed. `rules/space.ts` records
// why that argument does not survive the pivot.
//
// Citations are section-level, to Duden, `Die deutsche Rechtschreibung`,
// Richtlinien zur Rechtschreibung und Zeichensetzung.

import type { Rule } from '../pack.ts';
import { apostrophe } from '../rules/apostrophe.ts';
import { spaceBeforePunctuation } from '../rules/space-before-punctuation.ts';
import { straightDoubleQuote } from '../rules/straight-double-quote.ts';

export const DUDEN = 'Duden, Die deutsche Rechtschreibung, Richtlinien';

/** Rules common to every German region. Region styles prepend their own. */
export const germanCommonRules: readonly Rule[] = [
  // German needs the apostrophe rule less often than French (`geht's`,
  // `Ku'damm`) and gets it wrong just as reliably. The letter-on-both-sides
  // narrowing the builder describes was measured here: it reports `Z'graggen`
  // and leaves `100'000` alone, and 22 Swiss thousands separators in the Swiss
  // corpora would otherwise have been repaired into apostrophes.
  apostrophe({
    language: 'German',
    wrong: `[']`,
    cite: `${DUDEN}, "Apostroph"`,
  }),

  // In German corpora this fires almost exclusively on text a French-speaking
  // translator touched, which makes it useful and still not automatic. It also
  // shipped here without the `looksMachine` filter while its own comment cited
  // the Spanish file that had it; the builder is where that cannot happen again.
  spaceBeforePunctuation({
    language: 'German',
    cite: `${DUDEN}, "Zeichensetzung"`,
  }),

  // German has two admissible pairs, `„…“` and `»…«`, so even a reader who knew
  // which end of a straight quote they were looking at would still have to
  // choose. That is one more reason on top of the builder's.
  straightDoubleQuote({
    instead: 'German quotation marks are a matched pair',
    cite: `${DUDEN}, "Anführungszeichen"`,
  }),
];
