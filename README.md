# @shbernal/typography

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
| Space inside them | **required**, U+202F | forbidden | forbidden | forbidden |
| Space before `; : ! ?` | **required** | forbidden | forbidden | forbidden |
| Opening marks | none | `¿` `¡`, **paired** | none | none |

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

`0.1.0`, and pre-1.0 is the accurate thing to say. French reproduces a prior
implementation byte for byte over 11,058 real values. German has been reviewed
against a million characters of published federal text. **Spanish has not been
run past any real corpus yet** - see [gates/README.md](gates/README.md), which is
honest about what each language's evidence actually is.

## Development

```bash
pnpm check     # typecheck, lint, test
pnpm build
pnpm gates     # the release gates; needs corpora that are not in this repo
```

Node 24 for development (the sources run under type stripping); the published
package runs on Node 20.
