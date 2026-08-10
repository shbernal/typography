// The root export: the protocol, the runner and the registry.
//
// A consumer that wants one language should import one subpath instead
// (`@shbernal/typography/fr`), which is why the packs are re-exported here by
// name rather than being the headline. Importing this module pulls all four,
// which costs a few kilobytes of regular expressions and no dependencies.
//
// What is *not* re-exported here: `surveyWidth` and `withWidth`, which live on
// `@shbernal/typography/fr`. They are about a question only French has - the
// standard admitting two spellings of the no-break space - and a bare
// `withWidth` in the root namespace would read as though every pack had a width
// to impose. If a second language ever admits two spellings, that is when the
// shape gets generalised, and not before.

export { check, fix, packFor, packs, unfixable } from './check.ts';
export { deCH } from './de-CH.ts';
export { deDE } from './de-DE.ts';
export { es } from './es.ts';
export { fr } from './fr.ts';
export {
  composeNormalize,
  conformRule,
  detectRule,
  excerptAt,
  type Finding,
  type Match,
  NARROW_NO_BREAK,
  NO_BREAK,
  RIGHT_SINGLE_QUOTE,
  type Rule,
  replaceRule,
  reveal,
  type Severity,
  THIN,
  type TypographyPack,
} from './pack.ts';
