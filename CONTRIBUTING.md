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
`fix`.** `check` is a superset of `fix`, and `style.normalize` is the fix set
exactly. The canonical case is `unpaired-question`: a Spanish sentence ending
in `?` with no `¿` is unambiguously wrong, and knowing that is not knowing where
the `¿` goes, because the mark opens the interrogative clause rather than the
sentence. `Si vienes, ¿me avisas?` is correct and no substitution produces it.
Do not complete a `detectRule` by guessing a repair.

**A rule that reads a run of spaces must be linear.** This is the one invariant
here that a careful reader will not spot by reading the rule, and three of the
four rule sets then shipping had a violation of it. A pattern with two ways to match the same
run of spaces backtracks through all of them, and a pattern starting with
`ANY_SPACE+` rescans the run once per character unless a `(?<!ANY_SPACE)` anchors
it to the run's start. In this package that is not academic: the French guillemet
rules took 15 seconds on a single 3,000-space line, which an indented block
produces by accident. `test/perf.test.ts` runs every style over the shapes that
break a naive pattern, and `src/fr.ts` explains the fix at `CORRECT_AFTER_OPEN`.

**Every rule carries a citation.** It is provenance rather than permission: it
says where a default came from and it shows in the report, and it does not decide
whether a rule may exist, because a style need not be about a national standard
at all. What it does is keep a bundle from becoming a place where preferences
collect unattributed. The shipped defaults name the section of the Imprimerie
nationale, the RAE, the Duden or the Taalunie that decides them, and English,
which has no such body, cites two manuals and ships only what both of them say. A
rule you propose for a shipped style needs the same; a rule in your own style can
cite your own style guide, as long as it says so.

The rest of the invariants are in [AGENTS.md](AGENTS.md), which is written for
coding agents but is the accurate list either way.

## Adding or changing a rule

1. Write it in `src/rules/`, as a builder a style calls, with `replaceRule`,
   `conformRule` or `detectRule`. Look for the family first: most of the
   declarations in this package are six builders called with different
   parameters, and a rule that looks new is usually one of them with a different
   answer. Never write the matcher and the rewriter separately: they will
   disagree, and the test you add to keep them equal is a symptom rather than a
   fix.
2. Add the citation, in the style that calls the builder rather than in the
   builder. A shared pattern is the point; a shared citation would be a rule
   claiming an authority that never spoke.
3. Add the fixture that reaches it, in `test/fixtures.ts`. A rule no sample
   reaches is a rule every property below is silent about, and
   `test/hazards.test.ts` fails until one does.
4. `pnpm check`. `test/styles.test.ts` will hold you to idempotence, to a fixable
   rule changing the text exactly when it reports a finding, and to a rule
   matching its own output.
5. Run `audit`. **This is the part that is easy to skip and is the point.**
6. `pnpm battery` before and after, and diff, if you believed the change was a
   refactor. The digest in `test/battery.test.ts` will tell you that something
   moved; only the diff tells you what.

## `audit`, and why a green test suite is not enough

Unit tests measure whether a rule fires on text written to make it fire. That is
recall, and recall was never in doubt. What a rule set does wrong is misbehave in
company: a fix that does not settle, a fix that leaves behind something `check`
still reports, or two rules that undo each other. `audit` is the export that
holds a style to all three, and it is exported rather than kept in `test/`
because the promise is about composed styles, and a style a user composed is held
to it by nobody else.

Give it samples that actually reach the rules. An empty result over text that
touches nothing is not evidence of anything.

Nine corpora of published text used to run beside the test suite and measure the
false-positive rate instead. They are gone, with the question they answered;
[docs/provenance.md](docs/provenance.md) records what they established, and every
narrowing in the code that one of them paid for.

## A style's stamp is derived, and it is an era stamp

`style.id` is `<name>@<12 hex>`, and nothing declares the hex: `compose` hashes
each rule's id, sentence, citation, severity, pattern and parameters. It moves
when a rule changes and never for a README fix, and nobody has to remember. Two
bodies of text normalized by different rule sets are two typography eras, every
row in either is individually correct, and nothing compares two rows. So a rule
change is still a CHANGELOG entry even though there is no number to bump: the
stamp is what a consumer's stored text carries.

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

The most useful issue this project can get. Include the text, the style name, and
where the text came from. Text somebody set deliberately is the strongest kind,
because it measures the failure mode these rules have and unit tests cannot: a
test measures whether a rule fires on text written to make it fire.

A style that misbehaves in company is worth as much. If `audit` reports a
violation on a shipped style, that is a bug here, and the samples that produced
it are most of the report.
