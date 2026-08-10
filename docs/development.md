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
pnpm corpus         # rebuild the gate corpora from gates/sources/*.urls
pnpm gates:verify   # the release gates
```

The corpora are third-party text and are gitignored. `pnpm corpus` reconstructs
all eight corpora from the committed URL lists, so `pnpm gates:verify` needs a
network and nothing else. The French *reproduction* gate is the exception: it reads both
its corpora and the prior implementation it diffs against out of a private
consumer tree at `../translation-agents`, so off that machine it cannot run at
all.

## The invariants

These are the things that must not be broken. [design.md](design.md) has the
reasoning behind the first four.

- **`check` is a superset of `fix`, and `normalize` is the fix set.** A rule
  whose repair needs information the pattern does not have gets a `find` and no
  `fix`. Do not "complete" a `detectRule` by guessing a repair.
- **A rule with no citation does not ship.**
- **Never write a rule twice.** `replaceRule` derives `find` and `fix` from one
  pattern. If you are writing a matcher and a rewriter separately, plus a test to
  keep them equal, the test is a symptom.
- **Every fix must be idempotent, and an inserting rule has to match its own
  output.** `test/packs.test.ts` asserts this per rule and per pack.
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
- **A pack must not import `translation-harness`,** and there is no registration
  call in either direction. `{ id, normalize }` is the whole contract, satisfied
  structurally.

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

Rules in three of the four packs had one or the other, and the German and
Spanish ones were found only after the French one had been fixed and written up
as French-only. So: write the exception as a lookahead at the position where the
run starts, take the run once, and do not enumerate the defects as alternatives.
`src/fr.ts` works through it at the constant `CORRECT_AFTER_OPEN`, and
`test/perf.test.ts` holds every pack to linear time so a fourth instance fails
rather than ships.

`SECURITY.md` calls a pattern that behaves this way a vulnerability in this
package, which makes `test/perf.test.ts` the assertion behind that claim rather
than a benchmark.

## Adding a language

1. `src/<tag>.ts`, one module, no shared engine. Read `src/fr.ts` first for the
   comment density expected: every narrowing says what it is protecting.
2. A tag is as specific as the convention requires, and no more.
3. Register it in `src/check.ts`'s `packs` and add a subpath export in
   `package.json`.
4. A corpus in `gates/corpora.json` **before** the release, not after. A language
   whose rules have never met real published text has not been reviewed,
   whatever the unit tests say.

## Changing a rule

[`gates/README.md`](../gates/README.md) owns this and is worth reading first.
The French guillemet rules are settled, and [how they were settled](evidence.md)
is the precedent to follow.

Bumping a pack version is a CHANGELOG entry. The version lives in the pack
module and moves when a rule changes, never for a README fix; see the era stamp
section of [design.md](design.md).

## Cutting a release

1. Update `CHANGELOG.md` with a `## <version>` heading. Not "Unreleased":
   `scripts/check-release-tag.mjs` refuses a release whose tag, `package.json`
   version and CHANGELOG heading do not all agree.
2. Bump `version` in `package.json`. Pack versions are independent of it.
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
  narrowed and why, write it into the comment above the rule or into
  `gates/README.md`. Counts from one run and what you tried before it worked
  belong in the commit message.
