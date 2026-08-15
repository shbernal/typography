// The findings gate. A standing release gate, not a one-off.
//
// German and Spanish have no prior implementation, so there is nothing to
// reproduce and no output to diff. Their gate is a triage: run `check` over real
// published text, read every finding class, and record the per-rule counts. The
// counts are committed, so the review artefact for every later release is the
// *delta*. A rule change that moves German findings over a fixed corpus from 34
// to 210 then shows up in a diff instead of in a user's inbox.
//
// What the corpus has to be is the part worth getting right, and it is stated in
// `gates/corpora.json`: professionally typeset text. Sloppy prose makes nearly
// every finding a true positive, which measures recall, which nobody doubts. In
// text somebody set properly every finding is a suspected false positive by
// construction, which is the failure mode these rules actually have.
//
//   node scripts/gate-findings.ts
//   node scripts/gate-findings.ts --verify
//   node scripts/gate-findings.ts --samples 12
//
// Every corpus comes from `pnpm corpus`, so this gate runs anywhere the network
// does. It did not always: the de-DE corpus was read from a registry in a
// private consumer tree, which meant nobody outside this machine could check the
// German numbers. Replacing it with the BSI's own published XML removed the last
// such corpus, and with it the `--consumer` flag and the registry reader.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { check, packFor } from '../src/check.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'gates', 'corpora.json');

interface CorpusSpec {
  readonly id: string;
  readonly lang: string;
  /** The frozen URL list this corpus is rebuilt from. Every corpus has one, and
   * a corpus that did not would be a number nobody else could check. */
  readonly fetch: { readonly urls: string };
  /** Characters this corpus is here to expose the rules to. Checked, not trusted. */
  readonly exposes?: readonly string[];
  readonly note: string;
}

/** The characters every pack's rules are about, counted for every corpus.
 *
 * Zero findings means two completely different things depending on these
 * numbers: that the publisher set the text correctly, or that the text never
 * contained anything the rule could match. The first is the result the gate
 * exists to produce and the second is a vacuous run reported as a pass. The
 * counts make the difference readable, and `exposes` makes it enforceable. */
export const EXPOSURE: readonly (readonly [string, string])[] = [
  ['U+00AB «', '«'],
  ['U+00BB »', '»'],
  ['U+201E „', '„'],
  ['U+201C “', '“'],
  ['U+201D ”', '”'],
  ['U+00BF ¿', '¿'],
  ['U+00A1 ¡', '¡'],
  ['?', '?'],
  ['!', '!'],
  [';', ';'],
  [':', ':'],
  ['" straight', '"'],
  ["' straight", "'"],
  ['U+2019 ’', '’'],
  ['U+00A0 NBSP', ' '],
  ['U+202F NNBSP', ' '],
];

export function countOccurrences(value: string, mark: string): number {
  let total = 0;
  let at = value.indexOf(mark);
  while (at !== -1) {
    total++;
    at = value.indexOf(mark, at + mark.length);
  }
  return total;
}

/** One value of running text, with enough identity to find it again. */
export interface Unit {
  readonly where: string;
  readonly text: string;
}

export function fromText(dir: string): Unit[] {
  const units: Unit[] = [];
  const walk = (at: string): void => {
    // Sorted, for the reason `fetch-corpus.ts` states about its own reader:
    // `readdirSync` order is the filesystem's business, so an unsorted walk
    // would make `--verify` a comparison between a laptop's directory hash
    // order and a runner's.
    //
    // What that ordering still decides is `samples`, which keeps the first
    // eight findings a rule produces and is therefore a function of the names.
    // That is deliberate, and it is the reason `fingerprintOf` below is not:
    // samples exist for a human to read a rule's output next to the file it
    // came from, so name order is the useful order, and a rename that reshuffles
    // eight excerpts is a diff anyone can see through. A rename that moved the
    // fingerprint was not, which is what `fingerprintOf` is about.
    const entries = readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const full = join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (['.txt', '.md'].includes(extname(entry.name)))
        units.push({ where: entry.name, text: readFileSync(full, 'utf8') });
    }
  };
  walk(dir);
  return units;
}

/** One number that says whether this corpus is the text the baseline was cut
 * from, and depends on nothing else.
 *
 * It hashes the per-document hashes in sorted-hash order, so it is a function of
 * the *set of texts* and of nothing about how they are stored: not the
 * filesystem's directory order, which sorting the walk already handled, and not
 * this repository's naming either, which sorting the walk did not.
 *
 * That second one was load-bearing and invisible. The fingerprint used to hash
 * `name + text` per unit in name order, so renaming the documents moved every
 * fingerprint while not one character of text had changed. Any scheme for
 * naming them better - dropping the list index, adopting the publisher's own id -
 * would have arrived as a re-baseline of all eight corpora, indistinguishable in
 * the diff from eight publishers having edited their text. Making the
 * fingerprint independent of the names is what makes renaming them a cheap,
 * checkable act: the names in `samples` move and this number does not.
 *
 * The per-document digest is deliberately the same one `gates/documents-*.json`
 * records, truncation included, which makes this number a function of the
 * committed pins rather than merely agreeing with them. Two consequences worth
 * having. The two committed families can no longer describe different text while
 * both looking healthy: if the pins say a document changed, the fingerprint has
 * already moved. And anyone can recompute this from a checkout with no corpus on
 * disk, which is how it was recomputed when it changed shape, rather than by
 * rebuilding eight corpora and hoping none of the eight publishers had edited
 * anything that week. 64 bits per document is not a collision-resistance claim
 * and is not asked to be one; what is being told apart here is drift, not an
 * adversary. */
function fingerprintOf(units: readonly Unit[]): string {
  const perDocument = units
    .map((unit) => createHash('sha256').update(unit.text).digest('hex').slice(0, 16))
    .sort();
  return createHash('sha256').update(perDocument.join('\n')).digest('hex').slice(0, 16);
}

function main(): void {
  const args = process.argv.slice(2);
  const verify = args.includes('--verify');
  const sampleArg = args[args.indexOf('--samples') + 1];
  const sampleCount = args.includes('--samples') && sampleArg ? Number(sampleArg) : 8;

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { corpora: CorpusSpec[] };
  let missing = 0;

  for (const spec of manifest.corpora) {
    const pack = packFor(spec.lang);
    if (!pack) throw new Error(`${spec.id}: no pack for ${spec.lang}`);

    const location = join(REPO, 'gates', 'corpora', spec.id);
    if (!existsSync(location)) {
      console.error(`${spec.id}: corpus absent at ${location}. Run \`pnpm corpus\` to fetch it.`);
      missing++;
      continue;
    }

    const units = fromText(location);

    const perRule = new Map<string, { count: number; units: number; samples: string[] }>();
    const exposure = new Map<string, number>(EXPOSURE.map(([name]) => [name, 0]));
    let unitsWithFindings = 0;
    let characters = 0;

    for (const unit of units) {
      characters += unit.text.length;
      for (const [name, mark] of EXPOSURE)
        exposure.set(name, (exposure.get(name) ?? 0) + countOccurrences(unit.text, mark));
      const findings = check(pack, unit.text);
      if (findings.length) unitsWithFindings++;
      const seenInUnit = new Set<string>();
      for (const f of findings) {
        const entry = perRule.get(f.rule) ?? { count: 0, units: 0, samples: [] };
        entry.count++;
        if (!seenInUnit.has(f.rule)) {
          entry.units++;
          seenInUnit.add(f.rule);
        }
        if (entry.samples.length < sampleCount) entry.samples.push(`${unit.where}  ${f.excerpt}`);
        perRule.set(f.rule, entry);
      }
    }

    const report = {
      gate: 'findings',
      corpus: spec.id,
      note: spec.note,
      pack: pack.id,
      standard: pack.standard,
      units: units.length,
      characters,
      unitsWithFindings,
      fingerprint: fingerprintOf(units),
      exposure: Object.fromEntries(exposure),
      rules: Object.fromEntries(
        pack.rules.map((rule) => {
          const hit = perRule.get(rule.id);
          return [
            rule.id,
            {
              fixable: rule.fix !== undefined,
              severity: rule.severity,
              findings: hit?.count ?? 0,
              units: hit?.units ?? 0,
              samples: hit?.samples ?? [],
            },
          ];
        }),
      ),
    };

    const out = join(REPO, 'gates', `findings-${spec.id}.json`);
    const serialized = `${JSON.stringify(report, null, 2)}\n`;

    console.log(`${spec.id} (${pack.id}): ${units.length} values, ${characters} characters`);
    for (const rule of pack.rules) {
      const hit = perRule.get(rule.id);
      console.log(
        `  ${rule.id.padEnd(44)} ${String(hit?.count ?? 0).padStart(5)} findings in ${String(hit?.units ?? 0).padStart(5)} values` +
          (rule.fix ? '  [fixable]' : ''),
      );
    }
    console.log(
      `  exposure: ${EXPOSURE.filter(([name]) => (exposure.get(name) ?? 0) > 0)
        .map(([name]) => `${name}=${String(exposure.get(name))}`)
        .join('  ')}`,
    );

    // A corpus earns its place by containing something. `exposes` is the claim
    // the manifest makes about why this corpus is here, and it is checked
    // rather than trusted: if a re-fetch loses the guillemets, the Swiss
    // guillemet rules would go on reporting a clean zero over text that has
    // stopped being able to disagree with them.
    for (const mark of spec.exposes ?? []) {
      // Named by label rather than by the bare character, because half of them
      // are invisible and a JSON file is exactly where a no-break space would
      // be silently retyped as a space.
      const entry = EXPOSURE.find(([name, character]) => name === mark || character === mark);
      if (!entry) throw new Error(`${spec.id}: exposes ${mark}, which is not a counted character`);
      if ((exposure.get(entry[0]) ?? 0) === 0) {
        console.error(
          `\n${spec.id}: declares it exposes ${entry[0]} and contains none. ` +
            'Every rule about that character scored zero against nothing, which is not a pass.',
        );
        process.exitCode = 1;
      }
    }

    if (verify) {
      if (!existsSync(out) || readFileSync(out, 'utf8') !== serialized) {
        console.error(`\n--verify: ${spec.id} has moved from the committed baseline (${out}).`);
        process.exitCode = 1;
        continue;
      }
      console.log('  unchanged from the committed baseline.');
      continue;
    }

    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialized);
    console.log(`  wrote ${out}\n`);
  }

  if (missing) {
    console.error(
      `\n${missing} corpus/corpora absent. The gate is incomplete, and an incomplete gate is not ` +
        'a gate: a language with no corpus has not been reviewed, whatever the other counts say. ' +
        'Run `pnpm corpus` and re-run this. Every corpus is rebuildable from a committed URL ' +
        'list, so there is no case here that a checkout plus a network cannot fix.',
    );
    process.exitCode = 1;
  }

  // French is here as well as in the reproduction gate, and the two are still
  // different in kind: the reproduction gate asks whether the pack matches the
  // implementation it was extracted from, over translation output, which is a
  // question about equivalence. This one asks how often the pack disagrees with
  // French somebody published, which is the false-positive rate. French passed
  // the first for a year before anyone ran the second, and the second is what
  // found the guillemet spacing.
  const languages = new Set(manifest.corpora.map((c) => c.lang));
  const uncovered = ['fr', 'es', 'de-DE', 'de-CH'].filter((l) => !languages.has(l));
  if (uncovered.length) {
    console.error(
      `\nno findings corpus for: ${uncovered.join(', ')}\n` +
        'Each of those languages ships rules that no real published text has been run past. ' +
        'Sourcing a corpus for one is a task, not a decision, and it blocks the release rather than the build.',
    );
    process.exitCode = 1;
  }
}

// Only when this file is the thing that was run, for the reason
// `scripts/fetch-corpus.ts` states at greater length: `EXPOSURE`, `fromText` and
// `countOccurrences` are what "how many of these characters are in this corpus"
// means in this repository, and `gates-status.ts --fragility` asks the same
// question per document. Importing them must not run the gate, and a second copy
// of the character table would be a second answer to the same question.
//
// `import.meta.main` would say this in one word and is not available on the Node
// 22 this package declares support for, where it reads `undefined` and the script
// would do nothing at all when run.
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
