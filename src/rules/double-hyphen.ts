// Two hyphens between two words, which is a dash typed on a typewriter.
//
// One caller, English, because it is the language whose writers are told to
// type one: both manuals describe the double hyphen as what a manuscript uses
// where typeset text takes a dash. It is also what a model emits when it has
// been told to avoid the dash character itself, which is the reason this style
// has the rule at all.
//
// **Check-only, and the two reasons are worth keeping apart.**
//
// The first is that `--` between two letters is a dash in prose and a modifier
// in a stylesheet: `.button--primary` is BEM, `example.com/a--b` is a slug, and
// nothing in the pattern separates either from `wait--no`. `looksMachine` sees
// the slug, because the token carries a `/`, and does not see the stylesheet.
// A report a reader dismisses costs a line; a rewrite of somebody's class name
// costs a build. That asymmetry is the one `space-before-punctuation.ts` works
// through at length, and it lands in the same place.
//
// The second is that there is no repair to write. Chicago closes an em dash up
// and Oxford sets a spaced en dash, so **the dash convention is exactly the kind
// of divergence a style here must not settle**: repairing in either spelling
// retypes text that is correct in the other. What is wrong under both readings
// is the double hyphen, so that is what is reported, and the summary names both
// admissible spellings rather than choosing one. `fr`'s guillemet width is the
// same stance where a repair *was* available; here the position holds no
// character to conform to, so there is nothing for a ballot to count.
//
// Neither reason has an escape hatch that would make this fixable. The two
// constructors that repair take a pattern and no predicate, deliberately, so
// that a rule cannot report one thing and rewrite another; a repair that first
// has to decide whether it is looking at prose is not a substitution.

import { detectRule, type Rule } from '../pack.ts';
import { looksMachine } from '../prose.ts';

export function doubleHyphen(spec: {
  /** Completes `Double hyphen between words; ...`: what this style sets
   * instead, named as code points because the two dashes and the hyphen are
   * three characters a reader cannot tell apart in a report. */
  instead: string;
  cite: string;
}): Rule {
  return detectRule({
    id: 'double-hyphen',
    summary: `Double hyphen between words; ${spec.instead}`,
    cite: spec.cite,
    // A letter on each side, so `--flag`, a `---` rule and the `--` that
    // separates a command's arguments from its own are all outside it. Exactly
    // two hyphens, so nothing here can match a run more than one way.
    pattern: /(?<=\p{L})--(?=\p{L})/gu,
    refine: (match, value) =>
      looksMachine(value, match.index) ? null : { index: match.index, length: 2 },
  });
}
