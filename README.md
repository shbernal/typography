# @shbernal/typography

[![CI](https://github.com/shbernal/typography/actions/workflows/ci.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/ci.yml)
[![Corpus](https://github.com/shbernal/typography/actions/workflows/corpus.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/corpus.yml)
[![npm](https://img.shields.io/npm/v/@shbernal/typography)](https://www.npmjs.com/package/@shbernal/typography)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

Orthotypography for French, Spanish and German, as data rather than as advice.

Each language gets a pack of rules taken from the body that actually decides them
(Imprimerie nationale, RAE, Duden), and each rule cites its source. There are no
runtime dependencies, in either the library or the CLI.

```bash
npm install @shbernal/typography
npx @shbernal/typography check --lang fr README.fr.md
```

## `check` is a superset of `fix`, and that is the whole design

A Spanish sentence ending in `?` with no opening `¿` is a real, unambiguous
defect. Detecting it is a regular expression and a backward scan. *Fixing* it
means deciding where the interrogative clause began, which is a parse, and a
parse that guesses wrong moves a mark into the middle of somebody's prose.

So every pack has two rule sets and the fixable one is smaller:

- **`check`** reports everything and touches nothing.
- **`fix`** applies only the rules that are safe unattended and idempotent.
- `pack.normalize` **is** the fix set, so a host that binds it cannot accidentally
  get the rest.

A finding that is not fixable is the interesting kind. It means a human or a
model has to decide, not that nobody got round to writing the repair.

## The three languages do not share a rule

This is the table that rules out a single engine with a locale parameter:

| | French | Spanish | German (DE/AT) | German (CH) |
|---|---|---|---|---|
| Quotation marks | `« … »` | `«…»` | `»…«` | `«…»` |
| Space inside them | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden |
| Space before `; : ! ?` | **required** | forbidden | forbidden | forbidden |
| Opening marks | none | `¿` `¡`, **paired** | none | none |

French is the only cell with two answers in it, and that is a finding rather than
a hedge: the Imprimerie nationale sets its own guillemets with the fine space and
specifies the word space in its own table, so the pack rules on the spacing that
is wrong under both readings and keeps whichever width a document already uses.

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way, and Switzerland points them back. A shared rule
with a region option would be a switch statement wearing a table's clothes.

So there is one module per convention, and **there is no bare `de`**: `de-DE` and
`de-CH` are different packs, because a pack id is stamped onto a corpus and a
stamp that cannot tell a Swiss quotation from a German mistake is worse than no
stamp at all.

## Library

```ts
import { fr } from '@shbernal/typography/fr';
import { check, unfixable } from '@shbernal/typography';

const findings = check(fr, text);          // everything
const remaining = unfixable(findings);     // the ones needing a decision
const cleaned = fr.normalize(text);        // only the safe subset
```

Subpath exports are `/fr`, `/es`, `/de-DE` and `/de-CH`, so a consumer takes one
language and not four.

A pack is a plain object. Nothing registers itself, nothing imports a framework,
and `{ id, normalize }` is all a host needs, which is what lets
[`translation-harness`](https://github.com/shbernal/translation-harness) bind one
through `job.normalize` with neither package importing the other.

Every finding carries `line`, `column`, the citation, whether `fix` would repair
it, and an **escaped** excerpt. That last part is not a nicety: U+00A0, U+202F and
a plain space render identically, so a report that printed the raw text would
show a reader two identical-looking strings and look completely fine.

## CLI

```
typocheck check --lang <tag> [--json] [--strict] <file...>
typocheck fix   --lang <tag> [--write]           <file...>
typocheck langs
```

`-` reads stdin. `--lang` is required and there is no detection: a French rule
applied to Swiss German produces confident nonsense, and guessing wrong is worse
than asking.

`check` never writes. `fix` without `--write` prints exactly the report it would
have printed with it, so the dry run and the real run compute the same thing and
cannot disagree.

Exit codes: `0` clean, `1` findings (`--strict` counts warnings too), `2` misuse.

## As a Claude Code skill

`skills/typography-check/` ships inside the package, so `npm install` puts the
skill on disk next to the binary it invokes and the two cannot be different
versions.

As a plugin:

```
/plugin marketplace add shbernal/typography
/plugin install typography-check@shbernal-typography
```

The marketplace entry's source is the **npm package**, not this git repo, and
that is deliberate: `dist/` is not committed, so a git-sourced plugin would ship
the skill with no executable behind it. Installing the plugin and installing the
package fetch the same tarball.

The skill teaches four things `--help` does not: that the findings are invisible
and must be quoted escaped, that the unfixable ones are unfixable for a reason,
that `--write` is a separate decision from checking, and that the language is
stated rather than sniffed.

## Status

`0.1.0`, and pre-1.0 is the accurate thing to say. Every language has now been
run past real published text:

| | Evidence | Result |
|---|---|---|
| `fr` | 2,411,286 characters: three OpenEdition journals and The Conversation France | 729 findings, 355 of them false and all from one check-only rule |
| `de-DE` | 2,393,884 characters: the BSI IT-Grundschutz-Kompendium 2023 | zero error-severity findings, 128 warnings, 18 of them mismatched quotation pairs |
| `es` | 1,106,553 characters: Spain's official gazette, the data protection agency's FAQ, 300 FundéuRAE articles | one false positive, and it is an English phrase quoted inside Spanish |
| `de-CH` | 311,131 characters: the Swiss Federal Constitution and 37 federal press releases | zero findings, over 38 Swiss guillemet pairs |

**The French row used to be the bad one, and how it was fixed is the most useful
thing here.** At `fr@0.1.0` it read 7,188 findings with 6,817 false, because
`fr.guillemet-open` and `fr.guillemet-close` rewrote the space inside every
guillemet to U+202F and both publishers use U+00A0. The rules were not finding a
defect; they were retyping correctly set French. The citation turned out not to
settle the width, so `fr@0.2.0` rules only on what is wrong under either reading
and repairs in the width the document already uses. The same corpora now yield
103 guillemet findings, and each one is a breaking space, a doubled space or a
missing space. `fix --lang fr` is safe on well-set text.

The remaining 355 are one check-only rule, `fr.missing-space-before-high-punctuation`,
firing on English and Portuguese titles in bibliographies. It ships as a `find`
with no `fix` for exactly that reason.

French also has a second gate of a different kind: the pack reproduces the
implementation it was extracted from byte for byte over 11,058 string fields, 827
of which that implementation rewrites. That is an equivalence claim over
translation output rather than a false-positive measurement over published
French, and the difference is the point. The reproduction gate passed from the
first commit, never once surfaced the guillemet result above, and still passes
unchanged after the narrowing that fixed it: its corpus never exercised the case
that was wrong.

The Spanish number is the one that went right. `es.unpaired-question`, the rule
this package's whole shape was designed around, met 332 correctly opened
interrogatives and reported none of them.

[gates/README.md](gates/README.md) is honest about what each of those numbers is
worth, including where the evidence is thin. Zero findings can mean the text was
set correctly or that it contained nothing the rule could match, so every gate
report also counts how many times each character actually occurred.

## Development

```bash
pnpm check     # typecheck, lint, test
pnpm build
pnpm corpus    # rebuild the gate corpora from the frozen URL lists
pnpm gates     # the release gates
```

The corpora are third-party text and are not in this repo, but all eight corpora
are rebuildable: the frozen URL lists and the fetcher are committed, so anyone can
run `pnpm corpus` and compare fingerprints. A scheduled workflow rebuilds them
monthly, so the claim in the previous sentence fails loudly when a publisher moves
a document rather than quietly when a contributor tries. The French
*reproduction* baseline is the one thing that cannot be rebuilt, because it diffs
against a prior implementation in a private tree, and
[gates/README.md](gates/README.md) names it rather than averaging it away.

The rules run over whatever text a host hands them, so `test/perf.test.ts` holds
every pack to linear time over the shapes that break a naive pattern: long runs
of each of the four spaces, unbroken tokens, very long URLs. That file exists
because three rules did not pass it. A guillemet rule written as an alternation
over `ANY_SPACE*BREAKABLE ANY_SPACE*` can split a run of spaces at every position
in it, and one padded 3,000-space line took 15 seconds to check.

Node 24 for development (the sources run under type stripping); the published
package runs on Node 20.

## Contributing, and the report worth most

[CONTRIBUTING.md](CONTRIBUTING.md) has the setup and the three invariants most
likely to trip you. The single most useful issue this project can receive is a
**false positive**: text that was set correctly and that `typocheck` complained
about anyway. Unit tests measure whether a rule fires on text written to make it
fire, which is recall, which was never in doubt. Only prose somebody published
without a thought for this checker measures the failure mode these rules have,
and that is the one thing this repo cannot generate for itself.

- [Report a false positive](https://github.com/shbernal/typography/issues/new?template=false-positive.yml)
- [Security policy](SECURITY.md), including what the attack surface actually is
- [Changelog](CHANGELOG.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

MIT, in [LICENSE](LICENSE). The license covers this repository; it does not cover
the gate corpora, which are third-party published works and are not redistributed
here.
