// `lefthook install`, but only where lefthook would own the hooks it writes.
//
// `prepare` runs this on every `pnpm install`, and pnpm verifies the dependency
// tree before running any script, so in practice it runs before every `pnpm
// run` and `pnpm exec` too. A non-zero exit here therefore takes the package
// manager down with it: `pnpm check` would die in the install that pnpm ran
// first, before it ever reached the typechecker.
//
// Calling `lefthook install` directly is exactly that hazard. Lefthook refuses
// to install while `core.hooksPath` points somewhere it does not own, and exits
// 1, correctly: writing its wrappers into a directory shared by every repo on
// the machine would clobber whatever else lives there. Its two ways past that
// are both worse than skipping. `--reset-hooks-path` unsets the global key and
// silently disarms every other repo relying on it, and `--force` writes into
// the shared directory and breaks them loudly. Neither is a decision a
// `prepare` script gets to make on a contributor's behalf.
//
// So: install where git would run `.git/hooks`, and otherwise say what was
// skipped and why. Skipping is never silent, because a gate nobody knows is off
// is the failure mode this repo is built around. Nothing here is fatal either
// way: the hooks mirror a slice of `pnpm check`, and `pnpm check` is the gate.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function note(message: string): void {
  process.stderr.write(`install-hooks: ${message}\n`);
}

/** A `git` query, or undefined when git declines to answer: no repo, or an unset key. */
function git(...args: readonly string[]): string | undefined {
  try {
    const value = execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return value === '' ? undefined : value;
  } catch {
    return undefined;
  }
}

/**
 * `core.hooksPath` as an absolute path, or undefined when nothing sets it.
 *
 * `git config --get` reports the raw string from whichever file won, so the two
 * conveniences git applies to a path-typed value have to be reapplied here: `~`
 * expansion, and resolving a relative path against the top of the working tree,
 * which is where hooks run from.
 */
function configuredHooksPath(topLevel: string): string | undefined {
  const raw = git('config', '--get', 'core.hooksPath');
  if (raw === undefined) return undefined;
  const expanded = raw === '~' || raw.startsWith('~/') ? join(homedir(), raw.slice(1)) : raw;
  return isAbsolute(expanded) ? resolve(expanded) : resolve(topLevel, expanded);
}

/** Windows reaches one directory through more than one spelling; git treats them as one. */
function samePath(a: string, b: string): boolean {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function install(...args: readonly string[]): void {
  // Lefthook's own `bin` entry, not `node_modules/.bin/lefthook`. The shim is a
  // `.CMD` on Windows, which Node will not spawn without a shell, and a shell
  // here would be one more dialect to get wrong. This is the file the shim
  // would have run, so it is the published contract rather than a reach into
  // the package.
  let entry: string;
  try {
    entry = createRequire(import.meta.url).resolve('lefthook/bin/index.js');
  } catch {
    // No lefthook on disk, which is what `--prod` and `--ignore-scripts`
    // installs look like: legitimate states with no hooks to install.
    note('lefthook is not installed, nothing to do.');
    return;
  }
  if (!existsSync(entry)) {
    note(`lefthook bin missing at ${entry}, skipping install.`);
    return;
  }

  try {
    execFileSync(process.execPath, [entry, 'install', ...args], { cwd: ROOT, stdio: 'inherit' });
  } catch (error) {
    // Reported rather than rethrown. The commonest cause is the remote config
    // fetch failing, and an offline contributor must still be able to run
    // `pnpm check`, which pnpm would not reach if this exited non-zero.
    note(`lefthook install failed (${String(error)}), hooks not installed.`);
  }
}

function main(): void {
  if (process.env.LEFTHOOK === '0') {
    note('LEFTHOOK=0, skipping install.');
    return;
  }

  const gitDir = git('rev-parse', '--absolute-git-dir');
  const topLevel = git('rev-parse', '--show-toplevel');
  if (gitDir === undefined || topLevel === undefined) {
    note('not a git checkout, skipping install.');
    return;
  }

  const configured = configuredHooksPath(topLevel);
  if (configured === undefined) {
    install();
    return;
  }
  if (samePath(configured, resolve(gitDir, 'hooks'))) {
    // Lefthook objects to `core.hooksPath` being set at all rather than to
    // where it points, so it refuses even this: a path naming the directory it
    // was going to write to anyway. `--force` is the documented way past that
    // check, and the warning it carries describes this destination.
    install('--force');
    return;
  }

  note(`core.hooksPath is set to ${configured}, which lefthook does not own.`);
  note('  Skipped. The hooks fire only if that directory delegates back to this');
  note('  repo, so verify before relying on them: a commit should print lefthook');
  note('  output. `pnpm check` is the gate either way.');
}

main();
