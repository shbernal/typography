// Building a style, and proving what one is.
//
// A style is a rule list with a name. That is the whole of it, and everything
// interesting here is about the two things a rule list has to carry once a user
// can write one: an identity nobody has to remember to update, and properties
// that hold for a set of rules nobody reviewed.
//
// **The stamp.** `<name>@<stamp>`, where the stamp is a hash over the rules and
// their parameters. A hand-bumped version worked while five rule lists lived in
// this repo and a maintainer moved a constant when one changed. It cannot work
// once a bundle can be defined in somebody's config file: nobody is holding that
// release, and a stamp that fails to move is not a smaller version of a correct
// stamp, it is a corpus that reads as one era and was set in two. Deriving it
// removes the discipline entirely. It also buys something the version could not:
// a user who copies a shipped rule list under their own name gets their name and
// the same stamp, which says exactly what is true.
//
// **The properties.** The corpus gates this replaces answered "does this rule
// misfire on text a professional already set correctly", at the cost of nine
// downloaded corpora and a long tail of quirks. That was the right question for
// a package citing national standards. It is not the question for a package
// whose input is whatever a model emitted, and it never covered the hazard a
// user-composed rule set actually has: two rules that are each correct and that
// undo each other. `audit` is the replacement, and it is exported rather than
// living in the test suite because the promise is about *composed* styles, and
// only the person who composed one can run it over their own text.

import { composeNormalize, excerptAt, type Rule, reveal, type Style } from './pack.ts';

/** What a style may be called: the `@` is reserved for the stamp, and a name
 * with a space in it would make an id no report could be parsed back out of. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * A style from a rule list.
 *
 * The rules are applied in the order given and the order is load-bearing, which
 * is the one thing this function cannot check for you: `normalize` is every
 * fixable rule in sequence, so a rule that repairs a position a later rule reads
 * has to come first. `audit` is where that gets tested, over text.
 *
 * Throws on a duplicate rule id. Ids are global and collide across styles by
 * design, since `guillemet-open-space` is one question that styles answer
 * differently; two rules answering it in one style is a composition mistake and
 * there is no reading of it that helps. It is also the one such mistake that is
 * invisible in a report, where the two would print as the same rule disagreeing
 * with itself.
 */
export function compose(spec: {
  /** `fr`, `de-CH`, `acme-house`. Goes in front of the `@`. */
  name: string;
  /** The BCP 47 tag this style is for, where it is for one. */
  lang?: string;
  /** Where the defaults came from. Provenance for a report header, not
   * authority: "Imprimerie nationale", "ACME house style v3". */
  standard: string;
  rules: readonly Rule[];
}): Style {
  if (!NAME.test(spec.name))
    throw new Error(
      `compose: ${JSON.stringify(spec.name)} is not a usable style name. ` +
        'A name is what goes in front of the `@` in a stamp, so it takes letters, ' +
        'digits, and `.`, `-` or `_` after the first character.',
    );
  if (spec.rules.length === 0)
    throw new Error(`compose: style ${spec.name} has no rules, so it asserts nothing`);

  const seen = new Set<string>();
  for (const rule of spec.rules) {
    if (seen.has(rule.id))
      throw new Error(
        `compose: style ${spec.name} declares ${rule.id} twice. ` +
          'A rule id names a position, and one style has one opinion about a position.',
      );
    seen.add(rule.id);
  }

  const stamp = stampOf(spec.rules);
  return {
    id: `${spec.name}@${stamp}`,
    name: spec.name,
    stamp,
    ...(spec.lang === undefined ? {} : { lang: spec.lang }),
    standard: spec.standard,
    rules: spec.rules,
    normalize: composeNormalize(spec.rules),
  };
}

/**
 * A style from another style, changed.
 *
 * The three verbs are `drop`, `replace` and `add`, and **each of them asserts
 * something about the base**: dropping an id the base does not have is an
 * error, replacing one it does not have is an error, and adding one it already
 * has is an error. That is the point of them being three verbs rather than one
 * merge. A user's config outlives the version of this package it was written
 * against, and the failure it must not have is the quiet one: a `drop` that
 * stops dropping anything because the rule was renamed, leaving the user with a
 * style that silently gained a rule and a stamp that moved for a reason nobody
 * looked at. Every override here breaks loudly when the base moves under it.
 *
 * A replaced rule keeps the base's position, because order decides what
 * `normalize` does. Added rules go on the end. **A style that needs a rule
 * somewhere in the middle re-declares the list**, which is always available:
 * the builders in `rules/` are exported and `compose` takes any order. Making
 * that the answer, rather than an `after: <id>` parameter, keeps the shape of
 * this function honest, since a derived style with rules threaded through the
 * base at three points is not an override of anything and reads better written
 * out.
 */
export function derive(
  base: Style,
  spec: {
    /** Defaults to the base's. Two styles with one name and two stamps are two
     * eras of that name, which is what `fr.withWidth` produces and is exactly
     * what the id is for. */
    name?: string;
    lang?: string;
    standard?: string;
    /** Rule ids to leave out. Each must be in the base. */
    drop?: readonly string[];
    /** Rules that stand in for a base rule of the same id, in its position. */
    replace?: readonly Rule[];
    /** Rules the base does not have, appended in the order given. */
    add?: readonly Rule[];
  },
): Style {
  const have = new Set(base.rules.map((rule) => rule.id));

  const dropped = new Set(spec.drop ?? []);
  for (const id of dropped)
    if (!have.has(id))
      throw new Error(
        `derive: ${base.name} has no rule ${id} to drop. ` +
          'Dropping a rule that is not there would silently do nothing the day it is renamed.',
      );

  const replacements = new Map<string, Rule>();
  for (const rule of spec.replace ?? []) {
    if (!have.has(rule.id))
      throw new Error(`derive: ${base.name} has no rule ${rule.id} to replace. Use \`add\`.`);
    if (dropped.has(rule.id))
      throw new Error(`derive: ${rule.id} is both dropped and replaced, which is two answers.`);
    replacements.set(rule.id, rule);
  }

  for (const rule of spec.add ?? [])
    if (have.has(rule.id))
      throw new Error(`derive: ${base.name} already has a rule ${rule.id}. Use \`replace\`.`);

  const rules = [
    ...base.rules.flatMap((rule) =>
      dropped.has(rule.id) ? [] : [replacements.get(rule.id) ?? rule],
    ),
    ...(spec.add ?? []),
  ];

  const lang = spec.lang ?? base.lang;
  return compose({
    name: spec.name ?? base.name,
    ...(lang === undefined ? {} : { lang }),
    standard: spec.standard ?? base.standard,
    rules,
  });
}

/**
 * The stamp for a rule list.
 *
 * Over the rules and nothing else, so a style's name, its language tag and the
 * sentence naming where its defaults came from are all outside it. That is
 * deliberate: the stamp answers "were these two bodies of text put through the
 * same rules", and renaming a bundle does not change the answer.
 *
 * Order is in, because `normalize` applies fixes in order and two orderings of
 * one rule list are two functions.
 */
export function stampOf(rules: readonly Rule[]): string {
  return hash(rules.map((rule) => rule.signature).join('\n'));
}

// ---------------------------------------------------------------------------
// The properties
// ---------------------------------------------------------------------------

/**
 * A property a composed style failed, on a value it failed for.
 *
 * There are three and they are not interchangeable. **Idempotence** is the
 * oldest one here: a `normalize` that does not converge rewrites a corpus
 * forever and every pass looks like progress. **Conformance** is the product
 * promise and it is new under composition: `check(fix(x))` reports nothing
 * fixable, which is what makes `fix` worth running unattended.
 * **Non-interference** is conformance with the cause attached, and it is the
 * hazard a user-composed rule set has that a reviewed one mostly does not: two
 * rules that are each correct, where the later one puts back what the earlier
 * one removed. No corpus would ever have caught it, because a corpus is text
 * somebody published and this is a defect in a rule *list*.
 */
export interface Violation {
  readonly property: 'idempotence' | 'conformance' | 'non-interference';
  /** The rule the property failed for, or `normalize` for the whole pipeline. */
  readonly rule: string;
  /** For non-interference, the later rule that undid the earlier one's work. */
  readonly culprit?: string;
  /** The value it failed on, revealed and windowed. Never the raw text: the
   * whole subject here is characters that render as each other. */
  readonly sample: string;
  readonly detail: string;
}

/**
 * Run a style's own promises against text.
 *
 * Exported, and that is the design rather than a convenience. A shipped style is
 * held to these by this package's test suite; a style a user composed is held to
 * them by nobody, and the rule sets most likely to interfere are exactly the
 * ones assembled from families that were never meant to run together. So the
 * check ships with the thing it checks.
 *
 * Give it text that exercises the rules: the properties are conditional on the
 * samples, and a sample set that touches nothing passes everything. That is the
 * same trap the corpora had and it is worth naming again here, since an empty
 * result from `audit` is not evidence unless the samples reach the rules.
 */
export function audit(style: Style, samples: Iterable<string>): Violation[] {
  const violations: Violation[] = [];
  const fixable = style.rules.filter(
    (rule): rule is Rule & { fix: (value: string) => string } => rule.fix !== undefined,
  );

  for (const sample of samples) {
    const at = (property: Violation['property'], rule: string, detail: string, culprit?: string) =>
      violations.push({
        property,
        rule,
        ...(culprit === undefined ? {} : { culprit }),
        sample: window(sample),
        detail,
      });

    // Per rule first. Composition can hide a rule that does not converge, when a
    // later rule happens to normalise its output, so each is asked alone before
    // the pipeline is asked at all.
    for (const rule of fixable) {
      const once = rule.fix(sample);
      if (rule.fix(once) !== once)
        at('idempotence', rule.id, 'a second pass changes the text again');
    }

    const settled: (Rule & { fix: (value: string) => string })[] = [];
    let state = sample;
    for (const rule of fixable) {
      state = rule.fix(state);
      for (let i = settled.length - 1; i >= 0; i--) {
        const earlier = settled[i]!;
        const back = earlier.find(state).length;
        if (back === 0) continue;
        at(
          'non-interference',
          earlier.id,
          `${back} finding(s) it had already repaired are back after ${rule.id} ran`,
          rule.id,
        );
        // Dropped, so one interference is reported once rather than by every
        // rule that runs after it.
        settled.splice(i, 1);
      }
      if (rule.find(state).length === 0) settled.push(rule);
    }

    if (style.normalize(state) !== state)
      at('idempotence', 'normalize', 'a second pass changes the text again');

    // The promise itself, checked on the finished text rather than inferred from
    // the walk above. A rule reporting here that no interference explains is a
    // rule that does not repair everything it finds.
    for (const rule of fixable) {
      const left = rule.find(state);
      if (left.length === 0) continue;
      at('conformance', rule.id, `still reports at ${excerptAt(state, left[0]!)} after normalize`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------

/** A window of a sample, revealed, for a message. Long enough to recognise the
 * value and short enough that a failure over a whole document is readable. */
function window(value: string): string {
  return value.length <= 120 ? reveal(value) : `${reveal(value.slice(0, 120))}...`;
}

/**
 * The stamp itself: 12 hex digits over the UTF-8 bytes.
 *
 * FNV-1a twice with two initial values, each finalised by the murmur3 mixer so
 * that the digits kept are as good as the digits dropped. **Not cryptographic
 * and not meant to be.** A stamp answers "are these two rule lists the same
 * one", and the party it protects against is a maintainer who changed a pattern
 * and a user who edited a config, neither of whom is searching for a collision.
 * Written out here rather than taken from `node:crypto`, which would make a
 * library of pure regular expressions refuse to load outside Node, and rather
 * than from `crypto.subtle`, which is asynchronous and would make composing a
 * style asynchronous with it.
 */
function hash(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return `${hex(fnv1a(bytes, 0x811c9dc5))}${hex(fnv1a(bytes, 0x9e3779b9)).slice(0, 4)}`;
}

function fnv1a(bytes: Uint8Array, seed: number): number {
  let h = seed;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function hex(n: number): string {
  return n.toString(16).padStart(8, '0');
}
