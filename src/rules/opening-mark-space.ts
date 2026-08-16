// A space after `¿` or `¡`, which are set against the word they open.
//
// One caller, and the rule that states this package's line most economically.
// Spanish requires both halves of an interrogative or exclamative pair, and the
// closing half is check-only because placing the opening mark means deciding
// where the clause began, which is a parse. This rule is fixable for the exact
// complement of that reason: the mark is already in the text, so its position is
// known and only the spacing is wrong. Nothing has to be inferred.

import { type Rule, replaceRule } from '../pack.ts';
import { ANY_SPACE } from './space.ts';

export function openingMarkSpace(spec: { id: string; cite: string }): Rule {
  return replaceRule({
    id: spec.id,
    summary: 'Space after `¿` or `¡`; the mark is set against the word it opens',
    cite: spec.cite,
    pattern: new RegExp(`(?<=[¿¡])${ANY_SPACE}+`, 'gu'),
    replacement: '',
  });
}
