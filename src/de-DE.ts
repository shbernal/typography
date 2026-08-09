// German orthotypography as set in Germany and Austria.
//
// The quotation marks are the whole reason this is a separate pack from
// `de-CH.ts`. Germany opens with `„` and closes with U+201C, and where
// guillemets are used instead they point *inward*: `»Wort«`. Switzerland points
// them outward, `«Wort»`, using the identical characters the other way round.
//
// So the one thing a shared German pack could not have done is exactly the thing
// a reader needs: tell a Swiss quotation from a German mistake.

import { ANY_SPACE, DUDEN, germanCommonRules } from './de-common.ts';
import {
  composeNormalize,
  detectRule,
  type Rule,
  replaceRule,
  type TypographyPack,
} from './pack.ts';

const VERSION = '0.1.0';

const rules: readonly Rule[] = [
  ...germanCommonRules,

  replaceRule({
    id: 'de-DE.low-quote-space',
    summary: 'Space after the opening low quotation mark; German sets it closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // U+201E has exactly one job in any language that uses it, so removing the
    // space after it damages nothing.
    //
    // There is deliberately no matching rule for the closing U+201C. That
    // character is an *opening* mark in English, and German technical prose
    // quotes English constantly, so deleting a space before it would close up
    // `he said "hello"` into nonsense. The asymmetry is the rule, not a gap.
    pattern: new RegExp(`„${ANY_SPACE}+`, 'g'),
    replacement: '„',
  }),

  replaceRule({
    id: 'de-DE.guillemet-open-space',
    summary: 'Space after the opening guillemet `»`; German sets `»Wort«` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // The lookbehind is load-bearing and its absence would have been a defect
    // this package could not detect in itself.
    //
    // `»` opens a quotation here and closes one in Switzerland. Without the
    // guard, this rule reads the `»` of a Swiss `«Wort» und` as an opening mark
    // and deletes the space after it, welding two words together. A `»` with a
    // letter or a digit immediately before it is closing something, whatever
    // this pack believes, so it is left alone.
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])»${ANY_SPACE}+`, 'gu'),
    replacement: '»',
  }),

  replaceRule({
    id: 'de-DE.guillemet-close-space',
    summary: 'Space before the closing guillemet `«`; German sets `»Wort«` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // The mirror guard: a `«` with a letter or digit immediately after it is
    // opening a Swiss or French quotation, so the space before it is a real word
    // boundary rather than padding inside a quotation.
    pattern: new RegExp(`${ANY_SPACE}+«(?![\\p{L}\\p{N}])`, 'gu'),
    replacement: '«',
  }),

  detectRule({
    id: 'de-DE.outward-guillemets',
    summary: 'Guillemets point outward (`«Wort»`), which is the Swiss and French setting',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // `«` immediately followed by a word character is `«` being used to *open* a
    // quotation, which is correct in `de-CH` and wrong here.
    //
    // Check-only, and the reason is worth reading because it is not the usual
    // one: the repair is mechanically obvious - swap both characters - and it is
    // still not safe, because the text might be right and the *pack* wrong. A
    // Swiss quotation inside a German document is a citation, not an error, and
    // no rule can tell which without knowing where the sentence came from.
    pattern: /«(?=[\p{L}\p{N}])/gu,
  }),
];

/** German as set in Germany and Austria. */
export const deDE: TypographyPack = {
  id: `de-DE@${VERSION}`,
  lang: 'de-DE',
  standard: 'Duden',
  rules,
  normalize: composeNormalize(rules),
};

export default deDE;
