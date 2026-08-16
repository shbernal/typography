# @shbernal/typography

[![CI](https://github.com/shbernal/typography/actions/workflows/ci.yml/badge.svg)](https://github.com/shbernal/typography/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@shbernal/typography)](https://www.npmjs.com/package/@shbernal/typography)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

Composable orthotypography rules, as data rather than as advice. Six styles
ship, for English, French, Spanish, German and Dutch, and you can compose your
own out of the same parts.

```bash
pnpm add @shbernal/typography
pnpm dlx @shbernal/typography check --style fr README.fr.md
```

## Why this exists

Text that comes back from a model is typographically arbitrary. Ask for the same
paragraph twice and one copy has `'` where the other has `’`, one puts a
no-break space before a colon and the other an ordinary one, and both read as
correct. Nobody sees it, because U+00A0, U+202F and a plain space render
identically and `'` and `’` are a font away from each other. What accumulates is
a body of text set a dozen different ways, where every row is defensible and no
two agree.

So the question here is not "did somebody set this correctly", which is a
question about a publisher. It is **"does the same content come back the same
way every time"**, which is a question about a pipeline. Three things follow, and
they are what this package is:

**Rules are the primitive; a style is a bundle of them with a name.** `fr` is a
rule list, and so is the style you compose yourself out of `compose`, `derive`
and the builders in `@shbernal/typography/rules`. There is no second mechanism
for the shipped ones and no plugin API to learn: a style need not even be about a
language. What you get from `fr` is somebody's homework on French, not a
privileged position in the code.

**Checking and fixing are different rule sets.** A Spanish sentence ending in `?`
with no opening `¿` is unambiguously wrong and *not* safely fixable, because
inserting the mark means deciding where the clause began. So `check` reports
everything and `fix` applies only what is safe unattended. A finding that cannot
be fixed is the interesting kind: it means somebody has to decide, not that
nobody got round to it.

**A style does not assert what its citation does not fix.** Every rule names
where it came from, which is what stops a bundle becoming a place where
preferences collect: Imprimerie nationale for French, RAE for Spanish, Duden for
German, the Nederlandse Taalunie for Dutch, and for English, which has no such
body, the two manuals `en` ships the agreement of. Where a source admits two
spellings, the rule covers what is wrong under both and preserves the rest. The
`Lexique` typesets its own guillemets with U+202F and specifies U+00A0 in its own
table, so `fr` keeps whichever width a document already uses; the first version
did not, and it "corrected" 6,462 guillemets in 2.4M characters of
professionally typeset French. [How that was found and
fixed](docs/provenance.md) is the most useful thing in this repo.

## What it is good for

**Checking documentation and content in CI.** `typocheck check --style fr --strict`
over your French or Spanish Markdown, exiting non-zero on findings. Every finding
carries a line, a column, the citation and an escaped excerpt, so a report is
readable and a reviewer can see the character.

**Normalizing generated or translated text.** `style.normalize` is the safe
subset and nothing else, and `{ id, normalize }` is the whole contract, so a host
binds a style without either package importing the other. The `id` is an era
stamp, `fr@4ed7f1b2db8f`, **derived from the rules themselves**: two bodies of
text carrying it were checked by the same rules, and the day a rule moves
the stamp moves without anybody remembering to bump it. Carry it beside anything
you normalized. If you normalize field by field and the fields must agree with
each other, the French width section of [api.md](docs/api.md) is the part you
need.

**Making a house style, and being able to say what it is.** `derive(fr, { drop:
[...] })` or a `compose` call in a `typography.config.mjs`, and `typocheck
--style acme-fr` is your rules with your citations. The stamp is derived, so a
house style cannot quietly claim to be the shipped one, and a config the CLI
loaded is named in the report footer.

**Giving a coding agent typography it cannot guess at.** A Claude Code skill
ships inside the package, so the skill and the binary it invokes cannot be
different versions. It teaches the four things `--help` does not, starting with
the fact that these findings are invisible and must be quoted escaped.

**Reading the rules.** A style is a plain array of rules with summaries and
citations. `import { fr } from '@shbernal/typography/fr'` and print it.

## Six conventions, not one with a locale flag

| | English | French | Spanish | German (DE/AT) | German (CH) | Dutch |
|---|---|---|---|---|---|---|
| Quotation marks | curly, **no rule** on which pair | `« … »` | `«…»` | `»…«` | `«…»` | **no rule** |
| Space inside them | **no rule** | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden | n/a |
| Space before `; : ! ?` | forbidden | **required** | forbidden | forbidden | forbidden | forbidden |
| Opening marks | none | none | `¿` `¡`, **paired** | none | none | none |

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way and Switzerland points them back. That is one
question with four answers rather than four questions, so it is one rule builder
taking what the correct spacing is, called once per style with its own citation;
the styles are rule lists over shared parts and there is no engine with a locale
switch in it. And **there is no bare `de`**: a style id gets stamped onto a body
of text, and a stamp that cannot tell a Swiss quotation from a German mistake is
worse than no stamp at all.

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

`0.2.1` is the published version and pre-1.0 is the accurate thing to say. **The
tree is ahead of it and the next release breaks every consumer**: styles are
composed, rule ids are global, stamps are derived, `--lang` is `--style`, and
`en` is new. [CHANGELOG.md](CHANGELOG.md) has the migration, one line per thing
that moved.

The four original languages have been run past real published text: 2.4M
characters of French, 2.4M of German, 1.1M of Spanish, 880k of Dutch, 699k of
Swiss German. Those corpora are gone from the repository along with the gates
that ran them, because the question they answered is not the one above; what
they established is in [docs/provenance.md](docs/provenance.md), and what
replaced them is `audit`, which holds a style to idempotence, conformance and
non-interference over text you supply.

**English has had none of that**, and it is the first style here to ship without
it. It was written against the fixtures and the properties rather than against a
corpus, which is what every style is held to now; what it has not had is a
measurement of how often its rules fire on text somebody already set correctly.
That is the measurement that took the French guillemet rules apart, so treat
`en`'s findings as the newest thing in the package.

Dutch is the thinnest of the measured ones: it saw one corpus, which is also one
of its two citations, and two of its rules met nothing they could match. That is
recorded in [docs/provenance.md](docs/provenance.md) rather than
smoothed over, along with what each number is worth and the narrowings the
measurements bought. Zero findings can mean the text was set correctly or that it
contained nothing the rule could match, and only the first is evidence.

## Documentation

| | |
|---|---|
| [docs/api.md](docs/api.md) | Library and CLI |
| [docs/design.md](docs/design.md) | Why the package is shaped this way |
| [docs/provenance.md](docs/provenance.md) | Where the defaults came from and what was measured |
| [docs/development.md](docs/development.md) | Changing a rule, adding a style, cutting a release |

## Contributing, and the report worth most

The single most useful issue this project can receive is a **false positive**:
text that was set correctly and that `typocheck` complained about anyway. Unit
tests measure whether a rule fires on text written to make it fire, which is
recall, which was never in doubt. Only prose somebody wrote without a thought for
this checker measures the failure mode these rules have, and that is the one
thing this repo cannot generate for itself.

The other report worth as much is a style that misbehaves in company: a `fix`
that does not settle, a `fix` that leaves behind something `check` still reports,
or two rules that undo each other. `audit` is exported so you can find those in a
style you composed, and a violation it reports in a shipped one is a bug here.

- [Report a false positive](https://github.com/shbernal/typography/issues/new?template=false-positive.yml)
- [CONTRIBUTING.md](CONTRIBUTING.md), and the [security policy](SECURITY.md)
- [Changelog](CHANGELOG.md) and [code of conduct](CODE_OF_CONDUCT.md)

MIT, in [LICENSE](LICENSE).
