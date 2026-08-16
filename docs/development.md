# Development

[CONTRIBUTING.md](../CONTRIBUTING.md) has the setup. This page is what you need
before changing a rule.

## Environment

Node 24 for development: the sources run directly under Node's type stripping,
which is why `erasableSyntaxOnly` is on and why relative imports keep their `.ts`
extension. `rewriteRelativeImportExtensions` turns them into `.js` on the way
into `dist/`. The **published** package targets Node 22, and
`scripts/smoke-dist.mjs` in CI is what backs that claim.

```bash
pnpm install
pnpm check          # typecheck + lint + test. The done gate
pnpm build
pnpm battery        # every style over every fixture, as a diffable dump
```

`pnpm check` is the whole gate and needs no network. The corpus gates that used
to sit beside it are gone; what replaced them is `audit`, which holds a style to
idempotence, conformance and non-interference over samples the caller supplies.
[provenance.md](provenance.md) records what the corpora established before they
left.

## The fixtures

`test/fixtures.ts` is what the corpora were replaced with, and it is weighted
differently on purpose. The corpora were prose somebody published; this is
**machine text**, because the input this package is now for is a model's output,
where a fenced block, a JSON payload and a Windows path arrive in the same value
as the sentence. Every rule here is about a character that carries punctuation in
a sentence and syntax in a token, so that is where the fixtures sit.

Three files use them and each asks something different:

| File | Asks |
|---|---|
| `test/styles.test.ts` | the invariants the comments in `src/` claim |
| `test/hazards.test.ts` | can a rule tell a sentence from a token |
| `test/battery.test.ts` | did anything move |

Two things in `hazards.test.ts` are worth knowing before changing a rule. It
asserts that **every rule in every style fires on at least one fixture**, because
a property over samples that reach nothing passes for any set of rules; if you
add a rule, add the fixture that reaches it or the suite goes quiet about it. And
it holds **the rules that rewrite machine text** to a written-down list, which is
a ratchet rather than an approval: every row is a defect with a `FOLLOW-UPS.md`
entry, and a rule that joins them fails the test by name.

## The invariants

These are the things that must not be broken. [design.md](design.md) has the
reasoning behind the first four.

- **`check` is a superset of `fix`, and `normalize` is the fix set.** A rule
  whose repair needs information the pattern does not have gets a `find` and no
  `fix`. Do not "complete" a `detectRule` by guessing a repair.
- **Every rule carries a citation**, as provenance rather than as permission, and
  a style must not assert what its citation does not fix.
- **Never write a rule twice.** `replaceRule` derives `find` and `fix` from one
  pattern. If you are writing a matcher and a rewriter separately, plus a test to
  keep them equal, the test is a symptom.
- **Every fix must be idempotent, and an inserting rule has to match its own
  output.** `test/styles.test.ts` asserts this per rule and per style.
- **Never paste an invisible character into a test or a doc.** U+0020, U+00A0,
  U+202F and U+2009 are indistinguishable in a source file, and a test using them
  literally passes while asserting the wrong thing. Use the `NO_BREAK`,
  `NARROW_NO_BREAK` and `THIN` constants, or an escape. This paragraph is not
  hypothetical: an earlier draft of it contained a literal U+00A0.
- **A report must never quote raw text.** Use `reveal` / `excerptAt`. A raw
  excerpt shows a reader two identical-looking strings and looks fine.
- **No em dashes (U+2014).** `scripts/check-no-emdash.ts` enforces it, in lint
  and again in the test suite. A module that must *name* the character builds it
  with `String.fromCharCode(0x2014)`.
- **Zero runtime dependencies.** Not an aspiration: it is what makes
  `npx @shbernal/typography` fetch one tarball rather than resolve a tree, which
  is what makes the public entry point tolerable and what the skill leans on.
  Dev dependencies are unconstrained.
- **A style must not import `translation-harness`,** and there is no registration
  call in either direction. `{ id, normalize }` is the whole contract, satisfied
  structurally.
- **The library has no config concept.** `src/config.ts` is the CLI's and is
  imported by `src/cli.ts` and nothing else; `test/config.test.ts` walks every
  module in `src/` to hold that, because the way it breaks is somebody reaching
  for `findConfig` from inside a rule module rather than through `index.ts`.

## Patterns must be linear, and this is the expensive one

**A pattern must have one way to match, and a pattern that starts with a space
quantifier must be anchored to the start of the run.** Both halves of that
sentence cost real time.

`ANY_SPACE*BREAKABLE ANY_SPACE*` is ambiguous, because `BREAKABLE` is a subset of
`ANY_SPACE`, so on a run of spaces with no guillemet after it the engine tries
every way of splitting the run: the French guillemet rules took 242 ms at 800
spaces, 1.5 s at 1,600 and **15 seconds** on one padded 3,000-space line. Nothing
hostile is required to produce one; an indented block or a wrapped table will do.

`ANY_SPACE+` followed by a guillemet is unambiguous and still quadratic, because
without a `(?<!ANY_SPACE)` in front of it every character of a run starts a fresh
scan that consumes to the end of it.

Rules in three of the four rule sets then shipping had one or the other, and the
German and Spanish ones were found only after the French one had been fixed and
written up as French-only. So: write the exception as a lookahead at the position where the
run starts, take the run once, and do not enumerate the defects as alternatives.
`src/fr.ts` works through it at the constant `CORRECT_AFTER_OPEN`, and
`test/perf.test.ts` holds every style to linear time so a fourth instance fails
rather than ships.

`SECURITY.md` calls a pattern that behaves this way a vulnerability in this
package, which makes `test/perf.test.ts` the assertion behind that claim rather
than a benchmark.

## Adding a rule

A rule lives in `src/rules/`, one module per family, each exporting a builder
that a style calls with its own citation and character classes. Read `src/fr.ts`
for the comment density expected: every narrowing says what it is protecting.

1. Look for the family first. Six builders already cover most of the
   declarations in the package, and the question a new rule asks is usually one
   of theirs with a different answer. `punctuation-spacing` is the worked case:
   French requires the space and five styles forbid it, and that is one builder
   with a parameter rather than two rules.
2. **A rule id names the position, not the verdict.** Ids are global, so
   `guillemet-open-space` means "what belongs inside an opening guillemet" and
   the answer differs per style. A builder owns its id rather than taking one,
   which is what stops a style introducing a near-duplicate by spelling a name
   slightly differently.
3. Every parameter the rule's behaviour depends on has to reach the pattern or
   the `params` the signature hashes. A parameter that reaches the text through a
   closure is invisible to the stamp, and `conformRule` nearly shipped that way.
4. The citation is the style's, never the builder's. Sharing a pattern across
   languages is the point; sharing a citation would be a rule asserting an
   authority that never spoke.

## Adding a style

1. `src/<name>.ts`, a `compose({ name, lang?, standard, rules })` call over
   builders from `src/rules/`. There is no version constant to write: the stamp
   is derived.
2. Where the style is about a language, its tag is as specific as the convention
   requires and no more. There is no bare `de`, and no fallback from a region to
   a bare language.
3. Register it in `src/check.ts`'s `styles` and add a subpath export in
   `package.json`. Re-export it from `src/index.ts` too.
4. Fixtures in `test/fixtures.ts` that reach every one of its rules. This is not
   optional politeness: `test/hazards.test.ts` fails until they exist, because a
   rule no sample reaches is a rule every property in the suite is silent about.
   The three properties then run over them through `audit`.
5. A digest in `test/battery.test.ts`, cut from the tail of `pnpm battery`, and
   the input count in that file's header if it moved.
6. A `skills/typography-check/references/<primary-subtag>.md`, linked from
   `SKILL.md`, and the language named in the skill's frontmatter description.
   `test/skill.test.ts` derives all three from the registry and will fail until
   they exist, which is the intended order: the style first, then its documents.

**Check what the source declines to say, not only what it says.** `nl` is the
worked example. Dutch has no rule about which quotation marks to use, so the
style has none, and the citation that says there is no rule is the same one that
licenses `mixed-quotation-marks`. A style must not assert what its citation does
not fix, and the absence of a rule is sometimes the most citable thing about a
language. `en` is the same lesson from the other side: where the two authorities
diverge, the style either reports without repairing or has no rule, which is why
the serial comma is not in it.

**Expect the new language to break a test that was never checking anything.**
Adding `nl` exposed a skill test whose assertion passed for every style as long as
the description mentioned any one of three hardcoded languages. Anything in the
suite that names `fr`, `es`, `de-DE` and `de-CH` in a literal is a candidate: it
does not fail when a language is added, it just stops covering it. Derive from
`styles` instead.

Deriving is not enough on its own, and English is the case that showed it. The
skill test asks whether the frontmatter description names each shipped language,
and this package's own pitch was "non-English typography", so the day `en`
shipped that assertion would have gone green on a description that *declined* the
language. `test/skill.test.ts` checks its own matcher against fabricated
descriptions before pointing it at the real one, which is the general form: when
a test is about to start passing for a new reason, show it failing first. The
prediction held. `en` shipped, and the description had to be rewritten to name
English rather than disclaim it, in the one place a model reads before deciding
whether to invoke the tool at all.

## Changing a rule

[provenance.md](provenance.md) owns this and is worth reading first: it holds
the narrowings that look like needless complication in the code and were each
paid for with a corpus. The French guillemet rules are settled, and how they were
settled is the precedent to follow.

A style's stamp moves by itself when a rule moves, so there is no version to
bump; what a rule change still owes is a CHANGELOG entry, since the stamp is what
a consumer's stored text carries. See the derived-stamp section of
[design.md](design.md).

**A change that claims to change nothing has to be shown to.** The type checker
and the unit tests both pass for a rule that quietly matches one character less,
and the derived stamp cannot help: it hashes what each rule *declares*, so a
change to `src/prose.ts` or to a helper every builder calls moves behaviour and
moves no stamp. `test/battery.test.ts` carries a digest per style for that, and
when it fails it tells you only that something moved. The dump is how you find
out what:

```bash
git stash && pnpm battery > /tmp/before.txt && git stash pop
pnpm battery > /tmp/after.txt && diff /tmp/before.txt /tmp/after.txt
```

If the diff is the change you meant, re-cut the digest table from the tail of
`pnpm battery` and say in the commit message what moved and by how many lines.
That is what the committed gate baselines used to buy, at seven lines and no
network.

## Cutting a release

1. Update `CHANGELOG.md` with a `## <version>` heading. Not "Unreleased":
   `scripts/check-release-tag.mjs` refuses a release whose tag, `package.json`
   version and CHANGELOG heading do not all agree.
2. Bump `version` in `package.json`. Style stamps are derived and independent of
   it: nothing else has a number to move.
3. `pnpm check`, then commit and tag `v<version>`.
4. Push the tag, then **publish a GitHub Release** pointing at it. The Release is
   the trigger, not the tag, so pushing a tag is not on its own enough to
   publish: the Release is a second, deliberate step that a human takes after
   reading the tag.
5. CI publishes over npm trusted publishing. There is no `NPM_TOKEN` in this
   repository and there should never be one: the registry authenticates the
   workflow over OIDC and the tarball carries build provenance.

Anyone verifying the supply chain should start at `0.1.1`. `0.1.0` was published
by hand and cannot be given a provenance attestation retroactively.

## Conventions

- Strict TypeScript, ESM, small pure functions. Match the surrounding style.
- When you learn something durable, a measured property or a rule that had to be
  narrowed and why, write it into the comment above the rule, and into
  [provenance.md](provenance.md) if a reader of the style needs it too. Counts
  from one run and what you tried before it worked belong in the commit message.
