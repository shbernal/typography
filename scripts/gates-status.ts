// What the gate corpora are, read from what is committed about them.
//
// Every number here is already in the repository, in `gates/documents-*.json`
// (per-document characters and sha) and `gates/findings-*.json` (units,
// characters, exposure, pack id, fingerprint). Nothing printed them together, so
// the sizes of the eight corpora were invisible without ad-hoc jq, and the one
// baseline deliberately left stale at an older pack version was invisible
// without reading `gates/README.md`.
//
// It takes no network and needs no corpus on disk. That is most of its value: in
// a fresh checkout, where `gates/corpora/` is empty because it is ignored, this
// still prints the whole table. It is a report, not a gate, so it is not part of
// `pnpm check` and it does not fail on what it flags.
//
//   node scripts/gates-status.ts
//   node scripts/gates-status.ts --fragility
//
// `--fragility` is the one thing here that does need the corpora, and it needs
// them for a reason worth stating rather than working around: how much of a
// corpus's exposure sits in a single document is a fact about the text, and the
// committed files describe the text per document only by length and hash. It is
// a separate mode rather than a separate script because it answers the same
// question as the table above it - what are these corpora, really - one level
// further down.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packFor } from '../src/check.ts';
import { countOccurrences, EXPOSURE, fromText } from './gate-findings.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'gates', 'corpora.json');

interface CorpusSpec {
  readonly id: string;
  readonly lang: string;
  readonly exposes?: readonly string[];
  readonly fetch?: { readonly urls: string };
}

interface DocumentRecord {
  readonly name: string;
  readonly characters: number;
  readonly sha: string;
}

interface Findings {
  readonly pack: string;
  readonly units: number;
  readonly characters: number;
  readonly fingerprint: string;
  readonly exposure: Record<string, number>;
}

/** What one corpus looks like from the committed files alone. Every field is
 * optional-by-absence rather than defaulted, because "no manifest" and "a
 * manifest saying zero" are different states and only the first is a finding. */
interface Row {
  readonly spec: CorpusSpec;
  readonly documents?: readonly DocumentRecord[];
  readonly findings?: Findings;
  readonly present: boolean;
  readonly pack: string;
  readonly urls: number;
  readonly archived: number;
}

/** How many of a corpus's URLs carry an archive timestamp, counted from the
 * committed list rather than from anything fetched.
 *
 * A corpus rebuilt from captures reproduces or fails; one rebuilt live is a fresh
 * sample of a moving web each time. Both are legitimate and the mixture is the
 * thing that must not be silent, because a partly-archived corpus reads in every
 * other report exactly like a fully archived one. */
function coverage(spec: CorpusSpec): { urls: number; archived: number } {
  if (!spec.fetch) return { urls: 0, archived: 0 };
  const lines = readFileSync(join(REPO, spec.fetch.urls), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  return { urls: lines.length, archived: lines.filter((line) => /\s/.test(line)).length };
}

function readJson<T>(file: string): T | undefined {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : undefined;
}

/** Thousands separators without `toLocaleString`, whose grouping depends on the
 * machine's locale. This output is read side by side with numbers pasted from
 * another run, so it has to be the same everywhere. */
function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function collect(): Row[] {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { corpora: CorpusSpec[] };
  return manifest.corpora.map((spec) => {
    const pack = packFor(spec.lang);
    if (!pack) throw new Error(`${spec.id}: no pack for ${spec.lang}`);
    return {
      spec,
      documents: readJson<{ documents: DocumentRecord[] }>(
        join(REPO, 'gates', `documents-${spec.id}.json`),
      )?.documents,
      findings: readJson<Findings>(join(REPO, 'gates', `findings-${spec.id}.json`)),
      present: existsSync(join(REPO, 'gates', 'corpora', spec.id)),
      pack: pack.id,
      ...coverage(spec),
    };
  });
}

/** Where a rebuild of this corpus would read from. `archived` is the one that
 * reproduces or fails; anything else is partly or wholly a fresh sample. */
function origin(row: Row): string {
  if (!row.urls) return '-';
  if (!row.archived) return 'live';
  return row.archived === row.urls ? 'archived' : `${row.archived}/${row.urls}`;
}

/** How much of a corpus's declared exposure dies with one document.
 *
 * `exposes` says a corpus is here to put the rules in front of a character, and
 * the findings report says how many of that character it contains. Neither says
 * how that total is distributed, and the distribution is what decides whether the
 * number is evidence or an accident. `admin-ch-medien-de-ch` is the case that
 * asked for this: one press release withdrawn by its publisher took two of 38
 * Swiss guillemet pairs with it, 5% of the entire `de-CH` quotation evidence
 * base, and nothing in the repository would have said in advance that a single
 * document mattered that much.
 *
 * A share is printed per character rather than per corpus because they come
 * apart: a corpus can be broad in one mark and hang off one document in another.
 *
 * A one-document corpus is trivially 100% and is not a finding. A constitution
 * does not lose a paragraph, and the pins would catch it if it did; the number to
 * read here is the one from a corpus that could have spread its exposure and did
 * not. */
function fragility(rows: readonly Row[]): void {
  console.log('\nhow much of the declared exposure a single document holds:');

  for (const row of rows) {
    const declared = row.spec.exposes ?? [];
    if (!row.present) {
      console.log(`\n  ${row.spec.id}: not on this machine, so its documents cannot be read`);
      continue;
    }
    if (!declared.length) {
      console.log(`\n  ${row.spec.id}: declares nothing`);
      continue;
    }

    const units = fromText(join(REPO, 'gates', 'corpora', row.spec.id));
    console.log(
      `\n  ${row.spec.id}  (${grouped(units.length)} document${units.length === 1 ? '' : 's'})`,
    );

    for (const mark of declared) {
      // By label rather than by the bare character, for the reason
      // `gate-findings.ts` gives where it checks the same field: half of them are
      // invisible, and a JSON file is exactly where a no-break space is silently
      // retyped as a space.
      const entry = EXPOSURE.find(([name, character]) => name === mark || character === mark);
      if (!entry) throw new Error(`${row.spec.id}: exposes ${mark}, which is not a counted mark`);

      const counts = units.map((unit) => ({
        where: unit.where,
        count: countOccurrences(unit.text, entry[1]),
      }));
      const total = counts.reduce((sum, one) => sum + one.count, 0);
      if (total === 0) {
        // The findings gate fails on this rather than reporting it, so reaching
        // here means the corpora on disk are not the ones the gate last passed.
        console.log(`    ${entry[0].padEnd(13)} none, which the findings gate fails on`);
        continue;
      }

      const holding = counts.filter((one) => one.count > 0).length;
      const largest = counts.reduce((most, one) => (one.count > most.count ? one : most));
      const share = Math.round((largest.count * 100) / total);
      console.log(
        `    ${entry[0].padEnd(13)} ${String(grouped(total)).padStart(6)} in ${String(holding).padStart(4)} of ${String(units.length).padStart(4)} documents` +
          `    largest ${String(grouped(largest.count)).padStart(5)}  ${String(share).padStart(3)}%  ${largest.where}`,
      );
    }
  }
}

function main(): void {
  const rows = collect();

  const width = (of: (row: Row) => string, header: string): number =>
    Math.max(header.length, ...rows.map((row) => of(row).length));
  const id = width((row) => row.spec.id, 'corpus');
  const lang = width((row) => row.spec.lang, 'lang');
  const baseline = width((row) => row.findings?.pack ?? '-', 'baseline');
  const source = width(origin, 'source');

  console.log(
    `${'corpus'.padEnd(id)}  ${'lang'.padEnd(lang)}  ${'baseline'.padEnd(baseline)}  ` +
      `${'docs'.padStart(5)}  ${'characters'.padStart(10)}  ${'source'.padEnd(source)}  local`,
  );

  let totalDocuments = 0;
  let totalCharacters = 0;

  for (const row of rows) {
    const documents = row.documents?.length ?? 0;
    const characters = (row.documents ?? []).reduce((sum, doc) => sum + doc.characters, 0);
    totalDocuments += documents;
    totalCharacters += characters;
    console.log(
      `${row.spec.id.padEnd(id)}  ${row.spec.lang.padEnd(lang)}  ` +
        `${(row.findings?.pack ?? '-').padEnd(baseline)}  ` +
        `${(row.documents ? grouped(documents) : '-').padStart(5)}  ` +
        `${(row.documents ? grouped(characters) : '-').padStart(10)}  ` +
        `${origin(row).padEnd(source)}  ` +
        `${row.present ? 'present' : 'absent'}`,
    );
  }

  console.log(
    `${''.padEnd(id)}  ${''.padEnd(lang)}  ${''.padEnd(baseline)}  ` +
      `${grouped(totalDocuments).padStart(5)}  ${grouped(totalCharacters).padStart(10)}`,
  );

  // Only the characters each corpus *declares* it is here for, not all sixteen
  // that `gate-findings.ts` counts. A corpus earns its place by exposing the
  // rules to something, and `exposes` is that claim; the other counts are
  // context and belong in the findings report where they already are.
  console.log('\nwhat each corpus is here to expose the rules to:');
  for (const row of rows) {
    const declared = row.spec.exposes ?? [];
    if (!declared.length) {
      console.log(`  ${row.spec.id}: declares nothing`);
      continue;
    }
    const exposure = row.findings?.exposure;
    console.log(
      `  ${row.spec.id}: ${declared
        .map((mark) => {
          const count = exposure
            ? Object.entries(exposure).find(([name]) => name === mark)?.[1]
            : undefined;
          return `${mark}=${count === undefined ? '?' : grouped(count)}`;
        })
        .join('  ')}`,
    );
  }

  const notes: string[] = [];
  for (const row of rows) {
    if (!row.documents) notes.push(`${row.spec.id}: no gates/documents-${row.spec.id}.json`);
    if (!row.findings) {
      notes.push(`${row.spec.id}: no gates/findings-${row.spec.id}.json, so it has no baseline`);
      continue;
    }

    // The one that would have shown the stale admin.ch baseline without reading
    // `gates/README.md`. A baseline cut under an older pack is not wrong, but it
    // is a different typography era from every other corpus in the same
    // language, and nothing else in the repository says so out loud.
    if (row.findings.pack !== row.pack)
      notes.push(
        `${row.spec.id}: baseline cut under ${row.findings.pack}, ` +
          `current source is ${row.pack}. \`pnpm gates\` would move it.`,
      );

    // The two committed families describe the same corpus and are written by
    // different scripts, so they can disagree: one was regenerated and the
    // other was not. Whichever way round it happened, the pins and the baseline
    // are no longer about the same text.
    const documents = row.documents;
    if (!documents) continue;
    const characters = documents.reduce((sum, doc) => sum + doc.characters, 0);
    if (documents.length !== row.findings.units || characters !== row.findings.characters)
      notes.push(
        `${row.spec.id}: pins say ${grouped(documents.length)} documents and ` +
          `${grouped(characters)} characters, the baseline says ` +
          `${grouped(row.findings.units)} and ${grouped(row.findings.characters)}. ` +
          'One of the two was regenerated without the other.',
      );
  }

  if (notes.length) {
    console.log('\nflags:');
    for (const note of notes) console.log(`  ${note}`);
  }

  const absent = rows.filter((row) => !row.present);
  if (absent.length)
    console.log(
      `\n${absent.length} of ${rows.length} corpora are not on this machine. ` +
        'They are ignored rather than missing; `pnpm corpus` builds them from the committed URL lists.',
    );

  if (process.argv.includes('--fragility')) fragility(rows);
}

main();
