// The protocol. Types, the three rule constructors, and the helper that makes an
// invisible finding visible. This module imports nothing, including from itself:
// a style is a plain object satisfying a structural type, so a consumer can adopt
// one without adopting anything else here.
//
// The shape below is driven by one finding: `check` is a superset of `fix`.
//
// A Spanish sentence ending in `?` with no opening `¿` is a real, detectable,
// high-value defect and it is *not* safely fixable, because inserting the `¿`
// means finding where the sentence began, which is a parse rather than a
// substitution. So a rule set has two subsets and the fixable one is smaller.
// `Style.normalize` is the fix set and only the fix set.
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
  /**
   * Stable, global, and **it names the position rather than the verdict**.
   *
   * Ids used to be `<lang>.<name>`, which filed Spanish's rule about the space
   * after `«` and French's rule about the same space after the same `«` under two
   * different names, differing only in what each one thought should be there. Under
   * composition a style is a bundle with defaults rather than a standards body,
   * so what a rule *is* comes from where it looks: `guillemet-open-space` is one
   * question, and deleting the space, requiring a no-break one and imposing a
   * width are three answers to it. A reader comparing two styles can then read
   * down one column.
   *
   * The consequence to keep in view is that the same id means opposite repairs in
   * two styles, deliberately, and that ids collide across styles by design. They
   * still have to be unique *within* a style, which `compose` refuses to build.
   *
   * Rule builders in `rules/` own their ids rather than taking one, so a style
   * cannot introduce a near-duplicate by naming a rule slightly differently. The
   * two builders that serve more than one position derive the id from the
   * position.
   */
  readonly id: string;
  /** One line, in English, saying what is wrong rather than what to do. */
  readonly summary: string;
  /** The clause this comes from. A rule with no citation does not belong in a
   * style; that is the line between a standard and a house style. */
  readonly cite: string;
  readonly severity: Severity;
  readonly find: (value: string) => Match[];
  /** Present if and only if the rewrite is safe unattended. */
  readonly fix?: (value: string) => string;
  /**
   * Everything that decides what this rule does and what it says, as one
   * string. The constructors build it; nothing else may.
   *
   * This is what `compose` hashes into a style's stamp, and the stamp is the
   * only record of what was applied to a body of text. So the property it needs
   * is one-directional and worth stating precisely: **two rules that behave or
   * report differently must have different signatures.** The converse is not
   * promised and does not matter, since a stamp that moves for nothing costs a
   * reader one comparison and a stamp that fails to move loses the evidence.
   *
   * A pattern and a literal replacement are data and go in whole. A `choose`, a
   * `survey` and a `refine` are closures and cannot, which is the one place this
   * could quietly lie: two rules with one pattern and two different `choose`
   * functions would sign the same. `withWidth` is exactly that case, twice over,
   * so the constructors take `params` for whatever a caller decided that the
   * pattern does not already carry, and the builders in `rules/` derive `params`
   * and the closure from the same declaration rather than from two. That is why
   * `InnerSpacing` and `requireSpaceBeforePunctuation` take a `Spelling` and not
   * a function: a parameter a builder cannot sign is a parameter a builder must
   * not accept.
   */
  readonly signature: string;
}

/** A rule match, resolved against the text it was found in. */
export interface Finding extends Match {
  readonly rule: string;
  readonly summary: string;
  readonly cite: string;
  readonly severity: Severity;
  /** True when the style's `normalize` would repair this without being asked.
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
 * A named bundle of rules.
 *
 * Not a language and not a standard. A style is a rule list with the parameters
 * its rules were built from, and the shipped ones are that and nothing more:
 * `fr` is a name for a set of defaults, not a claim to speak for the Imprimerie
 * nationale. A user composes their own with `compose`, or takes a shipped one
 * and changes it with `derive`, and what comes out is the same kind of thing.
 *
 * `id` is the era stamp, `<name>@<stamp>`, and **the stamp is derived from the
 * rules rather than declared**. That is the one property a hand-bumped version
 * could not have once a user can compose: a version only moves when somebody
 * remembers to move it, and nobody is holding the release for a bundle defined
 * in somebody's config file. Two corpora carrying one stamp were checked by the
 * same rules, provably, and two carrying different stamps were not. Every
 * consumer of this package should carry the stamp beside anything it normalized:
 * a corpus half-normalized under one era and half under another is individually
 * correct in every row and comparable in none, and the stamp is what tells the
 * two apart afterwards.
 *
 * `lang` is a BCP 47 tag, and optional because a style need not be about a
 * language. Where it is present it is as specific as the convention requires:
 * there is no bare `de`, because there is no German convention to attach it to,
 * while `fr` and `es` are bare because at this level of detail those languages
 * really are one convention.
 *
 * This type is a superset of what `translation-harness` binds through
 * `job.normalize`, which needs `{ id, normalize }` and nothing else. That is
 * deliberate and is why `normalize` is a property rather than a method on a
 * class: a style satisfies the harness's protocol structurally, with no import
 * and no registration call in either direction.
 */
export interface Style {
  /** `<name>@<stamp>`. Derived; see `compose`. */
  readonly id: string;
  /** What this bundle is called. `fr`, `de-CH`, `acme-house`. */
  readonly name: string;
  /** The derived half of `id`, on its own for a host that wants to compare two
   * styles without parsing the stamp back out of the id. */
  readonly stamp: string;
  /** The BCP 47 tag this style is for, where it is for one. */
  readonly lang?: string;
  /** Where the defaults came from, for a report header: "Imprimerie
   * nationale", "ACME house style v3". Provenance, not authority. */
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
  const severity = spec.severity ?? 'error';
  return {
    id,
    summary,
    cite,
    severity,
    // Nothing here is a closure, so the declaration is the signature.
    signature: signatureOf('replace', id, summary, cite, severity, pattern, [replacement]),
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
 * chosen rather than away from it. `test/styles.test.ts` asserts idempotence per
 * rule and per style, and does not care why it holds.
 */
export function conformRule(spec: {
  id: string;
  summary: string;
  cite: string;
  severity?: Severity;
  pattern: RegExp;
  /** The spelling this text should be repaired in. Called once per value. */
  choose: (value: string) => string;
  /**
   * What decided `choose`, as strings the stamp can hash.
   *
   * Required, and it is the only required field of its kind in this file,
   * because `choose` is always a closure and the pattern never carries what is
   * inside it. `withWidth` is the case that forces it: imposing U+00A0 and
   * imposing U+202F build character-for-character identical patterns and two
   * different `choose` functions, so without this the two would stamp the same
   * and a corpus normalized under either would be indistinguishable from one
   * normalized under the other.
   *
   * Pass `Spelling.signature` rather than a hand-written string. A builder that
   * writes this out separately from the thing it passed to `choose` has made two
   * copies that must agree, which is the defect this package is about one level
   * down.
   */
  params: readonly string[];
}): Rule {
  const { id, summary, cite, pattern, choose } = spec;
  assertGlobal(pattern, id);
  const severity = spec.severity ?? 'error';
  return {
    id,
    summary,
    cite,
    severity,
    signature: signatureOf('conform', id, summary, cite, severity, pattern, spec.params),
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
  /** What a *caller* decided that `survey` and `refine` close over. Optional
   * here and not in `conformRule`, because most detections narrow with a
   * predicate the builder owns outright: `looksMachine` is the same function for
   * every style that reaches for it, and a builder's own fixed `refine` is
   * carried by the id and the summary. `minorityReport` is the one that has to
   * pass something, since its ballot comes from the style. */
  params?: readonly string[];
}): Rule {
  const { id, summary, cite, pattern, survey, refine } = spec;
  assertGlobal(pattern, id);
  const severity = spec.severity ?? 'error';
  return {
    id,
    summary,
    cite,
    severity,
    signature: signatureOf('detect', id, summary, cite, severity, pattern, spec.params ?? []),
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

/** U+0000, which no field of a rule can contain once it has been JSON-encoded,
 * since `JSON.stringify` escapes it. Written as an escape and never as itself:
 * the character is invisible in a source file and turns the file into something
 * `grep` calls binary. */
const SEPARATOR = String.fromCharCode(0);

/**
 * Every part of a rule that a stamp has to see, in a form nothing can collide
 * in by accident.
 *
 * Each part is JSON-encoded before it is joined, so no field can end in the
 * separator and impersonate the next one. That is not a hypothetical worry
 * about hostile input; it is the ordinary way two stamps come to agree about
 * two different rule lists, and an agreeing stamp is silent.
 */
function signatureOf(
  kind: string,
  id: string,
  summary: string,
  cite: string,
  severity: Severity,
  pattern: RegExp,
  params: readonly string[],
): string {
  return [kind, id, summary, cite, severity, pattern.source, pattern.flags, ...params]
    .map((part) => JSON.stringify(part))
    .join(SEPARATOR);
}

/** Compose a style's fixable rules into one `normalize`, in declaration order.
 * Order is load-bearing and is the style's to choose: the French rules convert a
 * plain space before a colon and then, separately, before `; ! ?`, and the two
 * would fight over `?:` if they were reordered carelessly. */
export function composeNormalize(rules: readonly Rule[]): (value: string) => string {
  const fixes = rules.flatMap((r) => (r.fix ? [r.fix] : []));
  return (value) => fixes.reduce((acc, fix) => fix(acc), value);
}

// ---------------------------------------------------------------------------
// Making a finding visible
// ---------------------------------------------------------------------------

// All three are written as escapes rather than pasted, which is what
// `no-invisible-characters` in `charcheck.config.ts` enforces everywhere else in
// the repo, and these are the definitions, so nothing here is exempt from it: a
// literal would be a character in the file that names it, indistinguishable from
// the ordinary space beside it. An escape rather than `String.fromCharCode`
// because these three keep their literal types, which is what lets a tally be
// keyed by width in `src/fr.ts`.

/** U+00A0, the full no-break space. */
export const NO_BREAK = '\u00a0';
/** U+202F, the narrow no-break space. Imprimerie nationale distinguishes the two
 * and Unicode encodes them separately, so a pack that used one for both would be
 * wrong in a way no reader could see. */
export const NARROW_NO_BREAK = '\u202f';
/** U+2009, the thin space. The trap in this family: it is the right *width* and
 * the wrong breaking behaviour, so a proof looks correct and the line comes
 * apart in a browser. 18 of them sit inside guillemets in the French corpora,
 * which is why the rules name it rather than treating it as an ordinary space. */
export const THIN = '\u2009';
/** U+2019, the right single quotation mark, used as the French apostrophe. */
export const RIGHT_SINGLE_QUOTE = '’';
/** U+2018, the left single quotation mark. Named because it is the mark an
 * apostrophe rule has to be able to say it converts: a smart-quote pass that
 * meets a leading straight quote produces U+2018 in apostrophe position, and
 * U+2018 and U+2019 differ by which way the mark curls, which at a report's font
 * size is nothing. */
export const LEFT_SINGLE_QUOTE = '‘';

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
  return (
    JSON.stringify(text)
      .replaceAll(NO_BREAK, '<NBSP>')
      .replaceAll(NARROW_NO_BREAK, '<NNBSP>')
      .replaceAll(THIN, '<THINSP>')
      .replaceAll(RIGHT_SINGLE_QUOTE, '<RSQUO>')
      // The curved quotation marks, named for the same reason as the spaces and
      // added when `nl` arrived. U+2018 and U+2019 differ by which way the mark
      // curls, which at a report's font size is nothing, and `apostrophe`
      // converts one into the other while `mixed-quotation-marks` reports
      // which of them opened a quotation. Before this, an excerpt of `‘nee’`
      // printed the closing mark as `<RSQUO>` and the opening one raw, so the
      // one rule whose entire subject is telling two marks apart showed a
      // reader only one of them.
      .replaceAll(LEFT_SINGLE_QUOTE, '<LSQUO>')
      .replaceAll('“', '<LDQUO>')
      .replaceAll('”', '<RDQUO>')
      .replaceAll('„', '<BDQUO>')
      .replaceAll('«', '<LAQUO>')
      .replaceAll('»', '<RAQUO>')
  );
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
