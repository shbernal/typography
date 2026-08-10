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

const ORTOGRAFIA = 'RAE, Ortografía de la lengua española (2010)';

const VERSION = '0.1.0';

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

/**
 * How far either scan below will walk before giving up. Every `?` and `!` in a
 * value pays this, so an uncapped scan is quadratic in the length of an unbroken
 * run: `a?` repeated to 8,000 characters took 1.7 s, and the values here are
 * whole documents. A token longer than this is not a Spanish word under any
 * reading, so the cap costs nothing a reader would want back.
 */
const TOKEN_SCAN = 128;

/**
 * The whitespace-delimited token containing `index`, or null when it runs past
 * `TOKEN_SCAN` characters in either direction.
 *
 * Every check-only rule here needs it for the same reason: a `?` in
 * `https://x/y?a=1` is the identical character in a construction that must never
 * be reported, and the only cheap signal that tells them apart is that the URL
 * has no spaces in it and carries `/` or `=`.
 */
function token(value: string, index: number): string | null {
  const floor = Math.max(0, index - TOKEN_SCAN);
  const ceiling = Math.min(value.length, index + TOKEN_SCAN);
  let from = index;
  let to = index;
  while (from > floor && !/\s/.test(value[from - 1]!)) from--;
  while (to < ceiling && !/\s/.test(value[to]!)) to++;
  const bounded =
    (from === 0 || /\s/.test(value[from - 1]!)) && (to === value.length || /\s/.test(value[to]!));
  return bounded ? value.slice(from, to) : null;
}

/** True when the token around `index` looks like a URL, a query string, a path
 * or an identifier rather than prose. Deliberately crude: it is a filter on a
 * report, so a miss costs a false positive that a human reads and dismisses.
 *
 * A token too long to scan counts as machine text, which is the conservative
 * direction: it suppresses a finding rather than inventing one, and 128
 * unbroken characters of Spanish prose do not occur. */
function looksMachine(value: string, index: number): boolean {
  const t = token(value, index);
  if (t === null) return true;
  return t.includes('://') || t.includes('=') || t.includes('/') || t.startsWith('-');
}

const rules: readonly Rule[] = [
  replaceRule({
    id: 'es.guillemet-open-space',
    summary: 'Space after an opening guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    // The mirror image of the French rule, and the reason a locale parameter
    // would have been a switch statement wearing a table's clothes: same
    // character, same position, opposite requirement.
    //
    // Safe to fix for the same reason French's insertion is safe: guillemets are
    // unambiguous, so there is no other construction to damage.
    pattern: new RegExp(`«${ANY_SPACE}+`, 'g'),
    replacement: '«',
  }),

  replaceRule({
    id: 'es.guillemet-close-space',
    summary: 'Space before a closing guillemet; Spanish sets `«texto»` closed up',
    cite: `${ORTOGRAFIA}, "Las comillas"`,
    pattern: new RegExp(`${RUN_START}${ANY_SPACE}+»`, 'g'),
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
