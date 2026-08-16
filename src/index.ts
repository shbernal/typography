// The root export: the protocol, the composition layer, the runner and the
// registry of shipped styles.
//
// A consumer that wants one language should import one subpath instead
// (`@shbernal/typography/fr`), which is why the styles are re-exported here by
// name rather than being the headline. Importing this module pulls all five,
// which costs a few kilobytes of regular expressions and no dependencies.
//
// **The headline is `compose`.** A shipped style is a rule list with a name and
// nothing else, so anything this package ships, a user can build: take `fr`'s
// rules and drop one, take the builders in `rules/` and assemble a bundle that
// answers to nobody, name it, and it stamps and reports exactly the way `fr`
// does. `derive` is the same thing starting from a shipped list, and it is the
// one to reach for first, because its three verbs break loudly when the base
// moves under them.
//
// What is *not* re-exported here: `surveyWidth` and `withWidth`, which live on
// `@shbernal/typography/fr`. They are about a question only French currently
// has, the sources admitting two spellings of the no-break space, and a bare
// `withWidth` in the root namespace would read as though every style had a width
// to impose. The general half of that shape is `ballot` plus `conform`, and the
// half that does not generalise is the imposing: imposing one no-break space is
// a substitution, and imposing one quotation system is not, because U+2019 is
// both the closing single quotation mark and the apostrophe and no pattern
// separates them. `src/nl.ts` carries the count.

export { check, fix, styleFor, styles, unfixable } from './check.ts';
export { audit, compose, derive, stampOf, type Violation } from './compose.ts';
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
  type Style,
  THIN,
} from './pack.ts';
