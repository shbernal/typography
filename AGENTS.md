# AGENTS.md

Session-start briefing. `README.md` is for humans deciding whether to use this;
`docs/` is the detail. This file is the short form: what will bite you, and
where to read before you touch a rule.

## What this project is

Orthotypography rules for French, Spanish, German and Dutch, published as
`@shbernal/typography`. A pack is a list of rules from a standards body; each
rule cites its source. There is a library, a `typocheck` CLI, and a skill in
`skills/` that ships from this same repo.

**Pre-release, and single-maintainer.** No backwards-compatibility obligation
and no deference to prior architecture unless the maintainer asks for it.

## Environment

Node 24 for development (the sources run under type stripping); the published
package targets Node 22.

```powershell
pnpm check          # typecheck + lint + test. The done gate
pnpm build
pnpm battery        # every style over every fixture, as a diffable dump
```

`pnpm check` is the whole gate and needs no network. The nine corpora and the two
gate scripts that used to sit beside it are gone; `audit` replaced them, holding a
style to idempotence, conformance and non-interference. What the corpora
established before they left is in `docs/provenance.md`.

`test/fixtures.ts` is what they were replaced with, weighted at **machine text**
rather than prose because the input is a model's output. Two things follow.
A rule with no fixture that reaches it fails `test/hazards.test.ts`, since a
property over samples that touch nothing passes for anything. And **a change that
claims to change nothing has to be shown to**: `pnpm battery` on both trees and
diff, because the derived stamp hashes what a rule *declares* and cannot see a
change to `src/prose.ts` or to a shared helper.

## The rules that must not be broken

- **`check` is a superset of `fix`, and `normalize` is the fix set.** A rule
  whose repair needs information the pattern does not have gets a `find` and no
  `fix`. Do not "complete" a `detectRule` by guessing a repair.
- **A rule with no citation does not ship**, and **a pack must not assert what
  its citation does not fix.** When a standard admits two spellings, rule on what
  is wrong under both and preserve the rest.
- **Never write a rule twice.** `replaceRule` derives `find` and `fix` from one
  pattern. If you are writing a matcher and a rewriter separately plus a test to
  keep them equal, the test is a symptom.
- **Every fix must be idempotent, and an inserting rule has to match its own
  output**, or a backfill never converges and each pass looks like progress.
- **A pattern must have one way to match, and a pattern that starts with a space
  quantifier must be anchored to the start of the run.** This one has cost real
  time: an ambiguous French guillemet rule took 15 seconds on a padded
  3,000-space line, and three of the four packs then shipping had a version of it.
  `docs/development.md` works through it; `test/perf.test.ts` holds every pack
  to linear time, including the two `withWidth` derives.
- **Never paste an invisible character into a test or a doc.** U+0020, U+00A0,
  U+202F and U+2009 are indistinguishable in a source file, and a test using them
  literally passes while asserting the wrong thing. Use `NO_BREAK` and friends.
- **A report must never quote raw text.** Use `reveal` / `excerptAt`.
- **No em dashes (U+2014).** Enforced in lint and again in the test suite.
- **Zero runtime dependencies**, and **a pack must not import
  `translation-harness`.** `{ id, normalize }` is the whole contract, satisfied
  structurally, with no registration call in either direction.

## Pack ids are era stamps

`pack.id` is `<lang>@<version>` and the version lives in the pack module, not in
`package.json`. **It moves when a rule changes and never for a README fix.** A
corpus normalized under `fr@0.1.0` and one under `fr@0.2.0` are two typography
eras; every row is individually correct and nothing compares two rows, which is
how a corpus splits invisibly. Bumping a pack version is a CHANGELOG entry.

`fr`'s `withWidth` returns a derived pack whose id carries the width it imposes
(`fr@0.2.0+house-00A0`), for the same reason.

## Where to read before changing something

| Doing | Read |
|---|---|
| Changing a rule | [`docs/provenance.md`](docs/provenance.md) |
| Adding a language | [`docs/development.md`](docs/development.md) |
| Touching a pattern | [`docs/development.md`](docs/development.md), the linear-time section |
| Changing the protocol | [`docs/design.md`](docs/design.md) |
| Touching the French width logic | [`docs/api.md`](docs/api.md), then `withWidth` in `src/fr.ts` |
| Adding or changing a fixture | [`docs/development.md`](docs/development.md), the fixtures section |
| Cutting a release | [`docs/development.md`](docs/development.md) |

**The French guillemet rules are settled, and the way they were settled is the
precedent to follow.** At `fr@0.1.0` they fired on every guillemet in 2.4M
characters of correctly set French. The fix was not to pick the other width: the
citation does not fix one, so the rules were narrowed to the spacing that is
wrong under either reading. Two lessons that generalise, and neither is about
French:

- A pack must not assert what its citation does not fix.
- **A gate constrains a rule only where its corpus exercises it.** Narrowing
  those rules looked blocked by the French reproduction gate, which pinned
  `normalize` byte for byte. It was not: that corpus contained no guillemet the
  prior implementation had to re-space. Measure before concluding a gate forbids
  a change. The same reasoning was wrong the same way about global rule ids and
  the committed baselines, one refactor later.

**A zero is not automatically a result.** A rule reports nothing either because
the text was set correctly or because it contained nothing the rule could match,
and only the first is evidence. This outlived the corpora that produced it: give
`audit` samples that actually reach the rules, or its empty result says nothing.
It is asserted rather than remembered now, in the first test of
`test/hazards.test.ts`, and the same discipline applies to a property you add:
compose a style that fails it before believing the one that passes.

## Conventions

- Strict TypeScript, ESM, small pure functions. Match the surrounding style, and
  read `src/fr.ts` for the comment density expected: every narrowing says what it
  is protecting.
- `pnpm` for every command example, in docs and in CI. The one exception is
  `skills/typography-check/SKILL.md`, which uses `npx` because it runs on
  whatever machine the end user has.
- When you learn something durable, a measured property or a rule that had to be
  narrowed and why, write it into the comment above the rule, and into
  `docs/provenance.md` if a reader of the style needs it too. Counts from one run
  and what you tried before it worked belong in the commit message.
