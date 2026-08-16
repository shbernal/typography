// The banned-character rules are enforced by the test suite as well as by lint,
// so they hold even when somebody runs only `pnpm test`. The rules themselves
// live in `charcheck.config.ts` and are loaded from there rather than restated:
// a second copy of the character list is one more thing that has to agree with
// itself.
//
// The second and third tests are the "a zero is not a result" discipline
// applied to this gate. A rule that reaches no file, and a rule that could not
// match if it did, both report nothing and look exactly like a rule that
// passed. The first of those is silent here for two reasons that are easy to
// walk into: a dotted directory is only entered when a pattern names it, and a
// config resolves its globs against its own directory, so moving the file moves
// what it can see.

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { scan, scanText } from 'charcheck';
import { fileRules, loadConfig, toScanOptions, virtualRules } from 'charcheck/config';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

test('no banned characters anywhere in the repo', async () => {
  const loaded = await loadConfig({ from: ROOT });
  const findings = await scan(toScanOptions(loaded));
  assert.deepEqual(
    findings.map((f) => `${f.ruleId} ${f.file}:${f.line}:${f.column}`),
    [],
  );
});

test('every rule that targets files reaches some', async () => {
  const loaded = await loadConfig({ from: ROOT });
  // charcheck warns rather than fails on a rule whose globs matched nothing,
  // which is right for a tool and not enough for a gate: the warning goes to
  // output nobody reads on the run that matters, which is the one that passes.
  const warnings: string[] = [];
  await scan({ ...toScanOptions(loaded), onWarning: (message) => warnings.push(message) });
  assert.deepEqual(warnings, []);
});

test('the rules catch what they ban', async () => {
  const loaded = await loadConfig({ from: ROOT });
  // Built from code points, like the config and for the same reason: written
  // out, the first would be a finding in the file asserting it is caught, and
  // the second is indistinguishable from a space.
  const emDash = String.fromCharCode(0x2014);
  const narrowNoBreak = String.fromCharCode(0x202f);

  const inFile = await scanText(
    `a ${emDash} b${narrowNoBreak}c`,
    'sample.md',
    fileRules(loaded.config.rules),
  );
  assert.deepEqual(inFile.map((f) => f.ruleId).sort(), ['no-em-dash', 'no-invisible-characters']);

  // The commit message is a surface no file scan reaches, so it is the one that
  // would go untested by a repo-wide assertion alone.
  const inMessage = await scanText(
    `feat: a ${emDash} b`,
    'COMMIT_EDITMSG',
    virtualRules(loaded.config.rules, 'commit-msg'),
  );
  assert.deepEqual(
    inMessage.map((f) => f.ruleId),
    ['no-em-dash-in-commit-msg'],
  );
});
