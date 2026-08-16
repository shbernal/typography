// The space before a colon, in a style that requires a no-break one.
//
// One caller, and it stays hand-written rather than becoming a parameter of the
// rule next door. French is the only style here that rules on the colon
// separately from `; ! ?`, and it has to: the Lexique specifies the word space
// before a colon and leaves the width of the other three unsettled, so the one
// position where nothing is in dispute is the one position a style may name a
// width outright. Folding it into `space-before-punctuation.ts` would mean a
// style could imply the colon into a ballot it has no business being in.

import { NO_BREAK, type Rule, replaceRule } from '../pack.ts';

export function colonSpacing(spec: { id: string; cite: string }): Rule {
  return replaceRule({
    id: spec.id,
    summary: 'Breaking space before a colon; French requires U+00A0',
    cite: spec.cite,
    // Converts and never inserts. Inserting before a colon would fire on every
    // `https://`, and there is no way to tell a French sentence from a URL with
    // a lookbehind. What a real corpus holds is the space already (137 rows in
    // the corpus this pack was extracted from), so conversion is the whole
    // measured defect.
    //
    // The Lexique says the word space and the published corpora use it 2,458
    // times against no counter-example, which is why this is the one rule in the
    // French style that still names a width outright.
    pattern: / (?=:)/g,
    replacement: NO_BREAK,
  });
}
