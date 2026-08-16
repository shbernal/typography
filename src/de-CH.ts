// German orthotypography as set in Switzerland.
//
// Swiss German uses the French guillemets pointing outward, `«Wort»`, and unlike
// French it sets them closed up. That is three languages using the same two
// characters three different ways - French `« Wort »` with a narrow no-break
// space, Spanish `«Wort»` closed up, Swiss German `«Wort»` closed up, and
// German German `»Wort«` reversed - which is why this package has one module per
// convention and no rule engine with a locale table.
//
// Everything else about Swiss German typography is Duden's, so this style is the
// common rules plus its own quotation marks.

import { compose } from './compose.ts';
import { DUDEN, germanCommonRules } from './de-common.ts';
import type { Rule, Style } from './pack.ts';
import { guillemetDirection } from './rules/guillemet-direction.ts';
import { innerSpace } from './rules/inner-space.ts';
import { ANY_SPACE } from './rules/space.ts';

const rules: readonly Rule[] = [
  ...germanCommonRules,

  // This rule used to say of itself that it was "the same pattern and
  // replacement as the Spanish rule, arrived at from a different standard", and
  // that they were not shared and should not be, because the day RAE and Duden
  // disagreed a shared constant would have to be split by whoever was holding
  // the release. The sentence was false for two pack versions and the scar is
  // worth leaving on: this rule had the guard and the Spanish one did not, so
  // the two were the same rule only in the comment, and `es.normalize` welded
  // the words either side of a German inward quotation until `es@0.2.0`.
  //
  // A comment asserting parity with another pack is an assertion nothing tests.
  // Now they are the same call with a different citation, and the parity is a
  // fact about the program.
  innerSpace({
    summary: 'Space after the opening guillemet `«`; Swiss German sets `«Wort»` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    mark: '«',
    side: 'open',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  innerSpace({
    summary: 'Space before the closing guillemet `»`; Swiss German sets `«Wort»` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    mark: '»',
    side: 'close',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  // `de-DE.outward-guillemets` with the marks exchanged, which is now one
  // argument to the same builder rather than a second pattern that has to keep
  // agreeing with the first.
  guillemetDirection({
    opens: '«',
    convention: 'German and Austrian',
    cite: `${DUDEN}, "Anführungszeichen"`,
  }),
];

/** German as set in Switzerland.
 *
 * Nothing Swiss changed when `punctuation-spacing` went behind `looksMachine`
 * and this style's stamp moved anyway, because what a stamp promises is that two
 * corpora carrying it were checked by the same rules. That used to be a bump
 * somebody had to remember in a second file; it is now a consequence of sharing
 * the rule. */
export const deCH: Style = compose({
  name: 'de-CH',
  lang: 'de-CH',
  standard: 'Duden',
  rules,
});

export default deCH;
