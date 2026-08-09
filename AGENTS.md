# AGENTS.md

Session-start briefing for AI coding agents. Human usage is in `README.md`. This
file is what you need before you touch anything.

## What this project is

Orthotypography rules for French, Spanish and German, published as
`@shbernal/typography`. A pack is a list of rules from a standards body; each rule
cites its source. There is a library, a `typocheck` CLI, and a skill in `skills/`
that ships from this same repo.

**Pre-release, and Santiago owns it.** No backwards-compatibility obligation and
no deference to prior architecture unless he asks for it.

## Environment

Node 24 for development: the sources run directly under Node's type stripping,
which is why `erasableSyntaxOnly` is on and why relative imports keep their `.ts`
extension. `rewriteRelativeImportExtensions` turns them into `.js` on the way into
`dist/`. The **published** package targets Node 20, and `scripts/smoke-dist.mjs`
in CI is what backs that claim.

```powershell
pnpm check          # typecheck + lint + test. The done gate.
pnpm build
pnpm gates:verify   # the release gates. Needs corpora not in this repo.
```

## The rules that must not be broken

- **`check` is a superset of `fix`, and `normalize` is the fix set.** If you add
  a rule whose repair needs information the pattern does not have, it gets a
  `find` and no `fix`. Do not "complete" a `detectRule` by guessing a repair.
  `es.unpaired-question` is the canonical case: knowing the `¿` is missing is not
  knowing where it goes.
- **A rule with no citation does not ship.** That is the line between a national
  standard and a house style, and it is the only thing keeping the packs from
  becoming a place where preferences collect. English gets no pack for exactly
  this reason: the Oxford comma is not a standard.
- **Never write a rule twice.** `replaceRule` derives `find` and `fix` from one
  pattern, so the report and the rewrite cannot disagree. If you find yourself
  writing a matcher and a rewriter separately, plus a test to keep them equal,
  stop: the test is a symptom.
- **Every fix must be idempotent, and an inserting rule has to match its own
  output.** Otherwise a backfill never converges and each pass looks like
  progress. `test/packs.test.ts` asserts this per rule and per pack.
- **Never paste an invisible character into a test.** U+0020, U+00A0 and U+202F
  are indistinguishable in a source file, and a test using them literally passes
  while asserting the wrong thing. Use `' '` and friends.
- **A report must never quote raw text.** Use `reveal` / `excerptAt`. A raw
  excerpt shows a reader two identical-looking strings and looks fine.
- **No em dashes (U+2014).** `scripts/check-no-emdash.ts` enforces it, in lint and
  again in the test suite. A module that must *name* the character builds it with
  `String.fromCharCode(0x2014)`.
- **Zero runtime dependencies.** Not an aspiration. It is what makes
  `npx @shbernal/typography` fetch one tarball rather than resolve a tree, which
  is what makes the public entry point tolerable and what the skill leans on. Dev
  dependencies are unconstrained.
- **A pack must not import `translation-harness`,** and there is no registration
  call in either direction. `{ id, normalize }` is the whole contract, satisfied
  structurally. `test/packs.test.ts` asserts it, since nothing else holds the two
  shapes together.

## Pack ids are era stamps

`pack.id` is `<lang>@<version>` and the version lives in the pack module, not in
`package.json`. **It moves when a rule changes and never for a README fix.** A
corpus normalized under `fr@0.1.0` and one under `fr@0.2.0` are two typography
eras; every row is individually correct and nothing compares two rows, which is
how a corpus splits invisibly. Bumping a pack version is a CHANGELOG entry.

## Adding a language

1. `src/<tag>.ts`, one module, no shared engine. Read `src/fr.ts` first for the
   comment density expected: every narrowing says what it is protecting.
2. A tag is as specific as the convention requires, and no more. `fr` is bare
   because French is one convention at this level of detail; German is two, so
   there is no `de`.
3. Register it in `src/check.ts`'s `packs` and add a subpath export.
4. A corpus in `gates/corpora.json` **before** the release, not after. A language
   whose rules have never met real published text has not been reviewed,
   whatever the unit tests say.

## The gates

`gates/README.md` owns this and is worth reading before touching a rule. In
short: French's gate is a byte-for-byte **reproduction** of the implementation it
was extracted from; German's and Spanish's are a **findings triage** over
professionally typeset text, because sloppy text measures recall (never in doubt)
while typeset text measures the false-positive rate (the actual failure mode).
Counts are committed, corpora are not, and every release after the first reviews
a delta.

## Conventions

- Strict TypeScript, ESM, small pure functions. Match the surrounding style.
- When you learn something durable - a measured property, a rule that had to be
  narrowed and why - write it into the comment above the rule or into
  `gates/README.md`. Counts from one run and what you tried before it worked
  belong in the commit message.
