// The protocol. Types, the two rule constructors, and the helper that makes an
// invisible finding visible. This module imports nothing, including from itself:
// a pack is a plain object satisfying a structural type, so a consumer can adopt
// one without adopting anything else here.
//
// The shape below is driven by one finding: `check` is a superset of `fix`.
//
// A Spanish sentence ending in `?` with no opening `¿` is a real, detectable,
// high-value defect and it is *not* safely fixable, because inserting the `¿`
// means finding where the sentence began, which is a parse rather than a
// substitution. So a rule set has two subsets and the fixable one is smaller.
// `TypographyPack.normalize` is the fix set and only the fix set.
//
// The other thing this file is careful about: a rule that could both find and
// fix must not be written twice. Two implementations of one rule drift silently,
// which is the defect this whole package exists to catch one level down. So
// `replaceRule` derives both behaviours from a single pattern, and there is
// nothing to keep in agreement.
//
// There are three constructors rather than two because a standard can admit two
// spellings of one thing. When it does, a rule with a literal replacement has to
// pick one, and picking either retypes text that was already correct in the
// other. `conformRule` is for that case: it matches only what is wrong under
// *both* readings and spells the repair the way the text already spells it.

/** How bad a finding is. Advisory: nothing in this package branches on it, but a
 * host filtering a report needs the axis and inventing it per host is worse. */
export type Severity = 'error' | 'warning';

/** Where a rule matched, as an offset into the value it was given. */
export interface Match {
  readonly index: number;
  readonly length: number;
}

/**
 * One typographic rule from one standard.
 *
 * `find` always exists. `fix` exists only when applying the rule unattended is
 * safe *and* idempotent, and its absence is the interesting information: it says
 * a human or a model has to decide, not that nobody got round to it.
 */
export interface Rule {
  /** Stable, `<lang>.<name>`. It appears in reports and in committed gate counts,
   * so renaming one is a breaking change to a baseline. */
  readonly id: string;
  /** One line, in English, saying what is wrong rather than what to do. */
  readonly summary: string;
  /** The clause this comes from. A rule with no citation does not belong in a
   * pack; that is the line between a standard and a house style. */
  readonly cite: string;
  readonly severity: Severity;
  readonly find: (value: string) => Match[];
  /** Present if and only if the rewrite is safe unattended. */
  readonly fix?: (value: string) => string;
}

/** A rule match, resolved against the text it was found in. */
export interface Finding extends Match {
  readonly rule: string;
  readonly summary: string;
  readonly cite: string;
  readonly severity: Severity;
  /** True when the pack's `normalize` would repair this without being asked.
   * The false ones are the point of the `check` verb. */
  readonly fixable: boolean;
  /** 1-based, so a report line is `file:line:column` and an editor can jump to
   * it. Resolved here rather than by each consumer, since every consumer needs
   * it and the offset alone is unusable in a report. */
  readonly line: number;
  readonly column: number;
  /** A window around the match with the invisible characters named. Never the
   * raw slice: see `reveal`. */
  readonly excerpt: string;
}

/**
 * A language's rules.
 *
 * `id` is the era stamp. It is `<lang>@<version>` where the version is the
 * *pack's* and moves only when a rule changes, never when the package publishes
 * a README fix. A corpus normalized under `fr@0.1.0` and one normalized under
 * `fr@0.2.0` are two typography eras, and a stamp that cannot tell them apart
 * is worse than no stamp: every row is individually correct and nothing compares
 * two rows.
 *
 * `lang` is a BCP 47 tag and is as specific as the convention requires. There is
 * no bare `de`, because there is no German convention to attach it to: `de-DE`
 * and `de-AT` point their quotation marks one way and `de-CH` points them the
 * other. `fr` and `es` are bare because at this level of detail those languages
 * really are one convention.
 *
 * This type is a superset of what `translation-harness` binds through
 * `job.normalize`, which needs `{ id, normalize }` and nothing else. That is
 * deliberate and is why `normalize` is a property rather than a method on a
 * class: a pack satisfies the harness's protocol structurally, with no import
 * and no registration call in either direction.
 */
export interface TypographyPack {
  readonly id: string;
  readonly lang: string;
  /** Human-readable, for a report header: "Imprimerie nationale". */
  readonly standard: string;
  readonly rules: readonly Rule[];
  /** Every fixable rule applied in `rules` order. Idempotent. */
  readonly normalize: (value: string) => string;
}

// ---------------------------------------------------------------------------
// Rule constructors
// ---------------------------------------------------------------------------

/**
 * A rule that finds and fixes from one pattern.
 *
 * The pattern must be global, and the same pattern drives both behaviours, so
 * the report and the rewrite cannot disagree about what the rule matches. That
 * is the whole reason this constructor exists rather than a `{ find, fix }`
 * literal.
 *
 * **An inserting rule has to match its own output**, or `normalize` is not
 * idempotent and a backfill never converges: a pattern matching zero spaces
 * inside a guillemet would find a fresh zero-space match in the space it just
 * inserted. So the French guillemet rules match zero *or more* spaces, including
 * the no-break forms, and rewrite the already-correct form to itself.
 *
 * That is also why `find` filters. A match whose text already equals the
 * replacement changed nothing, and reporting it would tell a user their correct
 * guillemets are wrong. The filter is exact rather than heuristic because
 * `replacement` is required to be a literal: no `$1`, no `$&`. Every rule this
 * package has needed is literal, since the interesting ones use lookaround to
 * hold context rather than capturing it.
 */
export function replaceRule(spec: {
  id: string;
  summary: string;
  cite: string;
  severity?: Severity;
  pattern: RegExp;
  replacement: string;
}): Rule {
  const { id, summary, cite, pattern, replacement } = spec;
  assertGlobal(pattern, id);
  if (replacement.includes('$'))
    throw new Error(`rule ${id}: replacement must be a literal, with no $ substitution`);
  return {
    id,
    summary,
    cite,
    severity: spec.severity ?? 'error',
    find: (value) =>
      matches(pattern, value).filter(
        (m) => value.slice(m.index, m.index + m.length) !== replacement,
      ),
    fix: (value) => value.replace(fresh(pattern), replacement),
  };
}

/**
 * A rule that repairs to whichever admissible spelling the text already uses.
 *
 * Reach for this when the standard admits two spellings of one thing and the
 * defect is using neither. The French guillemet is the measured case: the
 * Lexique typesets its own guillemets with U+202F while its own table specifies
 * U+00A0, and two French publishers use U+00A0 for 6,254 of 6,256 guillemets
 * across 2.4M characters. A rule with a literal replacement has to choose, and
 * either choice rewrites correctly set text into the other convention. So the
 * pattern matches only spacing that is wrong under *both* readings, and `choose`
 * reads the text to decide which of the two the repair is spelled in.
 *
 * This is the one rule kind whose output depends on more than the match and its
 * neighbours, which buys the property the alternative cannot have: `fix` never
 * introduces a spelling the document was not already using.
 *
 * **`choose` must be stable under its own fix**, or `normalize` is not
 * idempotent. A `choose` that counts spellings has to break a tie toward a fixed
 * side, so that applying the fix moves the count further toward the side already
 * chosen rather than away from it. `test/packs.test.ts` asserts idempotence per
 * rule and per pack, and does not care why it holds.
 */
export function conformRule(spec: {
  id: string;
  summary: string;
  cite: string;
  severity?: Severity;
  pattern: RegExp;
  /** The spelling this text should be repaired in. Called once per value. */
  choose: (value: string) => string;
}): Rule {
  const { id, summary, cite, pattern, choose } = spec;
  assertGlobal(pattern, id);
  return {
    id,
    summary,
    cite,
    severity: spec.severity ?? 'error',
    find: (value) => {
      const replacement = choose(value);
      return matches(pattern, value).filter(
        (m) => value.slice(m.index, m.index + m.length) !== replacement,
      );
    },
    // A replacer function rather than a replacement string, so a `$` in whatever
    // `choose` returns is a dollar sign and not a substitution. `replaceRule` can
    // reject that at construction; here the value does not exist until call time.
    fix: (value) => {
      const replacement = choose(value);
      return value.replace(fresh(pattern), () => replacement);
    },
  };
}

/**
 * A rule that reports and does not rewrite.
 *
 * Reach for this when the repair needs information the pattern does not have.
 * The Spanish opening-mark rules are the case that shaped the type: the defect
 * is unambiguous and its location is not.
 */
export function detectRule<S = undefined>(spec: {
  id: string;
  summary: string;
  cite: string;
  severity?: Severity;
  pattern: RegExp;
  /** Computed once per value, before any match is examined, and handed to every
   * `refine` call. Reach for this when whether a match is a defect depends on
   * the rest of the value: surveying the whole value inside `refine` is
   * quadratic in its length, and a value here is a whole document. */
  survey?: (value: string) => S;
  refine?: (match: RegExpExecArray, value: string, survey: S) => Match | null;
}): Rule {
  const { id, summary, cite, pattern, survey, refine } = spec;
  assertGlobal(pattern, id);
  return {
    id,
    summary,
    cite,
    severity: spec.severity ?? 'error',
    find: (value) => {
      const surveyed = (survey ? survey(value) : undefined) as S;
      const out: Match[] = [];
      for (const m of value.matchAll(fresh(pattern))) {
        const kept = refine ? refine(m, value, surveyed) : { index: m.index, length: m[0].length };
        if (kept) out.push(kept);
      }
      return out;
    },
  };
}

/** Compose a pack's fixable rules into one `normalize`, in declaration order.
 * Order is load-bearing and is the pack's to choose: the French rules convert a
 * plain space before a colon and then, separately, before `; ! ?`, and the two
 * would fight over `?:` if they were reordered carelessly. */
export function composeNormalize(rules: readonly Rule[]): (value: string) => string {
  const fixes = rules.flatMap((r) => (r.fix ? [r.fix] : []));
  return (value) => fixes.reduce((acc, fix) => fix(acc), value);
}

// ---------------------------------------------------------------------------
// Making a finding visible
// ---------------------------------------------------------------------------

/** U+00A0, the full no-break space. */
export const NO_BREAK = ' ';
/** U+202F, the narrow no-break space. Imprimerie nationale distinguishes the two
 * and Unicode encodes them separately, so a pack that used one for both would be
 * wrong in a way no reader could see. */
export const NARROW_NO_BREAK = ' ';
/** U+2009, the thin space. The trap in this family: it is the right *width* and
 * the wrong breaking behaviour, so a proof looks correct and the line comes
 * apart in a browser. 18 of them sit inside guillemets in the French corpora,
 * which is why the rules name it rather than treating it as an ordinary space. */
export const THIN = String.fromCharCode(0x2009);
/** U+2019, the right single quotation mark, used as the French apostrophe. */
export const RIGHT_SINGLE_QUOTE = '’';

/**
 * Name the invisible characters in a string.
 *
 * Every finding this package produces is about a character that renders as a
 * space or as a mark indistinguishable from another mark. A report that printed
 * the raw slice would show a reader two identical-looking strings and a model an
 * unresolvable diff, and it would look completely fine. This is the one helper
 * a consumer rediscovers painfully, so it ships.
 */
export function reveal(text: string): string {
  return JSON.stringify(text)
    .replaceAll(NO_BREAK, '<NBSP>')
    .replaceAll(NARROW_NO_BREAK, '<NNBSP>')
    .replaceAll(THIN, '<THINSP>')
    .replaceAll(RIGHT_SINGLE_QUOTE, '<RSQUO>')
    .replaceAll('«', '<LAQUO>')
    .replaceAll('»', '<RAQUO>');
}

/** A revealed window around a match, for a report line. */
export function excerptAt(value: string, at: Match, radius = 25): string {
  const from = Math.max(0, at.index - radius);
  const to = Math.min(value.length, at.index + at.length + radius);
  return reveal(value.slice(from, to));
}

// ---------------------------------------------------------------------------

/** A fresh copy, so a global pattern's `lastIndex` is never shared between two
 * calls. Passing a global regex around and reusing it is the classic way to get
 * a rule that finds a defect on the first row and misses it on the second. */
function fresh(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

function assertGlobal(pattern: RegExp, id: string): void {
  if (!pattern.global) throw new Error(`rule ${id}: pattern must be global`);
}

function matches(pattern: RegExp, value: string): Match[] {
  return [...value.matchAll(fresh(pattern))].map((m) => ({ index: m.index, length: m[0].length }));
}
