// Every rule builder, for somebody composing a style of their own.
//
// A subpath rather than part of the root export, `@shbernal/typography/rules`.
// The root is the protocol and the five shipped bundles, which is what a
// consumer who wants "check my French" needs; this is the drawer of parts, and
// it is a wider surface than most callers should have to read past.
//
// **What a builder is.** A family of rules that differ in their parameters and
// not in their pattern, with the parameter list as the record of what has ever
// actually varied. `apostrophe` takes the class of marks that are wrong and
// nothing else, because that is the only thing three languages ever disagreed
// about; `innerSpace` takes the mark, the side, and what the correct spacing is,
// which is how one builder produces both "delete the space" and "require a
// no-break one" from the same skeleton.
//
// A rule these do not cover is written with `replaceRule`, `conformRule` or
// `detectRule` from the root export. Two things are worth knowing before doing
// that. **`check` is a superset of `fix`**: a rule whose repair needs
// information the pattern does not have gets a `find` and no `fix`, and guessing
// at the repair is the one thing this package will not do. And **an inserting
// rule has to match its own output**, or `normalize` never converges.
//
// Then `compose` the list, and `audit` it against text that reaches the rules.

export { apostrophe } from './apostrophe.ts';
export { apostropheAfterSymbol } from './apostrophe-after-symbol.ts';
export { apostropheElision } from './apostrophe-elision.ts';
export { type Ballot, ballot, type Tally } from './ballot.ts';
export { colonSpacing } from './colon-spacing.ts';
export { type Guillemet, guillemetDirection } from './guillemet-direction.ts';
export { ijCapital } from './ij-capital.ts';
export { type InnerSpacing, innerSpace } from './inner-space.ts';
export { minorityReport } from './minority-report.ts';
export { missingPunctuationSpace } from './missing-punctuation-space.ts';
export { openingMarkSpace } from './opening-mark-space.ts';
export { ANY_SPACE, ANY_SPACE_OR_THIN, runStart } from './space.ts';
export {
  requireSpaceBeforePunctuation,
  spaceBeforePunctuation,
} from './space-before-punctuation.ts';
export { conform, impose, type Spelling } from './spelling.ts';
export { straightDoubleQuote } from './straight-double-quote.ts';
export { unpairedMark } from './unpaired-mark.ts';
