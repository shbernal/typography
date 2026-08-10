// German orthotypography as set in Switzerland.
//
// Swiss German uses the French guillemets pointing outward, `«Wort»`, and unlike
// French it sets them closed up. That is three languages using the same two
// characters three different ways - French `« Wort »` with a narrow no-break
// space, Spanish `«Wort»` closed up, Swiss German `«Wort»` closed up, and
// German German `»Wort«` reversed - which is why this package has one module per
// convention and no rule engine with a locale table.
//
// Everything else about Swiss German typography is Duden's, so this pack is the
// common rules plus its own quotation marks.

import { ANY_SPACE, DUDEN, germanCommonRules, RUN_START } from './de-common.ts';
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
    id: 'de-CH.guillemet-open-space',
    summary: 'Space after the opening guillemet `«`; Swiss German sets `«Wort»` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // The same pattern and replacement as the Spanish rule, arrived at from a
    // different standard. They are not shared, and should not be: the day RAE
    // and Duden disagree, a shared constant would have to be split under time
    // pressure by whoever is holding the release.
    // The lookbehind guards the same hazard `de-DE.ts` documents, pointed the
    // other way: `«` closes a quotation in Germany, so a `«` with a letter
    // immediately before it is closing something and the space before it is a
    // word boundary rather than padding.
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])«${ANY_SPACE}+`, 'gu'),
    replacement: '«',
  }),

  replaceRule({
    id: 'de-CH.guillemet-close-space',
    summary: 'Space before the closing guillemet `»`; Swiss German sets `«Wort»` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    pattern: new RegExp(`${RUN_START}${ANY_SPACE}+»(?![\\p{L}\\p{N}])`, 'gu'),
    replacement: '»',
  }),

  detectRule({
    id: 'de-CH.inward-guillemets',
    summary: 'Guillemets point inward (`»Wort«`), which is the German and Austrian setting',
    cite: `${DUDEN}, "Anführungszeichen"`,
    // The exact inverse of `de-DE.outward-guillemets`, and check-only for the
    // same reason: the text may be a correct German quotation inside a Swiss
    // document rather than a mistake.
    pattern: /»(?=[\p{L}\p{N}])/gu,
  }),
];

/** German as set in Switzerland. */
export const deCH: TypographyPack = {
  id: `de-CH@${VERSION}`,
  lang: 'de-CH',
  standard: 'Duden',
  rules,
  normalize: composeNormalize(rules),
};

export default deCH;
