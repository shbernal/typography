// The skill ships from this repo, so its claims are executed rather than
// proofread. That is the entire reason the skill lives here: a copy in a skills
// repo could only have been kept honest by a cross-repo diff test, and this file
// is what that machinery was a bad substitute for.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { packFor, packs } from '../src/check.ts';

const SKILL_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'skills',
  'typography-check',
);
const SKILL = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');

function frontmatter(): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(SKILL);
  assert.ok(match, 'SKILL.md has no frontmatter');
  const out: Record<string, string> = {};
  let key = '';
  for (const line of match[1]!.split('\n')) {
    const start = /^(\w[\w-]*):\s*(.*)$/.exec(line);
    if (start) {
      key = start[1]!;
      out[key] = start[2]!;
    } else out[key] = `${out[key]} ${line.trim()}`;
  }
  return out;
}

test('frontmatter matches the skill format', () => {
  const fm = frontmatter();
  assert.deepEqual(Object.keys(fm).sort(), ['description', 'name']);
  assert.equal(fm.name, 'typography-check', 'name must match the directory');
  assert.ok(fm.name!.length <= 64);
  // Over the limit the description risks being truncated or rejected, and it is
  // the only thing a model sees when deciding to invoke the skill.
  assert.ok(fm.description!.length <= 1024, `description is ${fm.description!.length} characters`);
});

test('the description names every language the tool actually ships', () => {
  const fm = frontmatter();
  for (const pack of packs)
    assert.ok(
      fm.description!.toLowerCase().includes(pack.standard.split(' ')[0]!.toLowerCase()) ||
        /french|spanish|german/i.test(fm.description!),
      `description does not reach ${pack.lang}`,
    );
});

test('every --lang the skill names is a real pack', () => {
  const named = [...SKILL.matchAll(/--lang[= ]([^\s`|]+)/g)]
    .map((m) => m[1]!)
    .filter((t) => !t.startsWith('<'));
  assert.ok(named.length >= 2, 'the skill should show more than one language');
  for (const tag of named)
    assert.ok(packFor(tag), `SKILL.md invokes --lang ${tag}, which has no pack`);
});

test('every flag and verb the skill names is one the CLI accepts', () => {
  const usage = readFileSync(resolve(SKILL_DIR, '..', '..', 'src', 'cli.ts'), 'utf8');
  for (const flag of new Set([...SKILL.matchAll(/`(--[a-z]+)`/g)].map((m) => m[1]!)))
    assert.ok(
      usage.includes(`'${flag}'`),
      `SKILL.md documents ${flag}, which the CLI does not parse`,
    );
  for (const verb of ['check', 'fix', 'langs'])
    assert.ok(SKILL.includes(verb) && usage.includes(`'${verb}'`));
});

test('the skill teaches the four things that are not in --help', () => {
  // Losing any of these turns the skill into a help page in Markdown, which is
  // not worth shipping.
  assert.match(SKILL, /<NBSP>/, 'must teach that findings are invisible');
  assert.match(SKILL, /fixable/, 'must teach that some findings must not be auto-fixed');
  assert.match(SKILL, /--write/, 'must teach that writing is a separate decision');
  assert.match(
    SKILL,
    /do not sniff it|does not detect|refuses to guess/i,
    'must teach stating the language',
  );
});

test('the references exist and one is read only once the language is known', () => {
  for (const ref of ['fr', 'es', 'de']) {
    const body = readFileSync(join(SKILL_DIR, 'references', `${ref}.md`), 'utf8');
    assert.ok(body.length > 500, `references/${ref}.md is a stub`);
    assert.ok(
      SKILL.includes(`references/${ref}.md`),
      `SKILL.md does not point at references/${ref}.md`,
    );
  }
});

test('every rule id the references name still exists', () => {
  // The references cite rules by id, and a rule id appears in committed gate
  // counts, so renaming one silently invalidates both. This is the check that
  // makes the rename visible.
  const known = new Set(packs.flatMap((p) => p.rules.map((r) => r.id)));
  for (const ref of ['fr', 'es', 'de']) {
    const body = readFileSync(join(SKILL_DIR, 'references', `${ref}.md`), 'utf8');
    for (const m of body.matchAll(/`((?:fr|es|de|de-DE|de-CH)\.[a-z-]+)`/g))
      assert.ok(known.has(m[1]!), `references/${ref}.md names ${m[1]}, which no pack defines`);
  }
});

test('the plugin manifests agree with the package they ship in', () => {
  // The marketplace points at the npm package rather than at this git repo, and
  // that is the whole reason there is nothing here to keep in sync: a plugin
  // install and an `npm install` fetch the same tarball, so the skill and the
  // binary it invokes cannot be different versions. A github source would have
  // shipped `skills/` with no `dist/`, since `dist/` is not committed.
  const root = resolve(SKILL_DIR, '..', '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    name: string;
    files: string[];
  };
  const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8')) as {
    name: string;
  };
  const market = JSON.parse(
    readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf8'),
  ) as { plugins: { name: string; source: { source: string; package?: string } }[] };

  assert.equal(plugin.name, 'typography-check');
  assert.equal(market.plugins[0]!.name, plugin.name);
  assert.equal(market.plugins[0]!.source.source, 'npm');
  assert.equal(market.plugins[0]!.source.package, pkg.name);
  assert.ok(
    pkg.files.includes('.claude-plugin'),
    'the manifest must be inside the tarball it names',
  );
});

test('the skill is inside the published tarball', () => {
  const pkg = JSON.parse(readFileSync(resolve(SKILL_DIR, '..', '..', 'package.json'), 'utf8')) as {
    files: string[];
  };
  assert.ok(pkg.files.includes('skills'), 'skills/ is not in the files allowlist');
});
