// Telling prose from machine text. Internal, like `de-common.ts`: there is no
// subpath export and nothing here is a rule.
//
// Several check-only rules are about a character that carries punctuation in a
// sentence and syntax in a token. `a ? b : c` is a ternary, `1 : 2` is a ratio,
// `https://x/y?a=1` is a URL, and all three are the same characters a rule about
// spacing before `; : ! ?` is looking for. A rule with no way to tell them apart
// reports a fenced code block line by line, which is how a check-only rule stops
// being read at all.
//
// **Why this is shared where `ANY_SPACE` deliberately is not.** `es.ts` and
// `de-common.ts` each spell out their own space classes, and the comment there
// says why: the day RAE and Duden disagree, a shared constant has to be split by
// whoever is holding the release. That argument is about rule content. This is
// not rule content. No standards body has an opinion about what a URL looks
// like, and a URL is a URL under the Ortografía and under the Duden alike, so
// there is no disagreement here for a release to have to split. Two copies of it
// would be the failure this package is about, one level down: a heuristic
// written twice, required to agree about what counts as machine text, with
// nothing keeping it that way. They had already drifted - Spanish filtered and
// German did not, while the German rule's comment cited the Spanish reasoning.

/**
 * How far either scan below will walk before giving up. Every `?` and `!` in a
 * value pays this, so an uncapped scan is quadratic in the length of an unbroken
 * run: `a?` repeated to 8,000 characters took 1.7 s, and the values here are
 * whole documents. A token longer than this is not a word in any of these
 * languages under any reading, so the cap costs nothing a reader would want back.
 */
const TOKEN_SCAN = 128;

/**
 * The whitespace-delimited token containing `index`, or null when it runs past
 * `TOKEN_SCAN` characters in either direction.
 *
 * The cheap signal that separates a URL from a sentence is that the URL has no
 * spaces in it and carries `/` or `=`, so the token is the unit to look at.
 */
function token(value: string, index: number): string | null {
  const floor = Math.max(0, index - TOKEN_SCAN);
  const ceiling = Math.min(value.length, index + TOKEN_SCAN);
  let from = index;
  let to = index;
  while (from > floor && !/\s/.test(value[from - 1]!)) from--;
  while (to < ceiling && !/\s/.test(value[to]!)) to++;
  const bounded =
    (from === 0 || /\s/.test(value[from - 1]!)) && (to === value.length || /\s/.test(value[to]!));
  return bounded ? value.slice(from, to) : null;
}

/**
 * True when the token around `index` looks like a URL, a query string, a path or
 * an identifier rather than prose.
 *
 * Deliberately crude: it is a filter on a report, so a miss costs a false
 * positive that a human reads and dismisses.
 *
 * A token too long to scan counts as machine text, which is the conservative
 * direction: it suppresses a finding rather than inventing one, and 128 unbroken
 * characters of prose do not occur in any of these languages.
 */
export function looksMachine(value: string, index: number): boolean {
  const t = token(value, index);
  if (t === null) return true;
  return t.includes('://') || t.includes('=') || t.includes('/') || t.startsWith('-');
}
