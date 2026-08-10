#!/usr/bin/env node

// `typocheck`.
//
// Two verbs, and the split between them is the package's whole argument:
//
//   check   report, never touch the file. The default.
//   fix     apply the fixable subset, and only with --write.
//
// `fix` without `--write` prints exactly the report it would have printed with
// it and writes nothing, so the dry run and the real run compute the same thing
// and cannot disagree about what is about to happen.
//
// Every report carries a stamp - `typocheck 0.1.0 (fr@0.1.0)` - because a
// findings count is a release artefact here and a count with no version beside
// it is not comparable to the next one. An input that shapes an output has to
// name itself in that output.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative } from 'node:path';

import { check, fix, packFor, packs } from './check.ts';
import type { Finding, TypographyPack } from './pack.ts';

const version = (createRequire(import.meta.url)('../package.json') as { version: string }).version;

const USAGE = `typocheck ${version} - orthotypography for French, Spanish and German

  typocheck check --lang <tag> [options] <file...>
  typocheck fix   --lang <tag> [--write] [options] <file...>
  typocheck langs

Arguments
  <file...>            files to read, or - for stdin

Options
  --lang <tag>         required. One of: ${packs.map((p) => p.lang).join(', ')}
  --write              fix only. Rewrite the files in place.
  --json               machine-readable findings on stdout
  --strict             exit non-zero on warnings as well as errors
  -h, --help
  -v, --version

There is no language detection and there will not be. A French rule applied to
Swiss German produces confident nonsense, and guessing wrong is worse than
asking. State the language.
`;

interface Options {
  readonly lang: string | undefined;
  readonly write: boolean;
  readonly json: boolean;
  readonly strict: boolean;
  readonly help: boolean;
  readonly paths: string[];
  /** Arguments that look like flags and are not. Collected rather than thrown so
   * a caller who mistyped two of them hears about both. */
  readonly unknown: string[];
}

function parse(argv: readonly string[]): Options {
  let lang: string | undefined;
  let write = false;
  let json = false;
  let strict = false;
  let help = false;
  const paths: string[] = [];
  const unknown: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--lang') lang = argv[++i];
    else if (arg.startsWith('--lang=')) lang = arg.slice('--lang='.length);
    else if (arg === '--write') write = true;
    else if (arg === '--json') json = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '-h' || arg === '--help') help = true;
    // A bare `-` is stdin and is a path. Anything else with a leading dash is a
    // flag this build does not have, and the alternative to saying so is worse
    // than it looks: `--wrote` would fall through to `paths` and be reported as
    // a file that does not exist, so a typo in `--write` reads as a missing file
    // and the fix silently does not happen.
    else if (arg !== '-' && arg.startsWith('-')) unknown.push(arg);
    else paths.push(arg);
  }

  return { lang, write, json, strict, help, paths, unknown };
}

/** Read a path, or stdin for `-`. stdin is here because the inputs this meets
 * are not all files: a paragraph pasted into a conversation, a column of
 * translated strings, cells out of a spreadsheet. Without it a caller writes a
 * temp file, which is where a tool starts feeling like a workaround. */
function read(path: string): string {
  return readFileSync(path === '-' ? 0 : path, 'utf8');
}

function label(path: string): string {
  if (path === '-') return '<stdin>';
  const rel = relative(process.cwd(), path);
  return rel && !rel.startsWith('..') ? rel : path;
}

function stamp(pack: TypographyPack): string {
  return `typocheck ${version} (${pack.id})`;
}

function report(path: string, findings: readonly Finding[]): string[] {
  return findings.map((f) => {
    const mark = f.fixable ? 'fixable' : f.severity;
    return `${label(path)}:${f.line}:${f.column}  ${mark.padEnd(7)} ${f.rule}  ${f.summary}\n      ${f.excerpt}\n      ${f.cite}`;
  });
}

function main(argv: readonly string[]): number {
  const verb = argv[0];
  if (!verb || verb === '-h' || verb === '--help' || verb === 'help') {
    console.log(USAGE);
    return 0;
  }
  // Bare, because the version is the first thing anyone types after installing a
  // CLI and the second thing they quote in a bug report. The pack ids come with
  // it: a findings count is comparable only against the pack that produced it, so
  // the two versions are one answer rather than two.
  if (verb === '-v' || verb === '--version' || verb === 'version') {
    console.log(`typocheck ${version}`);
    for (const p of packs) console.log(`  ${p.id}`);
    return 0;
  }
  if (verb === 'langs') {
    for (const p of packs) console.log(`${p.lang.padEnd(6)} ${p.id.padEnd(14)} ${p.standard}`);
    return 0;
  }
  if (verb !== 'check' && verb !== 'fix') {
    console.error(`typocheck: unknown verb '${verb}'. Try 'typocheck --help'.`);
    return 2;
  }

  const opts = parse(argv.slice(1));
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.unknown.length) {
    console.error(
      `typocheck: unknown option ${opts.unknown.map((u) => `'${u}'`).join(', ')}. ` +
        "Try 'typocheck --help'.\nA bare - is stdin; everything else starting with a dash is a flag.",
    );
    return 2;
  }
  if (!opts.lang) {
    console.error(
      `typocheck: --lang is required. One of: ${packs.map((p) => p.lang).join(', ')}\n` +
        'Nothing here guesses a language, because a French rule applied to Swiss German produces confident nonsense.',
    );
    return 2;
  }
  const pack = packFor(opts.lang);
  if (!pack) {
    console.error(
      `typocheck: no pack for '${opts.lang}'. Known: ${packs.map((p) => p.lang).join(', ')}\n` +
        "There is no bare 'de': German is two conventions, so say de-DE or de-CH.",
    );
    return 2;
  }
  if (!opts.paths.length) {
    console.error('typocheck: no files. Pass paths, or - to read stdin.');
    return 2;
  }
  if (opts.write && verb === 'check') {
    console.error("typocheck: --write is a 'fix' option. 'check' never touches a file.");
    return 2;
  }

  const all: { path: string; findings: Finding[]; changed: boolean }[] = [];
  for (const path of opts.paths) {
    let text: string;
    try {
      text = read(path);
    } catch (error) {
      console.error(`typocheck: cannot read ${label(path)}: ${(error as Error).message}`);
      return 2;
    }

    const findings = check(pack, text);
    let changed = false;

    if (verb === 'fix') {
      const fixed = fix(pack, text);
      changed = fixed !== text;
      if (changed && opts.write) {
        if (path === '-') process.stdout.write(fixed);
        else writeFileSync(path, fixed);
      } else if (!opts.write && path === '-') {
        // Nothing is written and nothing is echoed: a dry run reports.
      }
    }

    all.push({ path, findings, changed });
  }

  const findings = all.flatMap((f) => f.findings);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          tool: `typocheck ${version}`,
          pack: pack.id,
          standard: pack.standard,
          files: all.map((f) => ({
            file: label(f.path),
            changed: f.changed,
            findings: f.findings,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    for (const file of all) for (const line of report(file.path, file.findings)) console.log(line);

    const errors = findings.filter((f) => f.severity === 'error').length;
    const warnings = findings.length - errors;
    const notFixable = findings.filter((f) => !f.fixable).length;

    console.log(
      `\n${stamp(pack)}: ${findings.length} findings in ${all.length} file(s) ` +
        `(${errors} error, ${warnings} warning, ${notFixable} needing a decision)`,
    );

    if (verb === 'fix') {
      const moved = all.filter((f) => f.changed).map((f) => label(f.path));
      if (!moved.length) console.log('fix: nothing to rewrite.');
      else if (opts.write) console.log(`fix: rewrote ${moved.join(', ')}`);
      else console.log(`fix: would rewrite ${moved.join(', ')}. Pass --write to do it.`);
    }
    if (notFixable && verb === 'fix')
      console.log(
        `${notFixable} finding(s) are not fixable by substitution and are untouched. ` +
          'They need a reader, not a flag.',
      );
  }

  const failing = opts.strict
    ? findings.length
    : findings.filter((f) => f.severity === 'error').length;
  return failing ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
