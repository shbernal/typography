// Guards the repo against em dashes (U+2014). They must not be authored into
// this project's code, docs or the strings it renders. Run as a CLI it fails the
// lint step; `scanForEmDashes` is also imported by a test, so `pnpm test`
// enforces the rule independently of lint.
//
// This repo is about typographic characters, so the rule needs a stated escape
// hatch rather than an implicit one: a module that must *name* U+2014 (French
// sets dialogue with the tiret cadratin, and a rule about it is plausible)
// builds the character with `String.fromCharCode(0x2014)` or marks the line with
// the allow marker below. Never paste the character itself.

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const EM_DASH = String.fromCharCode(0x2014);

/** Files we scan; anything else is ignored. */
const TEXT_EXTENSIONS = new Set(['.ts', '.md', '.json', '.mjs', '.cjs', '.txt', '.yml', '.yaml']);

/** Directory names skipped wherever they appear. */
const SKIP_NAMES = new Set(['node_modules', '.git', 'dist']);

// A line containing this marker is exempt, for the rare doc that must name the
// character. Assembled at runtime so this guard file stays clean itself.
const ALLOW_MARKER = `emdash${'-'}allow`;

export interface EmDashHit {
  /** Path relative to the scanned root. */
  file: string;
  line: number;
  column: number;
  /** The offending line, trimmed. */
  text: string;
}

/** Recursively scan `root` for em dashes in text files. Returns every hit. */
export function scanForEmDashes(root: string): EmDashHit[] {
  const hits: EmDashHit[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_NAMES.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name))) continue;

      const rel = relative(root, full);
      readFileSync(full, 'utf8')
        .split('\n')
        .forEach((text, i) => {
          if (text.includes(ALLOW_MARKER)) return;
          const column = text.indexOf(EM_DASH);
          if (column >= 0)
            hits.push({ file: rel, line: i + 1, column: column + 1, text: text.trim() });
        });
    }
  };

  walk(root);
  return hits;
}

function main(): void {
  const root = process.argv[2] ?? process.cwd();
  const hits = scanForEmDashes(root);
  if (hits.length === 0) {
    console.log('check-no-emdash: no em dashes found.');
    return;
  }
  console.error(`check-no-emdash: found ${hits.length} em dash(es) (U+2014):\n`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}:${hit.column}  ${hit.text}`);
  }
  console.error(
    '\nEm dashes are not allowed in source, docs or rendered labels. ' +
      'Use a hyphen, restructure, or build the character with String.fromCharCode.',
  );
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
