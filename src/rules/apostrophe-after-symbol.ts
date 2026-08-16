// An apostrophe attaching a suffix to a digit, an initialism or a symbol:
// `A4’tje`, `80’ers`, `2’en`, `D66’er`, `65+’er`, `@’je`.
//
// **Check-only, and the reason is the one `space-before-punctuation.ts` gives at
// length.** A digit to the left of a straight quote followed by letters is also a
// sized literal in hardware description languages, `4'b1010` and `8'hFF`, and a
// foot-and-inch measure is the same three characters again. The letter-to-letter
// apostrophe rule has a lookbehind that separates prose from those; here there is
// none, because the digit *is* the context. The repair is obvious and it is still
// not a style's to make unattended.

import { detectRule, type Rule } from '../pack.ts';
import { looksMachine } from '../prose.ts';

export function apostropheAfterSymbol(spec: {
  /** Everything that turns up in this position and is not U+2019. */
  wrong: string;
  cite: string;
}): Rule {
  return detectRule({
    id: 'apostrophe-after-symbol',
    summary: 'Straight quote after a digit or symbol where Dutch takes U+2019',
    cite: spec.cite,
    pattern: new RegExp(`(?<=[\\p{N}@&+])${spec.wrong}(?=\\p{L})`, 'gu'),
    refine: (match, value) =>
      looksMachine(value, match.index) ? null : { index: match.index, length: 1 },
  });
}
