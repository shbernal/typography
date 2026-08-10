// Refuses a release whose git tag, package.json version and CHANGELOG heading
// do not all say the same thing.
//
// The tag names the release everywhere a human looks at it; package.json decides
// what actually lands on the registry; the CHANGELOG is what anyone reads to find
// out what changed. Nothing else compares the three, so a mismatch publishes
// quietly under the wrong number, or ships with the changelog still saying
// "Unreleased", and is discovered by somebody installing it.
//
// Run in CI on a published release, where GITHUB_REF_NAME is the tag the release
// points at. Run by hand it checks GITHUB_REF_NAME or argv[2], and
// says nothing useful without one, which is the correct outcome outside a
// release.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (!tag) {
  console.error('check-release-tag: no tag given and GITHUB_REF_NAME is unset.');
  process.exit(2);
}

const wanted = `v${version}`;
if (tag !== wanted) {
  console.error(
    `check-release-tag: tag ${tag} does not match package.json version ${version}.\n` +
      `Expected the tag ${wanted}. Move the tag or bump the version, but do not publish this.`,
  );
  process.exit(1);
}

// A heading, not a mention: `## 0.1.0` or `## 0.1.0 - 2026-08-09`, and not
// `## Unreleased`. The changelog is the one release artefact a human reads and
// the one nothing else checks.
const changelog = readFileSync(join(repo, 'CHANGELOG.md'), 'utf8');
const heading = new RegExp(`^##\\s+v?${version.replace(/\./g, '\\.')}(\\s|$)`, 'm');
if (!heading.test(changelog)) {
  console.error(
    `check-release-tag: CHANGELOG.md has no "## ${version}" heading.\n` +
      'Rename the Unreleased section to the version being published. A release whose ' +
      'changelog still says Unreleased tells a reader nothing about what they installed.',
  );
  process.exit(1);
}

console.log(`check-release-tag: ${tag} matches package.json and CHANGELOG.md.`);
