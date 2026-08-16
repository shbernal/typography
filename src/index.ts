// The root export: the protocol, the runner and the registry.
//
// A consumer that wants one language should import one subpath instead
// (`@shbernal/typography/fr`), which is why the packs are re-exported here by
// name rather than being the headline. Importing this module pulls all five,
// which costs a few kilobytes of regular expressions and no dependencies.
//
// What is *not* re-exported here: `surveyWidth` and `withWidth`, which live on
// `@shbernal/typography/fr`. They are about a question only French has - the
// standard admitting two spellings of the no-break space - and a bare
// `withWidth` in the root namespace would read as though every pack had a width
// to impose. If a second language ever admits two spellings, that is when the
// shape gets generalised, and not before.
//
// A second language now does, and the shape was still not generalised. Dutch
// admits three systems of quotation mark and `mixed-quotation-marks` reports
// a document that mixes them, which is the `mixed-no-break-space` half of the
// pattern arriving in a second language exactly as expected. The `withWidth`
// half did not survive the crossing: imposing one no-break space is a
// substitution, and imposing one quotation system is not, because U+2019 is both
// the closing single quotation mark and the apostrophe and no pattern separates
// them. `src/nl.ts` carries the count. So the generalisation this comment was
// holding the door open for turns out to be two shapes and not one, and only the
// reporting half travels.

export { check, fix, packFor, packs, unfixable } from './check.ts';
export { deCH } from './de-CH.ts';
export { deDE } from './de-DE.ts';
export { es } from './es.ts';
export { fr } from './fr.ts';
export { nl } from './nl.ts';
export {
  composeNormalize,
  conformRule,
  detectRule,
  excerptAt,
  type Finding,
  LEFT_SINGLE_QUOTE,
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
