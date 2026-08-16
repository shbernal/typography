// German orthotypography as set in Germany and Austria.
//
// The quotation marks are the whole reason this is a separate pack from
// `de-CH.ts`. Germany opens with `„` and closes with U+201C, and where
// guillemets are used instead they point *inward*: `»Wort«`. Switzerland points
// them outward, `«Wort»`, using the identical characters the other way round.
//
// So the one thing a shared German pack could not have done is exactly the thing
// a reader needs: tell a Swiss quotation from a German mistake.

import { DUDEN, germanCommonRules } from './de-common.ts';
import { composeNormalize, type Rule, type TypographyPack } from './pack.ts';
import { guillemetDirection } from './rules/guillemet-direction.ts';
import { innerSpace } from './rules/inner-space.ts';
import { ANY_SPACE } from './rules/space.ts';

/** Bumps when a rule changes, and never for a release that does not touch one.
 *
 * 0.2.0 put `de.space-before-punctuation` behind `looksMachine`, so it no longer
 * reports a URL or a ternary. That rule is in `germanCommonRules`, which is why
 * `de-CH` moves to 0.2.0 in the same breath: one rule changed and two packs
 * contain it. A corpus checked under `de-DE@0.1.0` was told about its query
 * strings and one under `de-DE@0.2.0` was not, so the two counts are not
 * comparable and the stamp has to say so. */
const VERSION = '0.2.0';

const rules: readonly Rule[] = [
  ...germanCommonRules,

  // The one member of this family that turns the guard off for a reason it can
  // state: U+201E has exactly one job in every language that uses it, so there
  // is no other reading to protect against and no word a repair could weld.
  //
  // There is deliberately no matching rule for the closing U+201C. That
  // character is an *opening* mark in English, and German technical prose quotes
  // English constantly, so deleting a space before it would close up `he said
  // "hello"` into nonsense. The asymmetry is the rule, not a gap, and it is the
  // same hazard the guard exists for, met with a whole missing rule because the
  // guard would not have been enough.
  innerSpace({
    id: 'de-DE.low-quote-space',
    summary: 'Space after the opening low quotation mark; German sets it closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    mark: '„',
    side: 'open',
    spaces: ANY_SPACE,
    correct: '',
    guard: false,
  }),

  // Germany points the guillemets inward, so this is `de-CH`'s pair with the
  // marks exchanged and nothing else different. Two packs, one builder, and the
  // claim that they are mirror images is now true by construction rather than
  // asserted in a comment.
  innerSpace({
    id: 'de-DE.guillemet-open-space',
    summary: 'Space after the opening guillemet `»`; German sets `»Wort«` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    mark: '»',
    side: 'open',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  innerSpace({
    id: 'de-DE.guillemet-close-space',
    summary: 'Space before the closing guillemet `«`; German sets `»Wort«` closed up',
    cite: `${DUDEN}, "Anführungszeichen"`,
    mark: '«',
    side: 'close',
    spaces: ANY_SPACE,
    correct: '',
    guard: true,
  }),

  // Germany opens with `»`, so the rule is about `«` in opening position, which
  // is `de-CH`'s setting appearing in a German document. The builder carries the
  // argument for why swapping the two characters is not a safe repair even
  // though it is an obvious one.
  guillemetDirection({
    id: 'de-DE.outward-guillemets',
    opens: '»',
    convention: 'Swiss and French',
    cite: `${DUDEN}, "Anführungszeichen"`,
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
