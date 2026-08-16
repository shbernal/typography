// A closing `?` or `!` whose sentence never opened one.
//
// Two rules, one Spanish, and the family that shaped this package's central
// type. RAE requires both halves, and omitting the opening one is the single
// most common defect in Spanish written by speakers of languages that have no
// opening mark, which is to say in most translated Spanish.
//
// **Detecting it is a regex and a backward scan; fixing it is a parse.** Knowing
// the sentence has no opening mark does not tell you where the *interrogative
// clause* began, and in Spanish the mark goes at the start of the clause rather
// than of the sentence. `Si vienes, ¿me avisas?` is correct and no substitution
// could have produced it. A rule that guessed would move a mark into the middle
// of somebody's prose, silently and in the one place a reader is least likely to
// re-read.

import { detectRule, type Match, type Rule } from '../pack.ts';
import { looksMachine } from '../prose.ts';

/** Ends a sentence for the purpose of the backward scan. */
const SENTENCE_END = /[.!?\n…]/;

/** What a sentence can end on. Rules out `??`, `!!`, a bare `?` after a bracket,
 * and most of what a placeholder or a template looks like. */
const CAN_PRECEDE = /[\p{L}\p{N}\p{Pf}\p{Pe}'’]/u;

export function unpairedMark(spec: {
  id: string;
  /** The closing mark, which is also the character the rule scans for. */
  mark: string;
  /** The mark that should have opened the sentence. */
  opener: string;
  cite: string;
}): Rule {
  return detectRule({
    id: spec.id,
    summary: `Sentence ends in \`${spec.mark}\` with no opening \`${spec.opener}\``,
    cite: spec.cite,
    pattern: new RegExp(spec.mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    refine: (match, value) => unpaired(value, match.index, spec.opener),
  });
}

/**
 * The backward scan, as far as a safe implementation goes.
 *
 * Returns the match to report, or null when the text is fine or when the
 * character is not being used as punctuation at all.
 */
function unpaired(value: string, index: number, opener: string): Match | null {
  if (looksMachine(value, index)) return null;

  const before = value[index - 1];
  if (!before || !CAN_PRECEDE.test(before)) return null;

  for (let i = index - 1; i >= 0; i--) {
    const ch = value[i]!;
    if (ch === opener) return null;
    if (SENTENCE_END.test(ch)) break;
  }
  return { index, length: 1 };
}
