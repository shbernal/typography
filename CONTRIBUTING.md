# Contributing

Thanks for looking. This is a small library with a narrow subject, and most of
what follows is about the two ways a typography checker goes wrong.
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies, and its short version is that
disagreements here are about text and are settleable with a citation.

## Getting set up

Node 24 and pnpm. The sources run directly under Node's type stripping, which is
why relative imports keep their `.ts` extension.

```bash
pnpm install
pnpm check      # typecheck, lint, test. The done gate.
pnpm build
```

`pnpm check` is what CI runs, on Linux and Windows both. The Windows job is not
paranoia: this package's whole subject is invisible characters, and a repo that
normalised line endings differently on one platform is exactly where a U+00A0
assertion would start silently passing for the wrong reason.

## The three rules most likely to trip you

**A rule that can find something it cannot safely repair gets a `find` and no
`fix`.** `check` is a superset of `fix`, and `pack.normalize` is the fix set
exactly. The canonical case is `es.unpaired-question`: a Spanish sentence ending
in `?` with no `¿` is unambiguously wrong, and knowing that is not knowing where
the `¿` goes, because the mark opens the interrogative clause rather than the
sentence. `Si vienes, ¿me avisas?` is correct and no substitution produces it.
Do not complete a `detectRule` by guessing a repair.

**A rule that reads a run of spaces must be linear.** This is the one invariant
here that a careful reader will not spot by reading the rule, and three of the
four packs shipped a violation of it. A pattern with two ways to match the same
run of spaces backtracks through all of them, and a pattern starting with
`ANY_SPACE+` rescans the run once per character unless a `(?<!ANY_SPACE)` anchors
it to the run's start. In this package that is not academic: the French guillemet
rules took 15 seconds on a single 3,000-space line, which an indented block
produces by accident. `test/perf.test.ts` runs every pack over the shapes that
break a naive pattern, and `src/fr.ts` explains the fix at `CORRECT_AFTER_OPEN`.

**A rule with no citation does not ship.** Every rule names the section of the
Imprimerie nationale, the RAE or the Duden that decides it. That line is the only
thing keeping the packs from becoming a place where preferences collect. It is
also why there is no English pack: the Oxford comma is not a standard.

The rest of the invariants are in [AGENTS.md](AGENTS.md), which is written for
coding agents but is the accurate list either way.

## Adding or changing a rule

1. Write it with `replaceRule` or `detectRule` in `src/<tag>.ts`. Never write the
   matcher and the rewriter separately: they will disagree, and the test you add
   to keep them equal is a symptom rather than a fix.
2. Add the citation.
3. `pnpm check`. `test/packs.test.ts` will hold you to idempotence, to a fixable
   rule changing the text exactly when it reports a finding, and to a rule
   matching its own output.
4. Run the gates. **This is the part that is easy to skip and is the point.**

## The gates, and why a green test suite is not enough

Unit tests measure whether a rule fires on text written to make it fire. That is
recall, and recall was never in doubt. The failure these rules actually have is
firing on text that was set correctly, and the only way to measure it is to run
over prose somebody published without any thought for this checker.

```bash
node scripts/fetch-corpus.ts       # builds the corpora from frozen URL lists
node scripts/gate-findings.ts      # the triage
```

The corpora are third-party text and are not in this repo. The URL lists are, so
you can rebuild them and compare fingerprints. `gates/README.md` records what
each corpus is, what it exposes, and every finding class anyone has triaged.
A rule change that moves a count is a change to that file too.

**One gate you cannot run, and that is expected rather than a broken checkout.**
The findings gate above runs anywhere: every corpus rebuilds from a committed URL
list. The French *reproduction* gate does not, because it diffs the pack against
a prior implementation that lives in a private working tree and is not published,
so `gate-fr-reproduction.ts` will not start. Run what you can, say in the pull
request what you could not run, and a maintainer runs the rest. An unrun gate
stated plainly is fine; an unrun gate left unmentioned is not. `gates/README.md`
explains why that one is different in kind from an unrebuildable corpus.

If you add a language, it needs a corpus **before** the release, not after. A
language whose rules have never met real published text has not been reviewed,
whatever the unit tests say.

## Pack versions are era stamps

`pack.id` is `<lang>@<version>`, and the version lives in the pack module rather
than in `package.json`. It moves when a rule changes and never for a README fix,
because a corpus normalized under `fr@0.1.0` and one under `fr@0.2.0` are two
typography eras. Bumping one is a CHANGELOG entry.

## Style

Strict TypeScript, ESM, small pure functions, Biome for formatting. Match the
surrounding comment density: in `src/fr.ts` every narrowing says what it is
protecting, and that is the standard rather than an accident.

No em dashes (U+2014) anywhere in the repo. `scripts/check-no-emdash.ts` enforces
it in lint and again in the test suite. A module that must name the character
builds it with `String.fromCharCode(0x2014)`.

Never paste an invisible character into a test. U+0020, U+00A0 and U+202F look
identical in a source file, and a test using them literally passes while
asserting something else. Use the exported `NO_BREAK` and `NARROW_NO_BREAK`.

## Reporting a false positive

The most useful issue this project can get. Include the text, the language tag,
and where it was published. If it was published by somebody who sets type for a
living, it is evidence, and it may end up in a corpus.
