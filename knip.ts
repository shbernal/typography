// knip's entries, derived from package.json rather than listed beside it.
//
// knip does not trace a subpath export in `dist/` back to its source, and
// naming any entry replaces its defaults rather than adding to them, so a
// hand-written list here would be every public module a second time, required
// to agree with `exports` and `bin`. Mapping them instead keeps that list in one
// place. The charcheck config is the one entry package.json cannot name, since a
// tool loads it.
//
// An audit and not a gate: `pnpm knip` is not part of `pnpm check`.

import { readFileSync } from 'node:fs';

import type { KnipConfig } from 'knip';

const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8')) as {
  exports: Record<string, { import: string }>;
  bin: Record<string, string>;
};

/** `./dist/styles/fr.js` to `src/styles/fr.ts`, which is what `tsc` compiled it from. */
function source(built: string): string {
  return built.replace(/^(\.\/)?dist\//, 'src/').replace(/\.js$/, '.ts');
}

const config: KnipConfig = {
  entry: [
    ...Object.values(pkg.exports).map((target) => source(target.import)),
    ...Object.values(pkg.bin).map(source),
    'charcheck.config.ts',
  ],
  project: ['src/**/*.ts', 'test/**/*.ts', 'scripts/**/*.ts'],
};

export default config;
