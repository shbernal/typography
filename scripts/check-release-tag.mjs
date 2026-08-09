// Refuses a release whose git tag disagrees with package.json.
//
// The tag names the release everywhere a human looks at it; package.json decides
// what actually lands on the registry. Nothing else compares the two, so a
// mismatch publishes quietly under the wrong number and is discovered by
// somebody installing it.
//
// Run in CI on a tag push. Run by hand it checks GITHUB_REF_NAME or argv[2], and
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

console.log(`check-release-tag: ${tag} matches package.json.`);
