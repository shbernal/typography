// A word-initial elision mark: `’s morgens`, `’t huis`, `’tis`, `’em`.
//
// Two callers now, Dutch and English, and they are the two languages here that
// elide at the *front* of a word. What they share is the whole difficulty and
// what they differ in is a word list.
//
// **Word-initial is where an apostrophe and an opening single quotation mark are
// the same character in the same place.** `'s morgens` is an elision and
// `'strand'` is a quoted word; `'tis` is an elision and `'em'` is the CSS unit
// named in single quotes. No amount of lookaround distinguishes those in
// general. What does distinguish them is that the elisions are a short list the
// standard enumerates and every one of them ends at a boundary, so a following
// space or hyphen closes it. The quoted forms fail on that: `'strand'` has `t`
// after the `s`, and `'em'` has a quote where a boundary would be.
//
// So this rule is fixable only because the clitic set is closed and the boundary
// after it is required. Widening either one turns it into a rule that retypes the
// opening quotation mark of any quoted word beginning with one of those letters,
// which is a defect the style would be introducing rather than finding. That is
// also why `'n'` is in no caller's set: `rock 'n' roll` and `the letter 'n'` are
// the same characters in the same positions, and the second is a quotation.

import { RIGHT_SINGLE_QUOTE, type Rule, replaceRule } from '../pack.ts';
import { wrongApostropheMarks } from './apostrophe.ts';

export function apostropheElision(spec: {
  /** Everything that turns up in this position and is not U+2019. Shared with
   * the style's other apostrophe rules, which is why it is a parameter. */
  wrong: string;
  /**
   * The words that may carry one, as an alternation body: `(?:ns|[stnkmr])` for
   * Dutch, `(?:twas|tis|em)` for English.
   *
   * **Order the branches longest first.** The engine takes the first branch that
   * matches, so `n` before `ns` would strand the `s` of `'ns` and `tis` before
   * `twas` is only safe because they share no prefix.
   */
  clitics: string;
  /** What has to close the clitic, as a lookahead body. Dutch takes a space or a
   * hyphen (`'s-Gravenhage`); English also takes the end of a sentence. This is
   * the half of the narrowing that holds the rule off a quoted word, so a caller
   * widening it should read the header first. */
  boundary: string;
  /** Two of them, without the mark, for the summary: `['s', 't']` reads as
   * "such as `’s` or `’t`". Checked against `clitics` at construction, so the
   * sentence in the report cannot come to describe a set the pattern does not
   * have. */
  examples: readonly string[];
  cite: string;
}): Rule {
  const member = new RegExp(`^(?:${spec.clitics})${spec.boundary}`, 'u');
  // A space closes every caller's boundary, which is what makes one probe
  // enough. The failure this catches is the ordinary one: a set narrowed
  // without narrowing the sentence beside it.
  for (const example of spec.examples)
    if (!member.test(`${example} `))
      throw new Error(
        `apostropheElision: ${JSON.stringify(example)} is offered as an example of the clitic ` +
          'set and is not in it, so the summary would describe a rule this is not.',
      );

  const such = spec.examples.map((word) => `\`${RIGHT_SINGLE_QUOTE}${word}\``).join(' or ');
  return replaceRule({
    id: 'apostrophe-elision',
    summary: `${wrongApostropheMarks(spec.wrong)} on a word-initial elision such as ${such}`,
    cite: spec.cite,
    pattern: new RegExp(
      `(?<![\\p{L}\\p{N}])${spec.wrong}(?=${spec.clitics}${spec.boundary})`,
      'gu',
    ),
    replacement: RIGHT_SINGLE_QUOTE,
  });
}
