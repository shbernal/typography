// Finding and loading a config, which is a module.
//
// **The library has no config concept**, and this file is the evidence rather
// than a promise: nothing in `src/` imports it except `cli.ts`, and it is not on
// the root export. A host embedding this package composes a `Style` in its own
// code and hands it to `check`. A config file exists because a CLI cannot be
// handed an object.
//
// **Why a module and not JSON.** JSON is hashable, safe to read out of a tree
// you do not trust, and something an agent can write without executing anything,
// and it was still the wrong answer here. A declarative config that can express
// what `rules/` can express needs a string-keyed registry of builders and a
// schema for each builder's parameters, which is a second copy of the rule API
// that has to agree with the first. This repo has caught that shape three times
// in three releases: a matcher and a rewriter that disagreed, two rule lists
// sharing a family with one stamp between them, and four apostrophe summaries
// describing one character four ways. A module has no second copy, because the
// config calls the same `compose`, `derive` and builders the shipped styles do.
//
// What that costs is real and is not hidden: the CLI executes code from the
// working tree. So does every linter with a config file, and the alternative was
// a schema that could not say what the tool can do.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { styleFor, styles } from './check.ts';
import type { Style } from './pack.ts';

/**
 * The file names looked for, in every directory from the working one upwards.
 *
 * `.mjs` and `.js` both work anywhere this package runs: a config's `export
 * default` is unambiguous module syntax, which Node has detected in a `.js` file
 * since 22.7 whether or not the nearest `package.json` says
 * `"type": "module"`. `.ts` is the one with a floor, since type stripping is on
 * by default from 22.18 and this package supports 22, and the error an older
 * Node gives for it is about a file extension rather than about TypeScript. That
 * is the one failure `explain` translates.
 */
export const CONFIG_NAMES: readonly string[] = [
  'typography.config.mjs',
  'typography.config.js',
  'typography.config.ts',
  'typography.config.mts',
];

/** A loaded config: where it came from, and what it defines. */
export interface Config {
  /** Absolute path of the module. Goes in the report header, because a style
   * that came out of somebody's working tree has to say so. */
  readonly path: string;
  /** The styles it exports, in declaration order. Never empty. */
  readonly styles: readonly Style[];
}

/**
 * The nearest config at or above `from`, or undefined.
 *
 * **Two config files in one directory is an error rather than a precedence
 * rule.** A precedence rule here would mean that adding `typography.config.ts`
 * beside an existing `typography.config.mjs` silently changes nothing, or
 * silently changes everything, and which one it was depends on a list in this
 * file that the user has not read. There is no reading of two configs in one
 * directory that is worth guessing at.
 *
 * **The walk stops at the repository**, meaning the last directory it looks in
 * is the one holding `.git`. A monorepo keeps its config at the root and every
 * package under it still finds it, which is the case this has to serve; what it
 * refuses is a `typography.config.mjs` in a home directory quietly deciding the
 * typography of every project on the machine. That is the same objection as
 * guessing a language, one level up: a run must not depend on a file nobody
 * named. Outside a repository there is no boundary to find and the walk goes to
 * the filesystem root, which is why `--no-config` exists.
 */
export function findConfig(from: string): string | undefined {
  let dir = resolve(from);
  for (;;) {
    const found = CONFIG_NAMES.map((name) => join(dir, name)).filter((path) => existsSync(path));
    if (found.length > 1)
      throw new Error(
        `${dir} has ${found.length} config files: ${found.map((p) => p.slice(dir.length + 1)).join(', ')}. ` +
          'Keep one. Which of them won would depend on an ordering nobody reading the directory can see.',
      );
    if (found[0]) return found[0];
    // Checked after the names, so a config sitting beside `.git` is found.
    if (existsSync(join(dir, '.git'))) return undefined;
    const up = dirname(dir);
    // The filesystem root, where `dirname` stops moving.
    if (up === dir) return undefined;
    dir = up;
  }
}

/**
 * Load a config module and check that what it exports is a style.
 *
 * Structurally, the way a pack was always recognised: `{ id, name, stamp,
 * standard, rules, normalize }` and nothing registers itself. A user whose
 * config exports something else gets told what is missing, since the object
 * arriving here came from a call to `compose` or `derive` in almost every case,
 * and the interesting failure is the other one: a config that exports the spec
 * it meant to pass to `compose`.
 */
export async function loadConfig(path: string): Promise<Config> {
  let exported: unknown;
  try {
    exported = ((await import(pathToFileURL(path).href)) as { default?: unknown }).default;
  } catch (error) {
    throw new Error(explain(error as Error, path));
  }

  if (exported === undefined)
    throw new Error(
      `${path} has no default export. Export a style built with \`compose\` or \`derive\`, ` +
        'or an array of them.',
    );

  const list = Array.isArray(exported) ? (exported as unknown[]) : [exported];
  if (list.length === 0)
    throw new Error(`${path} exports an empty array, so it defines no styles.`);

  const found: Style[] = [];
  const seen = new Set<string>();
  for (const [index, value] of list.entries()) {
    const where = Array.isArray(exported) ? `default export [${index}]` : 'default export';
    if (!isStyle(value))
      throw new Error(
        `${path}: the ${where} is not a style. ` +
          'A style comes from `compose` or `derive` and carries `id`, `name`, `stamp`, ' +
          '`standard`, `rules` and `normalize`. Exporting the spec you meant to pass to ' +
          '`compose` is the usual version of this.',
      );
    // Case-insensitively, because that is how `--style` resolves: two styles
    // that differ only in case are one name to everybody who has to type it.
    const key = value.name.toLowerCase();
    if (seen.has(key))
      throw new Error(
        `${path} defines two styles named ${value.name}. ` +
          'A name is what `--style` takes, so one config has one style per name.',
      );
    seen.add(key);
    found.push(value);
  }

  return { path, styles: found };
}

/**
 * The style `--style <name>` means, or undefined.
 *
 * Config first, and **a config style may take a shipped style's name**. That is
 * the case the whole feature exists for: a house French is still French, every
 * script in the repo already says `--style fr`, and making them all say
 * `--style fr-house` instead would be a rename in place of a decision. What
 * makes it safe rather than quiet is the stamp, which is derived from the rules
 * and therefore differs from the shipped one, and which every report carries
 * next to the config's path.
 *
 * Then by name, then by BCP 47 tag. The last two are the same lookup today,
 * since every shipped style is named for its tag, and they are two steps because
 * a style need not be about a language and `styleFor` is about tags.
 */
export function resolveStyle(name: string, config?: Config): Style | undefined {
  const want = name.toLowerCase();
  return (
    config?.styles.find((style) => style.name.toLowerCase() === want) ??
    styles.find((style) => style.name.toLowerCase() === want) ??
    styleFor(name)
  );
}

/** A style a caller can name, and where it came from. */
export interface Listed {
  readonly style: Style;
  readonly from: 'config' | 'built-in';
  /** A shipped style this config has taken the name of. It is listed anyway:
   * disappearing from the listing is how a user loses track of the fact that
   * `--style fr` stopped meaning the Imprimerie nationale's French. */
  readonly shadowed: boolean;
}

/** Everything `--style` would resolve, config first, in the order it resolves. */
export function available(config?: Config): readonly Listed[] {
  const taken = new Set((config?.styles ?? []).map((style) => style.name.toLowerCase()));
  return [
    ...(config?.styles ?? []).map((style) => ({ style, from: 'config' as const, shadowed: false })),
    ...styles.map((style) => ({
      style,
      from: 'built-in' as const,
      shadowed: taken.has(style.name.toLowerCase()),
    })),
  ];
}

// ---------------------------------------------------------------------------

/**
 * A load failure, with the one that is not about the config translated.
 *
 * Exported so it can be tested, which is the whole reason it is a function: the
 * case it exists for is a Node older than the one this repo develops on, so the
 * only way to hold it is to hand it the error. Everything else is passed through
 * with the path in front of it, because a stack trace from somebody's own config
 * is more useful than anything this file could say about it.
 */
export function explain(error: Error, path: string): string {
  if (/unknown file extension/i.test(error.message) && /\.m?ts$/.test(path))
    return (
      `${path}: this Node cannot load a TypeScript config. Type stripping is on by ` +
      'default from Node 22.18; on an older one, write the config as ' +
      `typography.config.mjs.\n  ${error.message}`
    );
  return `${path}: ${error.message}`;
}

function isStyle(value: unknown): value is Style {
  if (typeof value !== 'object' || value === null) return false;
  const style = value as Partial<Style>;
  return (
    typeof style.id === 'string' &&
    typeof style.name === 'string' &&
    typeof style.stamp === 'string' &&
    typeof style.standard === 'string' &&
    Array.isArray(style.rules) &&
    typeof style.normalize === 'function'
  );
}
