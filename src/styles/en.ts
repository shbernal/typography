// English orthotypography: what Chicago and New Hart's Rules agree on.
//
// This package said for four releases that it would never have this style, and
// the argument it gave was about authority: the Oxford comma is not a national
// standard, so a pack asserting one would smuggle a preference in under a
// standards body's banner. That argument was answered by changing the question.
// A style here is a named bundle of rules with defaults, not a delegation from a
// standards body, and what it is for is uniformity: twelve generations of the
// same content coming back with the same typography. English has no Imprimerie
// nationale and it still has an apostrophe that is either U+2019 or wrong.
//
// **The Oxford comma is still not here, and now for a reason that generalises.**
// Chicago requires it and other authorities forbid it, so it is a divergence,
// and this style's answer to a divergence is the one `fr` arrived at over the
// no-break space: rule on what is wrong under *both* readings and leave the rest
// alone. Nothing about a serial comma is wrong under both readings, so there is
// no rule to write. Finding the last item of a list is also a parse rather than a
// substitution, which would have made it check-only even if the authorities
// agreed.
//
// **What the divergences did leave.** Two of them reach rules that ship. The
// dash convention is one, and `rules/double-hyphen.ts` carries it: Chicago
// closes an em dash up and Oxford sets a spaced en dash, both agree the double
// hyphen is neither, so the double hyphen is reported and the summary names both
// repairs rather than picking one. Which pair of quotation marks is primary is
// the other, and it reaches `straight-double-quote`'s sentence and nothing else,
// because converting a straight quote to either pair is a parse. Neither
// divergence is omitted and neither is settled.
//
// **One bare `en`, and no `en-US` or `en-GB`.** Every rule below is one both
// manuals state, so there is nothing in this list for a region tag to change:
// the two places they differ are a rule that reports without repairing and a
// rule that does not exist. That is the same test that gives German two styles
// and Dutch one, read a third way. The day a rule here needs to know the region
// is the day the tag is earned, and a tag that names a region it does not use
// is a stamp that claims a distinction the rules do not make.
//
// **What is deliberately missing, and it is the most valuable rule in the
// language.** A straight double quote is what a model emits by default, so
// converting `"..."` into a curly pair would be worth more than everything below
// put together. It is a parse: the two ends are the same character, so choosing
// between an opening and a closing mark means pairing across a document, and a
// `"` inside a code token has to survive it. The single-quote half is worse,
// since U+2019 is the closing mark *and* the apostrophe, which is the count
// `src/styles/nl.ts` carries. So English reports it, like every other style here, and
// this package does not guess.
//
// **Measured once, on 6.66M characters of English, and the run is not a gate.**
// Ten Project Gutenberg books through `check` and `audit`: zero false positives,
// zero property violations, and the rules were reached rather than merely quiet.
// Every finding in the whole corpus came from the one edition Gutenberg ships
// from plain text, which carries no U+2019 and no curly double quote anywhere.
// `docs/provenance.md` has the counts, the two rules it could not reach, and the
// ceiling it found.
//
// Citations name a topic rather than a section, on purpose. The two manuals
// number differently and every rule below is asserted only because both of them
// say it, so a citation pointing at one manual's paragraph would be half the
// source.

import { compose } from '../compose.ts';
import { LEFT_SINGLE_QUOTE, type Rule, type Style } from '../pack.ts';
import { apostrophe } from '../rules/apostrophe.ts';
import { apostropheElision } from '../rules/apostrophe-elision.ts';
import { decadeApostrophe } from '../rules/decade-apostrophe.ts';
import { doubleHyphen } from '../rules/double-hyphen.ts';
import { spaceBeforePunctuation } from '../rules/space-before-punctuation.ts';
import { straightDoubleQuote } from '../rules/straight-double-quote.ts';

const CHICAGO = 'The Chicago Manual of Style (17th ed., 2017)';
const HART = "New Hart's Rules (Oxford, 2014)";

/** Both manuals on one topic, which is the only kind of citation this style
 * has: a rule here exists because they agree, so a citation naming one of them
 * would be evidence for a claim this style does not make. */
const agreed = (topic: string) => `${CHICAGO} and ${HART}, on ${topic}`;

/**
 * Everything that turns up where an English apostrophe belongs and is not one.
 *
 * The wide class, as in Dutch and unlike French and German, and the argument is
 * structural here rather than measured. U+2018 opens a quotation, and a
 * quotation does not open between two letters or in front of a decade. What
 * puts it in those positions is a smart-quote pass meeting a leading straight
 * quote, which turns it into U+2018 where U+2019 belongs: `'90s` and `'tis`
 * come back opening a quotation that never closes. That is the most-cited
 * typographic defect in English and the reason two of the three rules below
 * exist. The two marks differ by which way they curl, which at a report's font
 * size is nothing, so it is also a defect that survives proofreading.
 */
const WRONG_APOSTROPHE = `['${LEFT_SINGLE_QUOTE}]`;

const rules: readonly Rule[] = [
  // The plainest rule in the package and the one that does the most work here.
  // English elides constantly - `it's`, `don't`, `o'clock` - and a model emits
  // the straight form by default, so this is most of what `fix --style en`
  // repairs on ordinary generated prose.
  //
  // Measured: 5,204 correctly set apostrophes left alone and 95 straight ones
  // repaired, over 6.66M characters, with no false positive. **What it cannot
  // reach is the possessive that follows the `s`**, and the corpus priced it:
  // `bricklayers' unions` and `goodness' sake` keep their straight mark in a
  // document where `day's` beside them has been repaired, because a word-final
  // apostrophe and a closing single quotation mark are the same character in the
  // same position. That is the U+2019 collision `src/styles/nl.ts` counts, in a
  // third position, and its consequence is sharper than a missed repair: `check`
  // does not report those two either, so `fix` returns a document carrying both
  // marks and the report afterwards says it is clean. A ceiling rather than a
  // defect, since choosing between the two is the parse this style declines in
  // `straight-double-quote` for the same reason.
  apostrophe({
    language: 'English',
    wrong: WRONG_APOSTROPHE,
    cite: agreed('the apostrophe'),
  }),

  // `'tis`, `'twas`, `'em`. The set is short because the boundary is what makes
  // the rule safe and a longer set spends that safety: `'cause`, `'round` and
  // `'bout` are the same shape, and so is a quoted word beginning with any of
  // those letters. `'n'` is excluded outright, which the builder's header
  // explains: `rock 'n' roll` and `the letter 'n'` are the same characters in
  // the same positions.
  apostropheElision({
    wrong: WRONG_APOSTROPHE,
    // Longest first, so `twas` is not shadowed by a shorter branch. The two that
    // remain share no prefix.
    clitics: '(?:twas|tis|em)',
    // Wider than Dutch's, because English elides in a sentence rather than
    // inside a name: `give ’em hell`, `’tis the season.` A quotation mark is
    // deliberately not in here, and it is the whole narrowing. `'em'` is the CSS
    // unit named in single quotes and it fails this lookahead, so the rule
    // leaves it alone.
    boundary: '(?:[\\s.,;:!?)]|$)',
    examples: ['tis', 'em'],
    cite: agreed('the apostrophe'),
  }),

  decadeApostrophe({
    wrong: WRONG_APOSTROPHE,
    cite: agreed('the apostrophe before a shortened decade'),
  }),

  // -------------------------------------------------------------------------
  // Check only. Detectable, and not safely repairable by substitution.
  // -------------------------------------------------------------------------

  // The rule this style has instead of a dash convention. Both manuals agree
  // that two hyphens are what a manuscript uses and typeset English does not,
  // and they disagree about what replaces them, so this reports and names both.
  doubleHyphen({
    instead: 'English sets a dash, U+2014 closed up or U+2013 spaced',
    cite: agreed('dashes'),
  }),

  // The same builder, the same filter and the same argument as in Spanish,
  // German and Dutch. What is English about it is how the defect arrives: not a
  // translator carrying French spacing over, but a model that has been reading
  // French all morning.
  spaceBeforePunctuation({
    language: 'English',
    cite: agreed('spacing around punctuation'),
  }),

  // English is the one style here whose two admissible pairs are ranked
  // differently by its two sources rather than by a region: Chicago sets the
  // double pair first with the single pair nested inside it, Oxford the other
  // way round. Neither of them is a straight quote, which is all this rule
  // needs, and choosing an end is still the parse the builder describes.
  //
  // The summary says "double or single" rather than showing the four marks,
  // because a summary is not passed through `reveal` and the two curly pairs
  // are exactly the characters a reader cannot tell apart in a report.
  straightDoubleQuote({
    instead: 'English quotation marks are a matched curly pair, double or single',
    cite: agreed('quotation marks'),
  }),
];

/**
 * The English style.
 *
 * `normalize` carries the three apostrophe rules and none of the three
 * detections, which is a narrower fix set than the ratio suggests: two of the
 * three repairs are about one character, and the third is the same character in
 * front of a digit.
 *
 * `standard` names two manuals and the stance between them, because a report
 * header claiming either one on its own would be claiming more than any rule
 * here does.
 */
export const en: Style = compose({
  name: 'en',
  lang: 'en',
  standard: "Chicago and New Hart's Rules, where they agree",
  rules,
});

export default en;
