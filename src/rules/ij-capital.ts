// Word-initial `Ij`, which is not a way of capitalising the Dutch digraph.
//
// The most language-specific rule in this package and a clean instance of the
// shape the whole thing is built around. IJ is one letter written with two
// signs, so it capitalises whole: `IJmuiden`, `IJszee`, `IJzermonding`, and `ijs`
// lowercase in the middle of a sentence. `Ij` is therefore wrong under every
// reading, which is exactly what makes it detectable.
//
// And not repairable, for the reason `unpaired-mark.ts` is not: knowing the form
// is wrong does not tell you which way to correct it. `Ijs` at the start of a
// sentence wants `IJs` and the same word inside one wants `ijs`, and choosing
// between them means knowing where the sentence began and whether the word is a
// proper noun. That is a parse. The standard's own text has 63 lowercase `ij`,
// 3 `IJ` and no `Ij` at all.

import { detectRule, type Rule } from '../pack.ts';

export function ijCapital(spec: { id: string; cite: string }): Rule {
  return detectRule({
    id: spec.id,
    summary: 'Word-initial `Ij`; the Dutch digraph capitalises as `ij` or `IJ`, never `Ij`',
    cite: spec.cite,
    pattern: /(?<![\p{L}\p{N}])Ij(?=\p{Ll})/gu,
  });
}
