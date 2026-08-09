// The em-dash rule is enforced by the test suite as well as by lint, so it
// holds even when somebody runs only `pnpm test`.

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { scanForEmDashes } from '../scripts/check-no-emdash.ts';

test('no em dashes anywhere in the repo', () => {
  const root = resolve(fileURLToPath(import.meta.url), '..', '..');
  const hits = scanForEmDashes(root);
  assert.deepEqual(
    hits.map((h) => `${h.file}:${h.line}`),
    [],
  );
});
