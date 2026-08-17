// Every style's behaviour over every fixture, as one deterministic dump.
//
// **What this is for.** A refactor that claims to change nothing is a claim
// about `normalize` and about every rule's offsets, and neither the type checker
// nor the unit tests can see it: a rule moved into a shared builder passes both
// while quietly matching one character less. Run this before and after such a
// change and diff the two files. Byte-identical or the claim is false.
//
// ```bash
// git stash && pnpm battery > /tmp/before.txt && git stash pop
// pnpm battery > /tmp/after.txt && diff /tmp/before.txt /tmp/after.txt
// ```
//
// It held two rule refactors, alongside a corpus gate that is now deleted, and it
// found nothing both times, which is what a claim of "no behaviour change" being
// true looks like. It is kept for the case where that claim is false: the corpora
// were nine publishers each writing one language correctly, and most of what a
// rule gets wrong is in text nobody would ever publish.
//
// **The direction of the import is deliberate.** The inputs live in
// `test/fixtures.ts` with the rest of the fixtures, because a dump and a test
// asserting a property have to be looking at the same text or the dump stops
// being evidence about what the suite covers. This file is the CLI over them;
// `test/battery.test.ts` is the assertion.

import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { styles } from '../src/check.ts';
import { NARROW_NO_BREAK, NO_BREAK, reveal, type Style } from '../src/pack.ts';
import { withWidth } from '../src/styles/fr.ts';
import { combinations, texts } from '../test/fixtures.ts';

/**
 * Every style a caller can be handed, under a stable label.
 *
 * The two derived ones are here because `withWidth` is the only style in the
 * package that nobody declared, which makes it the closest thing shipped to the
 * config-composed style this all exists for. They are labelled rather than named
 * after themselves: both are called `fr`, since a derived style keeps its base's
 * name and moves only its stamp, and a dump with three sections headed `fr` is
 * unreadable.
 */
export function everyStyle(): readonly { label: string; style: Style }[] {
  return [
    ...styles.map((style) => ({ label: style.name, style })),
    { label: 'fr+00A0', style: withWidth(NO_BREAK) },
    { label: 'fr+202F', style: withWidth(NARROW_NO_BREAK) },
  ];
}

/** Every input, generated and written. */
export function everyInput(): readonly string[] {
  return [...combinations(), ...texts()];
}

/**
 * One style over every input, as lines.
 *
 * Silent inputs are left out, so the dump is what the style *does* rather than a
 * transcript of it doing nothing 8,000 times. The rule list is included because
 * a summary or a citation moving is a report changing, which is a change to what
 * this package emits even when no offset moves.
 */
export function behaviour(
  style: Style,
  label = style.name,
  inputs: readonly string[] = everyInput(),
): string[] {
  const lines = [`## ${label} ${style.id}`];
  for (const rule of style.rules)
    lines.push(
      `  rule ${rule.id} ${rule.severity} ${rule.fix ? 'fixable' : 'check'} ` +
        `${JSON.stringify(rule.summary)} ${JSON.stringify(rule.cite)}`,
    );
  for (const value of inputs) {
    const normalized = style.normalize(value);
    const found = style.rules
      .flatMap((rule) => rule.find(value).map((at) => `${rule.id}@${at.index}+${at.length}`))
      .join(',');
    if (normalized !== value || found)
      lines.push(`  ${reveal(value)} -> ${reveal(normalized)} [${found}]`);
  }
  return lines;
}

/**
 * A style's behaviour over the **generated** inputs, as 12 hex digits.
 *
 * Over `combinations()` and not over the whole dump, which is the one design
 * decision in this file. The digest's job is to catch a behaviour change nobody
 * intended, and it can only do that if it does not also move for changes
 * somebody did intend. A cross product of marks and space runs is mechanical
 * input that changes when the generator changes; the written fixtures change
 * whenever a hazard is added, and a digest that moved for those would train a
 * reader to re-cut it without looking, which is the whole failure mode of a
 * committed baseline.
 *
 * `node:crypto` rather than the hash in `src/compose.ts`, for the reason that one
 * is written out by hand: a library of regular expressions has to load outside
 * Node and a development script does not. Sharing it would have coupled a rule
 * stamp to a test fixture.
 */
export function digest(style: Style, label = style.name): string {
  return createHash('sha256')
    .update(behaviour(style, label, combinations()).join('\n'))
    .digest('hex')
    .slice(0, 12);
}

function main(): void {
  const out: string[] = [];
  for (const { label, style } of everyStyle()) out.push(...behaviour(style, label));
  out.push(`# ${everyInput().length} inputs, ${out.length} lines`);
  out.push(`# digests below cover the ${combinations().length} generated inputs only`);
  for (const { label, style } of everyStyle())
    out.push(`# digest ${label} ${digest(style, label)}`);
  console.log(out.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
