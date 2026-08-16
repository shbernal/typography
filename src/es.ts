// Spanish orthotypography, per the Real Academia Española.
//
// Spanish is the language that shaped this package's central type. French and
// Spanish use the identical pair of quotation marks with opposite spacing rules,
// which is why there is no shared rule engine here - but the sharper point is
// the opening marks. `¿` and `¡` are obligatory and paired, so a sentence ending
// in `?` with no `¿` is a real, unambiguous, high-value defect. Detecting it is
// a regex and a backward scan. *Fixing* it means deciding where the sentence
// began, which is a parse, and a parse that is wrong silently moves a mark into
// the middle of someone's prose.
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
  NARROW_NO_BREAK,
  NO_BREAK,
  type Rule,
  replaceRule,
  type TypographyPack,
} from './pack.ts';
import { looksMachine } from './prose.ts';

const ORTOGRAFIA = 'RAE, Ortografía de la lengua española (2010)';

/** Bumps when a rule changes, and never for a release that does not touch one.
 *
 * 0.2.0 put the cross-language guard on both guillemet rules. Under `es@0.1.0`
 * a German inward quotation inside Spanish text had both its spaces deleted and
 * its words welded; under `es@0.2.0` it is left alone. No Spanish corpus
 * contains one, so no committed count moves, and the two stamps still have to be
 * told apart: `normalize` returns something different for text that reaches it. */
const VERSION = '0.2.0';

/** Space, U+00A0 and U+202F. Spanish permits none of the three where these
 * rules look, so all three are the defect. */
const ANY_SPACE = `[ ${NO_BREAK}${NARROW_NO_BREAK}]`;

/** The start of a space run. `de-common.ts` explains what it is protecting
 * against at length; the short version is that `ANY_SPACE+»` without it rescans
 * a run of spaces once per character in the run. Not imported from there, for
 * the reason the guillemet rules below are not either: the day RAE and Duden
 * disagree, a shared constant has to be split by whoever is holding the release. */
const RUN_START = `(?<!${ANY_SPACE})`;

/** Ends a sentence for the purpose of the paired-mark scan below. */
const SENTENCE_END = /[.!?\n…]/;

const rules: readonly Rule[] = [
  replaceRule({
    id: 'es.guillemet-open-space',
    summary: 'Space after an opening guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    // The mirror image of the French rule, and the reason a locale parameter
    // would have been a switch statement wearing a table's clothes: same
    // character, same position, opposite requirement.
    //
    // Safe to fix because guillemets are unambiguous *within a language*, which
    // is a weaker licence than it sounds and is what the lookbehind is for.
    // Guillemets are not unambiguous across languages: `«` opens a quotation in
    // Spanish, in French and in Switzerland, and *closes* one in Germany and
    // Austria. Without the guard this rule reads the `«` of a German `»Wort«
    // und` as an opening mark and deletes the space after it, welding two words
    // together. A `«` with a letter or a digit immediately before it is closing
    // something, whatever this pack believes.
    //
    // Both German packs have carried this guard since they were written and this
    // rule shipped without it, while `de-CH.ts` described its own rule as "the
    // same pattern and replacement as the Spanish rule". It was not: it was this
    // rule plus the guard. That is the second time a comment claiming parity
    // with another pack outlived the parity, after `de.space-before-punctuation`
    // cited `es.ts` for a `looksMachine` filter it did not have.
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])«${ANY_SPACE}+`, 'gu'),
    replacement: '«',
  }),

  replaceRule({
    id: 'es.guillemet-close-space',
    summary: 'Space before a closing guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    // The mirror guard, and the mirror hazard: `»` closes a quotation here and
    // *opens* one in Germany, so a `»` with a letter or a digit immediately
    // after it is opening something and the space before it is a word boundary
    // rather than padding inside a quotation.
    pattern: new RegExp(`${RUN_START}${ANY_SPACE}+»(?![\\p{L}\\p{N}])`, 'gu'),
    replacement: '»',
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

  detectRule({
    id: 'es.space-before-punctuation',
    summary: 'Space before `; : ! ?`, which Spanish does not take',
    cite: `${ORTOGRAFIA}, "Los signos de puntuación"`,
    // Check-only, and this is the case where the boundary is worth stating,
    // because deleting a space looks like the safest edit imaginable.
    //
    // It is not, on the corpora this package exists for. `a ? b : c` is a
    // ternary, `1 : 2` is a ratio, and a fenced code block inside technical
    // Spanish carries both. Deleting those spaces silently corrupts code that
    // rendered correctly. The defect is real, it is almost always a Frenchism
    // carried over by a translator, and it is still a human's call.
    pattern: new RegExp(`\\p{L}${ANY_SPACE}+[;:!?]`, 'gu'),
    refine: (match, value) =>
      looksMachine(value, match.index)
        ? null
        : { index: match.index + 1, length: match[0].length - 2 },
  }),

  detectRule({
    id: 'es.straight-double-quote',
    summary: 'Straight double quote; Spanish quotation marks are `«»` then `""`',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    severity: 'warning',
    pattern: /"/g,
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
