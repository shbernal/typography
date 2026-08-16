# @shbernal/typography

[![CI](https://github.com/shbernal/typography/actions/workflows/ci.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/ci.yml)
[![Corpus links](https://github.com/shbernal/typography/actions/workflows/corpus-links.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/corpus-links.yml)
[![Corpus pins](https://github.com/shbernal/typography/actions/workflows/corpus-pins.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/corpus-pins.yml)
[![npm](https://img.shields.io/npm/v/@shbernal/typography)](https://www.npmjs.com/package/@shbernal/typography)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

Orthotypography for French, Spanish, German and Dutch, as data rather than as advice.

```bash
pnpm add @shbernal/typography
pnpm dlx @shbernal/typography check --lang fr README.fr.md
```

## Why this exists

Non-English typography is full of rules that are invisible in a diff and wrong
in print. French wants a no-break space before `; : ! ?` and inside its
guillemets. Spanish wants a paired `¿` at the start of a question. Germany sets
`»Wort«` and Switzerland sets `«Wort»`. Get one wrong and nobody on the team can
see it, because U+00A0, U+202F and an ordinary space render identically and `'`
and `’` are a font away from each other.

Three things follow, and they are what this package is:

**Rules come from the body that decides them, and each one cites its source.**
Imprimerie nationale for French, RAE for Spanish, Duden for German, the
Nederlandse Taalunie for Dutch. A rule with no citation does not ship. That is
the line between a national standard and a house style, and English gets no pack
for exactly that reason: the Oxford comma is not a standard.

**Checking and fixing are different rule sets.** A Spanish sentence ending in `?`
with no opening `¿` is unambiguously wrong and *not* safely fixable, because
inserting the mark means deciding where the clause began. So `check` reports
everything and `fix` applies only what is safe unattended. A finding that cannot
be fixed is the interesting kind: it means somebody has to decide, not that
nobody got round to it.

**The pack does not assert what its citation does not fix.** The `Lexique`
typesets its own guillemets with U+202F and specifies U+00A0 in its own table,
so the French pack rules on the spacing that is wrong under both readings and
keeps whichever width a document already uses. The first version did not, and it
"corrected" 6,462 guillemets in 2.4M characters of professionally typeset
French. [How that was found and fixed](docs/evidence.md) is the most useful thing
in this repo. Dutch is the same principle arrived at from the other side: its
standard declines to choose between two systems of quotation mark, so the pack
declines too, and reports only the documents that use both.

## What it is good for

**Checking documentation and content in CI.** `typocheck check --lang fr --strict`
over your French or Spanish Markdown, exiting non-zero on findings. Every finding
carries a line, a column, the citation and an escaped excerpt, so a report is
readable and a reviewer can see the character.

**Normalizing a translation pipeline.** `pack.normalize` is the safe subset and
nothing else, and `{ id, normalize }` is the whole contract, so a host binds a
pack without either package importing the other. The `id` is an era stamp:
`fr@0.2.0`, moving only when a rule changes, so a corpus records which typography
it was set in. If you normalize field by field and the fields must agree with
each other, [corpus-consistency.md](docs/corpus-consistency.md) is the part you
need.

**Giving a coding agent typography it cannot guess at.** A Claude Code skill
ships inside the package, so the skill and the binary it invokes cannot be
different versions. It teaches the four things `--help` does not, starting with
the fact that these findings are invisible and must be quoted escaped.

**Reading the rules.** A pack is a plain array of rules with summaries and
citations. `import { fr } from '@shbernal/typography/fr'` and print it.

## Five conventions, not one with a locale flag

| | French | Spanish | German (DE/AT) | German (CH) | Dutch |
|---|---|---|---|---|---|
| Quotation marks | `« … »` | `«…»` | `»…«` | `«…»` | **no rule** |
| Space inside them | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden | n/a |
| Space before `; : ! ?` | **required** | forbidden | forbidden | forbidden | forbidden |
| Opening marks | none | `¿` `¡`, **paired** | none | none | none |

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way and Switzerland points them back. So there is
one module per convention, and **there is no bare `de`**: a pack id gets stamped
onto a corpus, and a stamp that cannot tell a Swiss quotation from a German
mistake is worse than no stamp at all.

Dutch is the interesting column, and the blank is not a gap. The Taalunie's
standard is a spelling standard and rules on neither spacing nor quotation marks,
and its advice service says outright that there are no fixed rules for choosing
between `‘…’` and `“…”` - and then recommends picking one and keeping to it. So
`nl` asserts no system and instead reports a document that uses more than one.
Its centre of gravity is the apostrophe, where Dutch is unusually demanding:
`auto's`, `'s morgens`, `A4'tje`, `'s-Gravenhage`.

## Status

`0.2.0`, and pre-1.0 is the accurate thing to say. Every language has been run
past real published text: 2.4M characters of French, 2.4M of German, 1.1M of
Spanish, 880k of Dutch, 699k of Swiss German. French additionally reproduces the
implementation it was extracted from byte for byte over 11,058 real values.

Dutch is the newest and the thinnest: one corpus, which is also one of its two
citations, and two of its rules have no exposure in it at all. That is recorded
in [gates/README.md](gates/README.md) rather than smoothed over.

[docs/evidence.md](docs/evidence.md) has the table, what each number is worth,
and what is thin. Zero findings can mean the text was set correctly or that it
contained nothing the rule could match, so every gate report also counts how many
times each character actually occurred.

## Documentation

| | |
|---|---|
| [docs/api.md](docs/api.md) | Library and CLI |
| [docs/design.md](docs/design.md) | Why the package is shaped this way |
| [docs/corpus-consistency.md](docs/corpus-consistency.md) | Normalizing many values that must agree |
| [docs/evidence.md](docs/evidence.md) | What the numbers are worth |
| [docs/development.md](docs/development.md) | Changing a rule, adding a language, cutting a release |

## Contributing, and the report worth most

The single most useful issue this project can receive is a **false positive**:
text that was set correctly and that `typocheck` complained about anyway. Unit
tests measure whether a rule fires on text written to make it fire, which is
recall, which was never in doubt. Only prose somebody published without a thought
for this checker measures the failure mode these rules have, and that is the one
thing this repo cannot generate for itself.

- [Report a false positive](https://github.com/shbernal/typography/issues/new?template=false-positive.yml)
- [CONTRIBUTING.md](CONTRIBUTING.md), and the [security policy](SECURITY.md)
- [Changelog](CHANGELOG.md) and [code of conduct](CODE_OF_CONDUCT.md)

MIT, in [LICENSE](LICENSE). The license covers this repository; it does not cover
the gate corpora, which are third-party published works and are not
redistributed here.
