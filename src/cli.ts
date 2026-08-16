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
// An input that shapes an output has to name itself in that output. When the
// style came out of a config the header names the file too: a stamp says which
// rules ran, and the path says whose.
//
// `--style` rather than `--lang`, because a style need not be about a language.
// The shipped ones are, and are named for their tags, so `--style fr` is what
// `--lang fr` was.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative } from 'node:path';

import { check, fix, styles } from './check.ts';
import { available, type Config, findConfig, loadConfig, resolveStyle } from './config.ts';
import type { Finding, Style } from './pack.ts';

const version = (createRequire(import.meta.url)('../package.json') as { version: string }).version;

/** Options and verbs that were renamed. Named rather than left to fall in with
 * the typos, because a user typing one of these is not guessing: they read a
 * document that was true, and the useful answer is the new spelling. */
const RENAMED_OPTIONS: Record<string, string> = { '--lang': '--style' };
const RENAMED_VERBS: Record<string, string> = { langs: 'styles' };

function usage(): string {
  return `typocheck ${version} - orthotypography for French, Spanish, German and Dutch

  typocheck check --style <name> [options] <file...>
  typocheck fix   --style <name> [--write] [options] <file...>
  typocheck styles

Arguments
  <file...>            files to read, or - for stdin

Options
  --style <name>       required. Built in: ${shipped()}. A config
                       can define more; 'typocheck styles' lists them all.
  --config <path>      load this config module instead of searching for one
  --no-config          ignore any config file
  --write              fix only. Rewrite the files in place. With -, the
                       repaired text goes to stdout and the report to stderr,
                       so the command is a filter you can redirect.
  --json               machine-readable findings on stdout
  --strict             exit non-zero on warnings as well as errors
  -h, --help
  -v, --version

A config is a module named typography.config.mjs, in this directory or an
ancestor, default-exporting a style built with compose or derive, or an array
of them. A config style may take a shipped style's name and stand in for it;
the report header carries the stamp and the config's path, so it says which.

There is no language detection and there will not be. A French rule applied to
Swiss German produces confident nonsense, and guessing wrong is worse than
asking. State the style.
`;
}

interface Options {
  readonly style: string | undefined;
  readonly config: string | undefined;
  readonly noConfig: boolean;
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
  let style: string | undefined;
  let config: string | undefined;
  let noConfig = false;
  let write = false;
  let json = false;
  let strict = false;
  let help = false;
  const paths: string[] = [];
  const unknown: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--style') style = argv[++i];
    else if (arg.startsWith('--style=')) style = arg.slice('--style='.length);
    else if (arg === '--config') config = argv[++i];
    else if (arg.startsWith('--config=')) config = arg.slice('--config='.length);
    else if (arg === '--no-config') noConfig = true;
    else if (arg === '--write') write = true;
    else if (arg === '--json') json = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '-h' || arg === '--help') help = true;
    // A bare `-` is stdin and is a path. Anything else with a leading dash is a
    // flag this build does not have, and the alternative to saying so is worse
    // than it looks: `--wrote` would fall through to `paths` and be reported as
    // a file that does not exist, so a typo in `--write` reads as a missing file
    // and the fix silently does not happen. The `=` is cut off so that
    // `--lang=fr` is reported as `--lang`, which is the part that is wrong.
    else if (arg !== '-' && arg.startsWith('-')) unknown.push(arg.split('=')[0]!);
    else paths.push(arg);
  }

  return { style, config, noConfig, write, json, strict, help, paths, unknown };
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

/** A config path for a report. Relative whenever that is shorter, because a
 * config is usually in an ancestor of the working directory and
 * `../typography.config.mjs` says where it is more plainly than a full path
 * does. `label` cannot be reused: for a *file* being checked, a path outside the
 * working directory is printed in full on purpose. */
function configLabel(config: Config): string {
  const rel = relative(process.cwd(), config.path);
  return rel && rel.length < config.path.length ? rel : config.path;
}

/** The names of the shipped styles, for a usage line that must not depend on
 * loading anybody's config. */
function shipped(): string {
  return styles.map((style) => style.name).join(', ');
}

/** Every name `--style` would answer to right now, for the error that says it
 * did not answer to the one given. */
function known(config: Config | undefined): string {
  return available(config)
    .filter((listed) => !listed.shadowed)
    .map((listed) => listed.style.name)
    .join(', ');
}

/**
 * The config, or undefined, from the flags.
 *
 * `--config` beats discovery and `--no-config` beats both, and a run that names
 * both is refused rather than resolved: the two flags are two answers to one
 * question, and picking one silently is how a CI job ends up checking against
 * rules nobody chose.
 */
async function configure(opts: Options): Promise<Config | undefined> {
  if (opts.noConfig) {
    if (opts.config !== undefined)
      throw new Error('--config and --no-config are two answers. Pass one.');
    return undefined;
  }
  const path = opts.config ?? findConfig(process.cwd());
  return path === undefined ? undefined : await loadConfig(path);
}

function stamp(style: Style, config: Config | undefined): string {
  const from = config?.styles.includes(style) ? ` via ${configLabel(config)}` : '';
  return `typocheck ${version} (${style.id}${from})`;
}

function report(path: string, findings: readonly Finding[]): string[] {
  return findings.map((f) => {
    const mark = f.fixable ? 'fixable' : f.severity;
    return `${label(path)}:${f.line}:${f.column}  ${mark.padEnd(7)} ${f.rule}  ${f.summary}\n      ${f.excerpt}\n      ${f.cite}`;
  });
}

async function main(argv: readonly string[]): Promise<number> {
  const verb = argv[0];
  if (!verb || verb === '-h' || verb === '--help' || verb === 'help') {
    console.log(usage());
    return 0;
  }
  // Bare, because the version is the first thing anyone types after installing a
  // CLI and the second thing they quote in a bug report. The shipped stamps come
  // with it: a findings count is comparable only against the rules that produced
  // it, so the two are one answer rather than two.
  //
  // **No config here, on purpose.** This is the answer to "what is installed",
  // and a broken config in the working tree must not be able to take it away
  // from somebody who is trying to file a bug. `typocheck styles` is the
  // question about styles, and it loads the config and fails loudly.
  if (verb === '-v' || verb === '--version' || verb === 'version') {
    console.log(`typocheck ${version}`);
    for (const style of styles) console.log(`  ${style.id}`);
    return 0;
  }
  if (verb !== 'check' && verb !== 'fix' && verb !== 'styles') {
    const renamed = RENAMED_VERBS[verb];
    console.error(
      renamed
        ? `typocheck: '${verb}' is '${renamed}' now, since a style need not be a language.`
        : `typocheck: unknown verb '${verb}'. Try 'typocheck --help'.`,
    );
    return 2;
  }

  const opts = parse(argv.slice(1));
  if (opts.help) {
    console.log(usage());
    return 0;
  }
  if (opts.unknown.length) {
    const renamed = opts.unknown.filter((flag) => RENAMED_OPTIONS[flag]);
    console.error(
      renamed.length
        ? renamed
            .map(
              (flag) =>
                `typocheck: ${flag} is ${RENAMED_OPTIONS[flag]} now. A style need not be a ` +
                `language: ${RENAMED_OPTIONS[flag]} fr is what ${flag} fr was, and a config can define others.`,
            )
            .join('\n')
        : `typocheck: unknown option ${opts.unknown.map((u) => `'${u}'`).join(', ')}. ` +
            "Try 'typocheck --help'.\nA bare - is stdin; everything else starting with a dash is a flag.",
    );
    return 2;
  }

  let config: Config | undefined;
  try {
    config = await configure(opts);
  } catch (error) {
    console.error(`typocheck: ${(error as Error).message}`);
    return 2;
  }

  if (verb === 'styles') {
    for (const { style, from, shadowed } of available(config))
      console.log(
        `${style.name.padEnd(12)} ${style.id.padEnd(24)} ${style.standard.padEnd(24)} ` +
          `${from === 'config' ? configLabel(config!) : 'built-in'}` +
          `${shadowed ? ` (shadowed by ${configLabel(config!)})` : ''}`,
      );
    return 0;
  }

  if (!opts.style) {
    console.error(
      `typocheck: --style is required. One of: ${known(config)}\n` +
        'Nothing here guesses a language, because a French rule applied to Swiss German produces confident nonsense.',
    );
    return 2;
  }
  const style = resolveStyle(opts.style, config);
  if (!style) {
    console.error(
      `typocheck: no style called '${opts.style}'. Known: ${known(config)}\n` +
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
        // anything moved. `typocheck fix --style fr --write - < in > out` is a
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
          // Always present, and null rather than absent when no config was
          // loaded, so a consumer can tell "this run used the shipped rules"
          // apart from "this output came from a tool that predates configs".
          config: config?.styles.includes(style) ? configLabel(config) : null,
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
      `\n${stamp(style, config)}: ${findings.length} findings in ${all.length} file(s) ` +
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

process.exitCode = await main(process.argv.slice(2));
