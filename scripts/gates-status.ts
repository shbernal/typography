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

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packFor } from '../src/check.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'gates', 'corpora.json');

interface CorpusSpec {
  readonly id: string;
  readonly lang: string;
  readonly exposes?: readonly string[];
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
    };
  });
}

function main(): void {
  const rows = collect();

  const width = (of: (row: Row) => string, header: string): number =>
    Math.max(header.length, ...rows.map((row) => of(row).length));
  const id = width((row) => row.spec.id, 'corpus');
  const lang = width((row) => row.spec.lang, 'lang');
  const baseline = width((row) => row.findings?.pack ?? '-', 'baseline');

  console.log(
    `${'corpus'.padEnd(id)}  ${'lang'.padEnd(lang)}  ${'baseline'.padEnd(baseline)}  ` +
      `${'docs'.padStart(5)}  ${'characters'.padStart(10)}  local`,
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
}

main();
