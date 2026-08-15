# API

## Library

```ts
import { fr } from '@shbernal/typography/fr';
import { check, unfixable } from '@shbernal/typography';

const findings = check(fr, text);          // everything
const remaining = unfixable(findings);     // the ones needing a decision
const cleaned = fr.normalize(text);        // only the safe subset
```

Subpath exports are `/fr`, `/es`, `/de-DE`, `/de-CH` and `/nl`, so a consumer
takes one language and not five. The root export carries the protocol, the runner
and the registry, and importing it pulls all five packs, which costs a few
kilobytes of regular expressions and no dependencies.

### The runner

| Export | What it does |
|---|---|
| `check(pack, text)` | Every finding, ordered by position in the text rather than by rule |
| `fix(pack, text)` | Exactly `pack.normalize`, under a name that says what it does at a call site |
| `unfixable(findings)` | The findings `fix` would not resolve. The interesting half of a report |
| `packs` | Every pack this package ships, in tag order |
| `packFor(tag)` | The pack for a BCP 47 tag, or `undefined`. Exact and case-insensitive, with no region fallback |

### A pack is a plain object

```ts
interface TypographyPack {
  readonly id: string;          // `fr@0.2.0`, the era stamp
  readonly lang: string;        // a BCP 47 tag
  readonly standard: string;    // "Imprimerie nationale", for a report header
  readonly rules: readonly Rule[];
  readonly normalize: (value: string) => string;   // the fix set. Idempotent
}
```

Nothing registers itself and nothing imports a framework. `{ id, normalize }` is
all a host needs, which is what lets
[`translation-harness`](https://github.com/shbernal/translation-harness) bind a
pack through `job.normalize` with neither package importing the other.

### A finding

Every finding carries `line`, `column`, the citation, the severity, whether
`fix` would repair it, and an **escaped** excerpt.

The escaping is not a nicety. U+00A0, U+202F, U+2009 and a plain space render
identically, and `'` and `’` are close enough in most fonts, so a report that
printed the raw text would show a reader two identical-looking strings and look
completely fine. `reveal` and `excerptAt` are exported for the same reason: they
are the helper a consumer otherwise rediscovers painfully.

```ts
import { NARROW_NO_BREAK, NO_BREAK, reveal } from '@shbernal/typography';

// A guillemet pair with a different no-break space at each end. Printed raw,
// the two ends look identical.
reveal(`«${NARROW_NO_BREAK}mot${NO_BREAK}»`);
// '"<LAQUO><NNBSP>mot<NBSP><RAQUO>"'

// The curved quotation marks are named too, which matters most in Dutch: the
// apostrophe and the opening single quote differ only by which way they curl.
reveal('‘nee’');
// '"<LSQUO>nee<RSQUO>"'
```

### French: corpus-wide width

`@shbernal/typography/fr` exports two more things, `surveyWidth` and
`withWidth`, for a host normalizing many values that must be consistent with
each other. They are not on the root export, because they are about a question
only French has. [corpus-consistency.md](corpus-consistency.md) is the whole
story.

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

`fix --write -` is a filter: the repaired text is the whole of stdout, byte for
byte and whether or not anything moved, and the report goes to stderr. Both
halves of that matter to a redirect. A filter that emitted nothing for text it
had nothing to say about would not pass it through, it would delete it; and a
report sharing stdout with the document would be appended to the document, which
under `--json` also means the JSON does not parse.

```bash
typocheck fix --lang fr --write - < draft.md > fixed.md
```

Exit codes: `0` clean, `1` findings (`--strict` counts warnings too), `2` misuse.
An argument starting with a dash that is not a flag it knows is a misuse, so a
mistyped `--write` fails rather than falling through to the file list.

```bash
pnpm dlx @shbernal/typography check --lang fr docs/guide.fr.md
pnpm dlx @shbernal/typography fix --lang es --write content/**/*.es.md
```

## As a Claude Code skill

`skills/typography-check/` ships inside the package, so installing the package
puts the skill on disk next to the binary it invokes and the two cannot be
different versions.

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
stated rather than sniffed. Its own commands use `npx` rather than `pnpm dlx`,
because it runs on whatever machine the user has and npm is the one package
runner that is always there.
