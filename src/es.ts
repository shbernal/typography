// Spanish orthotypography, per the Real Academia Española.
//
// Spanish is the language that shaped this package's central type. French and
// Spanish use the identical pair of quotation marks with opposite spacing rules,
// which this file used to give as the reason there could be no shared rule
// engine. That was an argument about two standards bodies disagreeing, and it
// does not survive the composition pivot: opposite is a parameter value, and
// `rules/inner-space.ts` is where both rules now live. Every rule this style
// declares is a call into `rules/`.
//
// The sharper point was always the opening marks anyway. `¿` and `¡` are
// obligatory and paired, so a sentence ending in `?` with no `¿` is a real,
// unambiguous, high-value defect. Detecting it is a regex and a backward scan.
// *Fixing* it means deciding where the sentence began, which is a parse, and a
// parse that is wrong silently moves a mark into the middle of someone's prose.
//
// So Spanish ships four check-only rules and three fixable ones, and the
// asymmetry is the information rather than an omission.
//
// Citations are section-level, to `Ortografía de la lengua española` (RAE,
// 2010).

import { compose } from './compose.ts';
import type { Rule, Style } from './pack.ts';
import { innerSpace } from './rules/inner-space.ts';
import { openingMarkSpace } from './rules/opening-mark-space.ts';
import { ANY_SPACE } from './rules/space.ts';
import { spaceBeforePunctuation } from './rules/space-before-punctuation.ts';
import { straightDoubleQuote } from './rules/straight-double-quote.ts';
import { unpairedMark } from './rules/unpaired-mark.ts';

const ORTOGRAFIA = 'RAE, Ortografía de la lengua española (2010)';

const rules: readonly Rule[] = [
  // The same builder as `fr.guillemet-open`, on the identical character in the
  // identical position, set to the opposite spacing. That used to be the reason
  // there could be no shared rule engine and is now one parameter; the header
  // and `rules/inner-space.ts` argue it.
  //
  // The guard is what shipped missing here until `es@0.2.0`, when the rule was
  // welding the words either side of a German inward quotation. It is a flag at
  // this call site now, which is a thing a reader can see and a missing
  // lookaround is not.
  innerSpace({
    summary: 'Space after an opening guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    mark: '«',
    side: 'open',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  innerSpace({
    summary: 'Space before a closing guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    mark: '»',
    side: 'close',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  openingMarkSpace({
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
  }),

  // -------------------------------------------------------------------------
  // Check only.
  // -------------------------------------------------------------------------

  // The two rules this package's design turns on, and the builder carries the
  // argument. What is Spanish about them is that they exist at all: no other
  // style here has a mark whose absence at the *other* end of a sentence is the
  // defect.
  unpairedMark({
    mark: '?',
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
  }),

  unpairedMark({
    mark: '!',
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
  }),

  // The builder carries the pattern, the `looksMachine` filter and the argument
  // for why none of the three styles that have this rule repairs it. What is
  // Spanish about it is that the defect is almost always a Frenchism a
  // translator carried over.
  spaceBeforePunctuation({
    language: 'Spanish',
    cite: `${ORTOGRAFIA}, "Los signos de puntuación"`,
  }),

  // Spanish is the one style here that ranks two pairs rather than admitting
  // them equally: RAE sets the guillemets first and the curly doubles as the
  // inner level. Neither of them is a straight quote, which is all this rule
  // needs, and choosing between them is still the parse the builder describes.
  straightDoubleQuote({
    instead: 'Spanish quotation marks are `«»` then `""`',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
  }),
];

/**
 * The Spanish style.
 *
 * `normalize` carries the three spacing rules and none of the four detections,
 * so a host binding this through `job.normalize` gets exactly the subset that is
 * safe to apply to somebody's text without being asked.
 *
 * The stamp is derived, so the cross-language guard the header describes moved
 * it the moment the pattern changed. It used to be a hand-written `0.2.0` and
 * the release note explaining why it had moved was the only thing making the
 * claim true.
 */
export const es: Style = compose({
  name: 'es',
  lang: 'es',
  standard: 'Real Academia Española',
  rules,
});

export default es;
