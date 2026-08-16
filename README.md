# @shbernal/typography

[![CI](https://github.com/shbernal/typography/actions/workflows/ci.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@shbernal/typography)](https://www.npmjs.com/package/@shbernal/typography)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

Orthotypography for English, French, Spanish, German and Dutch, as data rather
than as advice.

```bash
pnpm add @shbernal/typography
pnpm dlx @shbernal/typography check --style fr README.fr.md
```

## Why this exists

Typography is full of rules that are invisible in a diff and wrong in print.
French wants a no-break space before `; : ! ?` and inside its guillemets.
Spanish wants a paired `¿` at the start of a question. Germany sets `»Wort«` and
Switzerland sets `«Wort»`. English wants U+2019 where a keyboard gives `'`, and
in front of a decade where a smart-quote pass gives U+2018. Get one wrong and
nobody on the team can see it, because U+00A0, U+202F and an ordinary space
render identically and `'` and `’` are a font away from each other.

Three things follow, and they are what this package is:

**Rules come from the body that decides them, and each one cites its source.**
Imprimerie nationale for French, RAE for Spanish, Duden for German, the
Nederlandse Taalunie for Dutch. A rule with no citation does not ship. English
has no such body, so `en` cites two manuals and ships only what both of them
say: the serial comma is a divergence and is therefore not in it.

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
French. [How that was found and fixed](docs/provenance.md) is the most useful
thing in this repo. Dutch is the same principle arrived at from the other side: its
standard declines to choose between two systems of quotation mark, so the pack
declines too, and reports only the documents that use both.

## What it is good for

**Checking documentation and content in CI.** `typocheck check --style fr --strict`
over your French or Spanish Markdown, exiting non-zero on findings. Every finding
carries a line, a column, the citation and an escaped excerpt, so a report is
readable and a reviewer can see the character.

**Normalizing a translation pipeline.** `pack.normalize` is the safe subset and
nothing else, and `{ id, normalize }` is the whole contract, so a host binds a
pack without either package importing the other. The `id` is an era stamp:
`fr@0.2.0`, moving only when a rule changes, so a corpus records which typography
it was set in. If you normalize field by field and the fields must agree with
each other, the French width section of [api.md](docs/api.md) is the part you
need.

**Giving a coding agent typography it cannot guess at.** A Claude Code skill
ships inside the package, so the skill and the binary it invokes cannot be
different versions. It teaches the four things `--help` does not, starting with
the fact that these findings are invisible and must be quoted escaped.

**Reading the rules.** A pack is a plain array of rules with summaries and
citations. `import { fr } from '@shbernal/typography/fr'` and print it.

## Six conventions, not one with a locale flag

| | English | French | Spanish | German (DE/AT) | German (CH) | Dutch |
|---|---|---|---|---|---|---|
| Quotation marks | curly, **no rule** on which pair | `« … »` | `«…»` | `»…«` | `«…»` | **no rule** |
| Space inside them | **no rule** | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden | n/a |
| Space before `; : ! ?` | forbidden | **required** | forbidden | forbidden | forbidden | forbidden |
| Opening marks | none | none | `¿` `¡`, **paired** | none | none | none |

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way and Switzerland points them back. So there is
one module per convention, and **there is no bare `de`**: a pack id gets stamped
onto a corpus, and a stamp that cannot tell a Swiss quotation from a German
mistake is worse than no stamp at all.

English is the newest column and the one with no standards body behind it. It
ships the intersection of Chicago and New Hart's Rules and rules on nothing they
disagree about, which is why the serial comma is absent and why the dash
convention is reported rather than repaired: Chicago closes an em dash up and
Oxford sets a spaced en dash, so a repair in either spelling would retype text
that is correct in the other. What is left is mostly one character. `it's`,
`'tis` and `'90s` all want U+2019, and a smart-quote pass gives the last two
U+2018 instead.

Dutch is the other interesting column, and the blank is not a gap. The Taalunie's
standard is a spelling standard and rules on neither spacing nor quotation marks,
and its advice service says outright that there are no fixed rules for choosing
between `‘…’` and `“…”` - and then recommends picking one and keeping to it. So
`nl` asserts no system and instead reports a document that uses more than one.
Its centre of gravity is the apostrophe, where Dutch is unusually demanding:
`auto's`, `'s morgens`, `A4'tje`, `'s-Gravenhage`.

## Status

`0.2.1`, and pre-1.0 is the accurate thing to say. The four original languages
have been run past real published text: 2.4M characters of French, 2.4M of
German, 1.1M of Spanish, 880k of Dutch, 699k of Swiss German. French
additionally reproduces the implementation it was extracted from byte for byte
over 11,058 real values.

**English has had none of that**, and it is the first style here to ship without
it. It was written against the fixtures and the properties rather than against a
corpus, which is what every style is held to now; what it has not had is a
measurement of how often its rules fire on text somebody already set correctly.
That is the measurement that took the French guillemet rules apart, so treat
`en`'s findings as the newest thing in the package.

Dutch is the newest and the thinnest: it was measured against one corpus, which
is also one of its two citations, and two of its rules met nothing they could
match. That is recorded in [docs/provenance.md](docs/provenance.md) rather than
smoothed over, along with what each number is worth and the narrowings the
measurements bought. Zero findings can mean the text was set correctly or that it
contained nothing the rule could match, and only the first is evidence.

## Documentation

| | |
|---|---|
| [docs/api.md](docs/api.md) | Library and CLI |
| [docs/design.md](docs/design.md) | Why the package is shaped this way |
| [docs/provenance.md](docs/provenance.md) | Where the defaults came from and what was measured |
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

MIT, in [LICENSE](LICENSE).
