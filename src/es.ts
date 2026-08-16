// Spanish orthotypography, per the Real Academia Española.
//
// Spanish is the language that shaped this package's central type. French and
// Spanish use the identical pair of quotation marks with opposite spacing rules,
// which this file used to give as the reason there could be no shared rule
// engine. That was an argument about two standards bodies disagreeing, and it
// does not survive the composition pivot: opposite is a parameter value, and the
// `guillemet-inner-space` builder is where those two rules are going. What is
// shared already is in `rules/`.
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

import {
  composeNormalize,
  detectRule,
  type Match,
  type Rule,
  replaceRule,
  type TypographyPack,
} from './pack.ts';
import { looksMachine } from './prose.ts';
import { innerSpace } from './rules/inner-space.ts';
import { ANY_SPACE } from './rules/space.ts';
import { spaceBeforePunctuation } from './rules/space-before-punctuation.ts';
import { straightDoubleQuote } from './rules/straight-double-quote.ts';

const ORTOGRAFIA = 'RAE, Ortografía de la lengua española (2010)';

/** Bumps when a rule changes, and never for a release that does not touch one.
 *
 * 0.2.0 put the cross-language guard on both guillemet rules. Under `es@0.1.0`
 * a German inward quotation inside Spanish text had both its spaces deleted and
 * its words welded; under `es@0.2.0` it is left alone. No Spanish corpus
 * contains one, so no committed count moves, and the two stamps still have to be
 * told apart: `normalize` returns something different for text that reaches it. */
const VERSION = '0.2.0';

/** Ends a sentence for the purpose of the paired-mark scan below. */
const SENTENCE_END = /[.!?\n…]/;

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
    id: 'es.guillemet-open-space',
    summary: 'Space after an opening guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    mark: '«',
    side: 'open',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  innerSpace({
    id: 'es.guillemet-close-space',
    summary: 'Space before a closing guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    mark: '»',
    side: 'close',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  replaceRule({
    id: 'es.opening-mark-space',
    summary: 'Space after `¿` or `¡`; the mark is set against the word it opens',
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
    // Fixable where the closing half is not, and the difference is the whole
    // argument of this package: `¿` is already in the text, so its position is
    // known and only the spacing is wrong. Nothing has to be inferred.
    pattern: new RegExp(`(?<=[¿¡])${ANY_SPACE}+`, 'gu'),
    replacement: '',
  }),

  // -------------------------------------------------------------------------
  // Check only.
  // -------------------------------------------------------------------------

  detectRule({
    id: 'es.unpaired-question',
    summary: 'Sentence ends in `?` with no opening `¿`',
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
    // The rule this package's design turns on. RAE requires both halves, and
    // omitting the opening one is the single most common defect in Spanish
    // written by speakers of languages that have no opening mark - which is to
    // say, in most translated Spanish.
    //
    // The scan walks back to the start of the sentence and asks whether a `¿`
    // appeared. That is as far as a safe implementation goes: knowing the
    // sentence has no opening mark does not tell you where the *interrogative
    // clause* began, and in Spanish the mark goes at the start of the clause,
    // not the sentence. `Si vienes, ¿me avisas?` is correct and no substitution
    // could have produced it.
    pattern: /\?/g,
    refine: (match, value) => unpaired(value, match.index, '¿'),
  }),

  detectRule({
    id: 'es.unpaired-exclamation',
    summary: 'Sentence ends in `!` with no opening `¡`',
    cite: `${ORTOGRAFIA}, "Los signos de interrogación y de exclamación"`,
    pattern: /!/g,
    refine: (match, value) => unpaired(value, match.index, '¡'),
  }),

  // The builder carries the pattern, the `looksMachine` filter and the argument
  // for why none of the three styles that have this rule repairs it. What is
  // Spanish about it is that the defect is almost always a Frenchism a
  // translator carried over.
  spaceBeforePunctuation({
    id: 'es.space-before-punctuation',
    language: 'Spanish',
    cite: `${ORTOGRAFIA}, "Los signos de puntuación"`,
  }),

  // Spanish is the one style here that ranks two pairs rather than admitting
  // them equally: RAE sets the guillemets first and the curly doubles as the
  // inner level. Neither of them is a straight quote, which is all this rule
  // needs, and choosing between them is still the parse the builder describes.
  straightDoubleQuote({
    id: 'es.straight-double-quote',
    instead: 'Spanish quotation marks are `«»` then `""`',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
  }),
];

/**
 * A closing mark with no matching opening mark earlier in its sentence.
 *
 * Returns the match to report, or null when the text is fine or when the
 * character is not being used as punctuation at all.
 */
function unpaired(value: string, index: number, opener: string): Match | null {
  if (looksMachine(value, index)) return null;

  // The character before has to be something a sentence can end on. This rules
  // out `??`, `!!`, a bare `?` after a bracket, and most of what a placeholder
  // or a template looks like.
  const before = value[index - 1];
  if (!before || !/[\p{L}\p{N}\p{Pf}\p{Pe}'’]/u.test(before)) return null;

  for (let i = index - 1; i >= 0; i--) {
    const ch = value[i]!;
    if (ch === opener) return null;
    if (SENTENCE_END.test(ch)) break;
  }
  return { index, length: 1 };
}

/**
 * The Spanish pack.
 *
 * `normalize` carries the three spacing rules and none of the four detections,
 * so a host binding this through `job.normalize` gets exactly the subset that is
 * safe to apply to somebody's text without being asked.
 */
export const es: TypographyPack = {
  id: `es@${VERSION}`,
  lang: 'es',
  standard: 'Real Academia Española',
  rules,
  normalize: composeNormalize(rules),
};

export default es;
