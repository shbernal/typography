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
// Every report carries a stamp - `typocheck 0.1.0 (fr@a8ada4df7c7c)` - because a
// findings count is comparable only against the rules that produced it, and the
// half after the `@` is derived from those rules rather than typed by anybody.
// An input that shapes an output has to name itself in that output.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative } from 'node:path';

import { check, fix, styleFor, styles } from './check.ts';
import type { Finding, Style } from './pack.ts';

const version = (createRequire(import.meta.url)('../package.json') as { version: string }).version;

const USAGE = `typocheck ${version} - orthotypography for French, Spanish, German and Dutch

  typocheck check --lang <tag> [options] <file...>
  typocheck fix   --lang <tag> [--write] [options] <file...>
  typocheck langs

Arguments
  <file...>            files to read, or - for stdin

Options
  --lang <tag>         required. One of: ${tags()}
  --write              fix only. Rewrite the files in place. With -, the
                       repaired text goes to stdout and the report to stderr,
                       so the command is a filter you can redirect.
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

/** Every tag the shipped styles answer to. A style need not be about a
 * language, so this is the styles that are and not simply all of them. */
function tags(): string {
  return styles.flatMap((style) => (style.lang === undefined ? [] : [style.lang])).join(', ');
}

function stamp(style: Style): string {
  return `typocheck ${version} (${style.id})`;
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
  // CLI and the second thing they quote in a bug report. The style stamps come
  // with it: a findings count is comparable only against the rules that produced
  // it, so the two are one answer rather than two.
  if (verb === '-v' || verb === '--version' || verb === 'version') {
    console.log(`typocheck ${version}`);
    for (const style of styles) console.log(`  ${style.id}`);
    return 0;
  }
  if (verb === 'langs') {
    for (const style of styles)
      console.log(
        `${(style.lang ?? style.name).padEnd(6)} ${style.id.padEnd(20)} ${style.standard}`,
      );
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
      `typocheck: --lang is required. One of: ${tags()}\n` +
        'Nothing here guesses a language, because a French rule applied to Swiss German produces confident nonsense.',
    );
    return 2;
  }
  const style = styleFor(opts.lang);
  if (!style) {
    console.error(
      `typocheck: no style for '${opts.lang}'. Known: ${tags()}\n` +
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

    const findings = check(style, text);
    let changed = false;

    if (verb === 'fix') {
      const fixed = fix(style, text);
      changed = fixed !== text;
      if (opts.write) {
        // stdin's destination is stdout, and it is written whether or not
        // anything moved. `typocheck fix --lang fr --write - < in > out` is a
        // filter, and a filter that emits nothing for the text it had nothing to
        // say about does not pass it through, it deletes it. A file is written
        // only when it changed, because there the unchanged case already has a
        // correct copy on disk and rewriting it moves an mtime for nothing.
        if (path === '-') process.stdout.write(fixed);
        else if (changed) writeFileSync(path, fixed);
      }
      // Without `--write` nothing is written and nothing is echoed, including
      // for stdin: a dry run reports.
    }

    all.push({ path, findings, changed });
  }

  const findings = all.flatMap((f) => f.findings);

  // When `--write` is given a `-`, stdout is carrying somebody's document, so
  // nothing about the document may go there as well. Both halves of that were
  // broken: the human report was appended to the text, so `fix --write - > out`
  // wrote the repaired text with the report glued to the end of it, and `--json`
  // emitted the text immediately followed by the object, which does not parse.
  // The report is still produced in full; it moves to stderr, where a redirect
  // separates it from the thing being redirected.
  const say = opts.write && opts.paths.includes('-') ? console.error : console.log;

  if (opts.json) {
    say(
      JSON.stringify(
        {
          tool: `typocheck ${version}`,
          style: style.id,
          standard: style.standard,
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
    for (const file of all) for (const line of report(file.path, file.findings)) say(line);

    const errors = findings.filter((f) => f.severity === 'error').length;
    const warnings = findings.length - errors;
    const notFixable = findings.filter((f) => !f.fixable).length;

    say(
      `\n${stamp(style)}: ${findings.length} findings in ${all.length} file(s) ` +
        `(${errors} error, ${warnings} warning, ${notFixable} needing a decision)`,
    );

    if (verb === 'fix') {
      const moved = all.filter((f) => f.changed).map((f) => label(f.path));
      if (!moved.length) say('fix: nothing to rewrite.');
      else if (opts.write) say(`fix: rewrote ${moved.join(', ')}`);
      else say(`fix: would rewrite ${moved.join(', ')}. Pass --write to do it.`);
    }
    if (notFixable && verb === 'fix')
      say(
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
