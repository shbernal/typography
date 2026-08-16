# AGENTS.md

Session-start briefing. `README.md` is for humans deciding whether to use this;
`docs/` is the detail. This file is the short form: what will bite you, and
where to read before you touch a rule.

## What this project is

Composable orthotypography rules, published as `@shbernal/typography`. **A rule
is the primitive and a style is a rule list with a name**, built by `compose` out
of the parameterized builders in `src/rules/`; each rule cites where it came
from. Six styles ship, for English, French, Spanish, German and Dutch, and a user
composes their own the same way, with `compose`, `derive` and the builders on
`@shbernal/typography/rules`. There is a library, a `typocheck` CLI, and a skill
in `skills/` that ships from this same repo.

**The input is a model's output.** Generated or translated text, arriving set
however the model happened to set it, which is why the goal is uniformity rather
than conformance to a publisher's house rules: the question is whether the same
content comes back the same way twice. That is what replaced the corpora, and it
is why `audit` exists.

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

Git hooks are lefthook's, installed by `prepare` on `pnpm install` and declared
in `lefthook.yml`: charcheck and Biome over the staged content on `pre-commit`,
charcheck and the shared `no-ai-attribution` rule on `commit-msg`. They are a
fast pre-filter rather than the gate, they are skippable with `--no-verify`, and
`scripts/install-hooks.ts` steps around a `core.hooksPath` lefthook does not own
rather than failing the install, because `prepare` failing takes every `pnpm run`
down with it.

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
- **Every rule carries a citation**, as provenance rather than as permission, and
  **a style must not assert what its citation does not fix.** When a source
  admits two spellings, rule on what is wrong under both and preserve the rest.
  A divergence becomes a parameter with a default only where there is a *repair*
  for it to reach; where it reaches a report and nothing else, it is not a
  parameter, because a style that rewrites text identically must not carry a
  second stamp.
- **Never write a rule twice**, and more generally never write anything twice
  that then has to agree with itself. `replaceRule` derives `find` and `fix` from
  one pattern. If you are writing a matcher and a rewriter separately plus a test
  to keep them equal, the test is a symptom. This defect has been caught five
  times here; the config being a module and not JSON is the same argument.
- **A builder that cannot sign a parameter must not accept it.** The stamp hashes
  what a rule declares, so a parameter reaching the text through a closure is a
  distinction the stamp cannot see. `rules/spelling.ts` is the shape: data that
  carries its own behaviour, declared once.
- **Every fix must be idempotent, and an inserting rule has to match its own
  output**, or a backfill never converges and each pass looks like progress.
- **A pattern must have one way to match, and a pattern that starts with a space
  quantifier must be anchored to the start of the run.** This one has cost real
  time: an ambiguous French guillemet rule took 15 seconds on a padded
  3,000-space line, and three of the four rule sets then shipping had a version
  of it. `docs/development.md` works through it; `test/perf.test.ts` holds every
  style to linear time, including the two `withWidth` derives.
- **Never paste an invisible character into a test or a doc.** U+0020, U+00A0,
  U+202F and U+2009 are indistinguishable in a source file, and a test using them
  literally passes while asserting the wrong thing. Use `NO_BREAK` and friends.
- **A report must never quote raw text.** Use `reveal` / `excerptAt`.
- **No em dashes (U+2014).** That rule and the one above it are both
  `charcheck.config.ts` now, which is the only place either character list
  exists: `pnpm lint:chars`, the `pre-commit` and `commit-msg` hooks, and
  `test/chars.test.ts` all read it. A file that must *name* one of these
  characters writes the escape, as `src/pack.ts` does; a line that
  must carry one takes a `charcheck-disable-line` comment, which says so in the
  diff.
- **Zero runtime dependencies**, and **a style must not import
  `translation-harness`.** `{ id, normalize }` is the whole contract, satisfied
  structurally, with no registration call in either direction.
- **The library has no config concept.** `src/config.ts` is imported by
  `src/cli.ts` and by nothing else, and is not on the root export: `check` takes
  a `Style`, and a host composes one in its own code. A config file exists
  because a CLI cannot be handed an object, and it is a **module** rather than
  JSON because a schema able to say what `src/rules/` can say is a second copy of
  the builder API that has to agree with it. That is the same defect as a matcher
  and a rewriter written separately, and it has shown up three times here.

## Style ids are era stamps, and the stamp is derived

`style.id` is `<name>@<12 hex>` and **nothing declares the hex**: `compose`
hashes each rule's id, sentence, citation, severity, pattern and parameters, in
order. It moves when a rule changes and never for a README fix, without anybody
remembering. Two bodies of text normalized by different rule sets are two
typography eras; every row in either is individually correct and nothing compares
two rows, which is how a corpus splits invisibly. A rule change is still a
CHANGELOG entry, because the stamp is what a consumer's stored text carries.

Two things follow that will bite.

- **A hand-written version could not have survived composition.** There is
  nobody to bump a constant in a user's config, so a declared version would go
  quiet exactly where the text stops being reproducible. The same derivation
  removed three couplings that used to be maintained by hand: `de-DE` and `de-CH`
  share a rule list, so their stamps move together because the list moved.
- **The stamp cannot see anything a rule does not declare.** A change to
  `src/prose.ts`, to a runner in `pack.ts` or to a shared helper moves behaviour
  and moves no stamp. `test/battery.test.ts`'s digest table is the thing that
  catches that, and `pnpm battery` on both trees is how you find out what moved.

`fr`'s `withWidth` returns a derived style whose stamp differs from `fr`'s and
between the two widths, for the same reason. It is two `derive` verbs now, and
the width is in the pattern rather than in a closure so that the stamp can see
it.

## Where to read before changing something

| Doing | Read |
|---|---|
| Changing a rule | [`docs/provenance.md`](docs/provenance.md) |
| Adding a rule, or a style | [`docs/development.md`](docs/development.md) |
| Composing or deriving a style | [`docs/api.md`](docs/api.md), then [`docs/design.md`](docs/design.md) |
| Touching a pattern | [`docs/development.md`](docs/development.md), the linear-time section |
| Changing the protocol | [`docs/design.md`](docs/design.md) |
| Touching the CLI or the config | [`docs/api.md`](docs/api.md), the CLI and Config sections |
| Touching the French width logic | [`docs/api.md`](docs/api.md), then `withWidth` in `src/fr.ts` |
| Adding or changing a fixture | [`docs/development.md`](docs/development.md), the fixtures section |
| Cutting a release | [`docs/development.md`](docs/development.md) |

**The French guillemet rules are settled, and the way they were settled is the
precedent to follow.** At `fr@0.1.0` they fired on every guillemet in 2.4M
characters of correctly set French. The fix was not to pick the other width: the
citation does not fix one, so the rules were narrowed to the spacing that is
wrong under either reading. Three lessons that generalise, and none is about
French:

- A style must not assert what its citation does not fix.
- **A gate constrains a rule only where its corpus exercises it.** Narrowing
  those rules looked blocked by the French reproduction gate, which pinned
  `normalize` byte for byte. It was not: that corpus contained no guillemet the
  prior implementation had to re-space. Measure before concluding a gate forbids
  a change. The same reasoning was wrong the same way about global rule ids and
  the committed baselines, one refactor later.
- **A recorded decision carries its reason forward whether or not the reason is
  still true.** The cross-language guard `fr` now carries was held back because
  turning it on would split 2.4M characters of French corpus into a new era, and
  that argument was still being quoted in three files four commits after the
  corpora were deleted. A deletion has to go looking for the arguments that were
  resting on what it deleted.

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
