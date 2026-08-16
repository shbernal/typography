// The skill ships from this repo, so its claims are executed rather than
// proofread. That is the entire reason the skill lives here: a copy in a skills
// repo could only have been kept honest by a cross-repo diff test, and this file
// is what that machinery was a bad substitute for.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { styleFor, styles } from '../src/check.ts';

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

/** The primary subtag, which is the grain the skill's prose and its reference
 * files work at: `de-DE` and `de-CH` are two styles and one German. */
function primary(lang: string): string {
  return lang.split('-')[0]!;
}

/** The English name of a language, for matching against prose written in
 * English. Derived rather than tabulated, so adding a style cannot leave a stale
 * entry behind: the failure this whole file exists to prevent. */
const ENGLISH = new Intl.DisplayNames(['en'], { type: 'language' });

/** Every language the registry ships, once each, as an English name. A shipped
 * style is always about a language, and the type does not promise that, so the
 * tags are gathered rather than mapped. */
const TAGS: readonly string[] = styles.flatMap((style) => (style.lang ? [style.lang] : []));

const LANGUAGES = [...new Set(TAGS.map(primary))].map((tag) => ({
  tag,
  name: ENGLISH.of(tag)!,
}));

/**
 * Whether a description names a language as one the tool handles.
 *
 * A substring search is not enough, and the reason is specific to this package:
 * its own pitch is "non-English typography", and English is the language most
 * likely to be added next. A description that said the tool was *for* non-English
 * text would contain the word English and satisfy a naive test, so the assertion
 * below would go green for a language the skill had never been told about. The
 * negated forms are therefore not a match.
 */
function namesLanguage(description: string, language: string): boolean {
  return new RegExp(`(?<!\\bnon-)(?<!\\bnot )\\b${language}\\b`, 'i').test(description);
}

test('naming a language means naming it, not declining it', () => {
  // The plan for shipping English predicted this test would start passing
  // vacuously, so it is checked against fabricated descriptions before it is
  // pointed at the real one. A test that has never failed is a test nobody has
  // checked, and this one guards a claim a model reads to decide whether to
  // invoke the tool at all.
  assert.ok(namesLanguage('Check French orthotypography', 'French'));
  assert.ok(!namesLanguage('For non-English typography', 'English'));
  assert.ok(!namesLanguage('Not English. Use it on Dutch.', 'English'));
  assert.ok(namesLanguage('Not English. Use it on Dutch.', 'Dutch'));
  assert.ok(!namesLanguage('Frenchify nothing', 'French'));
});

test('the description names every language the tool ships, and no other', () => {
  // This assertion used to carry `|| /french|spanish|german/i.test(...)`, which
  // meant it passed for every pack as long as the description mentioned any one
  // of those three. It therefore never checked coverage at all, and adding a
  // fourth language is what showed it: `nl` shipped and the test stayed green.
  //
  // Nothing here is a literal any more. The language names come from the
  // registry through `Intl`, so a fifth language fails this the moment it is
  // registered and before its skill copy is written.
  const fm = frontmatter();
  for (const { tag, name } of LANGUAGES)
    assert.ok(
      namesLanguage(fm.description!, name),
      `the skill description does not name ${name} (${tag}), which the tool ships`,
    );
  // And the direction that was never checked. A description listing a language
  // no style answers for is not a smaller mistake than one omitting a language:
  // the model reads it, invokes the tool, and gets `--style` refused.
  for (const tag of ['en', 'it', 'pt', 'ja', 'pl']) {
    if (LANGUAGES.some((language) => language.tag === tag)) continue;
    const name = ENGLISH.of(tag)!;
    assert.ok(
      !namesLanguage(fm.description!, name),
      `the skill description names ${name}, which no style answers for`,
    );
  }
});

test('every --style the skill names is a shipped style', () => {
  // By tag rather than by name, which are the same thing for every shipped
  // style and are not the same question: the skill may only name styles that
  // are in the tarball it ships in, and a config style is in somebody's working
  // tree. `styleFor` is the tag lookup and cannot see one.
  const named = [...SKILL.matchAll(/--style[= ]([^\s`|]+)/g)]
    .map((m) => m[1]!)
    .filter((t) => !t.startsWith('<'));
  assert.ok(named.length >= 2, 'the skill should show more than one language');
  for (const tag of named)
    assert.ok(styleFor(tag), `SKILL.md invokes --style ${tag}, which has no style`);
});

test('every flag and verb the skill names is one the CLI accepts', () => {
  const usage = readFileSync(resolve(SKILL_DIR, '..', '..', 'src', 'cli.ts'), 'utf8');
  // The dash inside the name is in the class on purpose: `--no-config` was not
  // matched by `--[a-z]+`, so the first flag this package shipped with a hyphen
  // in it was documented and unchecked.
  for (const flag of new Set([...SKILL.matchAll(/`(--[a-z][a-z-]*)`/g)].map((m) => m[1]!)))
    assert.ok(
      usage.includes(`'${flag}'`),
      `SKILL.md documents ${flag}, which the CLI does not parse`,
    );
  for (const verb of ['check', 'fix', 'styles'])
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

test('every stamp the skill quotes is one a style currently carries', () => {
  // The failure this catches, which had already happened: the skill's worked
  // example of a report footer quoted a stamp the package had moved past, and
  // the same file told the reader that a report carrying that stamp predated the
  // guillemet narrowing and should be ignored. So the example taught a model to
  // distrust the tool's own current output.
  //
  // A stamp moves whenever a rule changes, which is exactly when nobody is
  // thinking about the skill, so this cannot be left to review. It moves more
  // readily now than it did when a maintainer had to type a version, which makes
  // this test more load-bearing rather than less.
  const current = new Set(styles.map((style) => style.id));
  // Built from the registry rather than written out, for the reason above one
  // level up: a hand-kept alternation of tags does not fail when a language is
  // added, it just stops watching that language's stamps.
  const tags = TAGS.map((tag) => tag.replace('-', '\\-')).join('|');
  const quoted = [...SKILL.matchAll(new RegExp(`\\b((?:${tags})@[0-9a-f]{12})\\b`, 'g'))];

  assert.ok(quoted.length > 0, 'the skill should show at least one stamp');
  for (const match of quoted)
    assert.ok(
      current.has(match[1]!),
      `SKILL.md quotes ${match[1]}, which no style carries. A stamp is derived from ` +
        'the rules, so this moved because a rule moved.',
    );
});

test('the references exist and one is read only once the language is known', () => {
  // One reference per language, not per style: `de-DE` and `de-CH` share `de.md`
  // because they share a standard and differ only in which guillemet opens.
  for (const { tag } of LANGUAGES) {
    const body = readFileSync(join(SKILL_DIR, 'references', `${tag}.md`), 'utf8');
    assert.ok(body.length > 500, `references/${tag}.md is a stub`);
    assert.ok(
      SKILL.includes(`references/${tag}.md`),
      `SKILL.md does not point at references/${tag}.md`,
    );
  }
});

test('the references name every rule, and no rule that is gone', () => {
  // The references cite rules by id, and a rule id appears in committed gate
  // counts, so renaming one silently invalidates both. This used to look for a
  // language prefix, which global ids removed; matching on the prefix now finds
  // nothing and passes vacuously, so the fixability note is the anchor instead.
  // Every rule entry in a reference carries one, whether it is a heading or a
  // bullet, and nothing else in these files does.
  const heading = /^(.*\((?:warning, )?(?:not )?fixable\).*)$/gm;
  for (const { tag } of LANGUAGES) {
    // By primary tag, because `de.md` covers both German regions and there is
    // deliberately no bare `de` style. Under global ids the two regions' rule
    // sets overlap almost entirely, which is what makes one reference honest.
    const known = new Set(
      styles
        .filter((style) => style.lang !== undefined && primary(style.lang) === tag)
        .flatMap((style) => style.rules.map((rule) => rule.id)),
    );
    const body = readFileSync(join(SKILL_DIR, 'references', `${tag}.md`), 'utf8');
    const named = new Set<string>();
    for (const [, line] of body.matchAll(heading))
      for (const m of line!.matchAll(/`([a-z][a-z0-9-]*)`/g)) {
        assert.ok(
          known.has(m[1]!),
          `references/${tag}.md names ${m[1]}, which ${tag} does not have`,
        );
        named.add(m[1]!);
      }
    // And the other direction, which the prefix version never checked: a rule
    // added with no entry here is a rule a reader of the skill cannot look up.
    for (const id of known)
      assert.ok(named.has(id), `references/${tag}.md has no heading for ${tag}'s ${id}`);
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
