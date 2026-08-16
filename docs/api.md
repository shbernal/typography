# API

## Library

```ts
import { fr } from '@shbernal/typography/fr';
import { check, unfixable } from '@shbernal/typography';

const findings = check(fr, text);          // everything
const remaining = unfixable(findings);     // the ones needing a decision
const cleaned = fr.normalize(text);        // only the safe subset
```

Subpath exports are `/en`, `/fr`, `/es`, `/de-DE`, `/de-CH` and `/nl`, so a
consumer takes one language and not six, plus `/rules` for the builders a style
is composed from. The root export carries the protocol, the composition layer,
the runner and the registry, and importing it pulls all six styles, which costs a
few kilobytes of regular expressions and no dependencies.

### The runner

| Export | What it does |
|---|---|
| `check(style, text)` | Every finding, ordered by position in the text rather than by rule |
| `fix(style, text)` | Exactly `style.normalize`, under a name that says what it does at a call site |
| `unfixable(findings)` | The findings `fix` would not resolve. The interesting half of a report |
| `styles` | Every style this package ships, in tag order |
| `styleFor(tag)` | The shipped style for a BCP 47 tag, or `undefined`. Exact and case-insensitive, with no region fallback |

### A style is a plain object

```ts
interface Style {
  readonly id: string;          // `fr@4ed7f1b2db8f`, the era stamp
  readonly name: string;        // `fr`, `acme-house`
  readonly stamp: string;       // derived from the rules, not declared
  readonly lang?: string;       // a BCP 47 tag, where the style is about a language
  readonly standard: string;    // "Imprimerie nationale", for a report header
  readonly rules: readonly Rule[];
  readonly normalize: (value: string) => string;   // the fix set. Idempotent
}
```

Nothing registers itself and nothing imports a framework. `{ id, normalize }` is
all a host needs, which is what lets
[`translation-harness`](https://github.com/shbernal/translation-harness) bind a
style through `job.normalize` with neither package importing the other.

### Composing one

A shipped style is a rule list with a name and nothing else, so anything this
package ships, you can build.

| Export | What it does |
|---|---|
| `compose({ name, lang?, standard, rules })` | A style from a rule list. Refuses a duplicate rule id, an empty list, and a name with an `@` in it |
| `derive(base, { name?, drop?, replace?, add? })` | A style from another style, changed |
| `stampOf(rules)` | The stamp a rule list would get |
| `audit(style, samples)` | The three properties, run over your own text |

```ts
import { compose, derive, audit } from '@shbernal/typography';
import { fr } from '@shbernal/typography/fr';
import { apostrophe, straightDoubleQuote } from '@shbernal/typography/rules';

const house = derive(fr, {
  name: 'acme-fr',
  standard: 'ACME house style v3',
  drop: ['missing-punctuation-space'],
});

house.id; // 'acme-fr@...', and the stamp moves the day a rule in it moves
```

`drop`, `replace` and `add` each assert something about the base: dropping an id
the base does not have throws, replacing one it does not have throws, and adding
one it already has throws. That is the point of three verbs rather than one
merge, because a config outlives the version of this package it was written
against and the failure it must not have is the quiet one. A style that needs a
rule somewhere other than the end re-declares the whole list with `compose`.

**The stamp is derived from the rules**, hashed over each rule's id, sentence,
citation, severity, pattern and parameters, in order. Two styles with the same
rules stamp the same however they are named, and any change to a rule moves it
without anybody deciding to. Carry it beside anything you normalized: a corpus
half-normalized under one style and half under another is individually correct in
every row and comparable in none.

`audit` is what a corpus gate used to do, for a rule set nobody reviewed. It
returns violations of three properties: **idempotence**, `normalize` settles;
**conformance**, `check` after `fix` reports nothing fixable; and
**non-interference**, no rule puts back what an earlier rule removed. Give it
text that reaches the rules, since an empty result over samples that touch
nothing is not evidence of anything.

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
each other. They are not on the root export, because they answer a question only
French has: the Lexique admits both U+00A0 and U+202F inside a guillemet, so `fr`
rules on the spacing that is wrong under either reading and repairs in the width
the value already uses. That decision is made per value, which is the right grain
for a document and the wrong grain for a registry of fields.

```ts
import { fr, surveyWidth, withWidth } from '@shbernal/typography/fr';

fr.normalize(`«${NO_BREAK}oui${NO_BREAK}»`); // unchanged
fr.normalize(`«${NARROW_NO_BREAK}non${NARROW_NO_BREAK}»`); // also unchanged
```

Both rows are correct and together they are a corpus that splits, because nothing
in `fr` compares two rows.

```ts
const survey = surveyWidth(rows.map((r) => r.fr));
survey.full; // positions spelled U+00A0
survey.narrow; // positions spelled U+202F
survey.verdict; // the width the corpus settles on
survey.minority; // the width it uses but did not settle on, or null
survey.minorityCount; // how many positions are in the minority width

if (survey.minority === null) return; // already consistent, do nothing
const house = withWidth(survey.verdict);
const settled = values.map((v) => house.normalize(v));
```

They are two functions rather than one because `surveyWidth` reports and
`withWidth` acts on the report, and harmonizing rewrites text that is correct:
`minorityCount` is the size of what you would be retyping. `withWidth` returns a
new style and leaves `fr` alone, so every other host keeps the per-value
behaviour. It throws on any width but those two, because U+2009 is the right
width and breaks lines.

Three things about the derived style that are not obvious, all of them explained
where they are implemented in [`src/fr.ts`](../src/fr.ts): the space before a
colon stays U+00A0 under either width, since that is the one position the
citation is explicit about; `mixed-no-break-space` is dropped, because reaching
this function is the author making the call that rule reserves for them; and the
stamp differs from `fr`'s and between the two widths, because a corpus with
correct text retyped into an imposed width is not the same era as one without.

## CLI

```
typocheck check --style <name> [--json] [--strict] <file...>
typocheck fix   --style <name> [--write]           <file...>
typocheck styles
```

`-` reads stdin. `--style` is required and there is no detection: a French rule
applied to Swiss German produces confident nonsense, and guessing wrong is worse
than asking.

`--style` takes a name rather than a language tag, because a style need not be
about a language. Every shipped style is named for its tag, so `--style fr` is
what `--lang fr` was through `0.2.1`; `--lang` and the `langs` verb are gone and
say what replaced them rather than reporting an unknown option.

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
typocheck fix --style fr --write - < draft.md > fixed.md
```

Exit codes: `0` clean, `1` findings (`--strict` counts warnings too), `2` misuse.
An argument starting with a dash that is not a flag it knows is a misuse, so a
mistyped `--write` fails rather than falling through to the file list.

```bash
pnpm dlx @shbernal/typography check --style fr docs/guide.fr.md
pnpm dlx @shbernal/typography fix --style es --write content/**/*.es.md
```

### Config

A config is a module named `typography.config.mjs` (or `.js`, or `.ts` on Node
22.18 and newer), in the working directory or an ancestor, default-exporting a
style or an array of them.

```js
// typography.config.mjs
import { derive, fr } from '@shbernal/typography';

export default derive(fr, {
  name: 'acme-fr',
  standard: 'ACME house style v3',
  drop: ['mixed-no-break-space'],
});
```

```bash
typocheck check --style acme-fr docs/guide.fr.md
# ...
# typocheck 0.3.0 (acme-fr@<derived> via typography.config.mjs): 2 findings ...
```

`typocheck styles` lists what is available and where each one came from.
`--config <path>` loads a module instead of searching for one, `--no-config`
ignores any config, and passing both is refused rather than resolved. Two config
files in one directory is an error rather than a precedence rule: which of them
won would depend on an ordering nobody reading the directory can see.

**It is a module and not JSON on purpose.** A declarative config able to say what
`/rules` can say needs a string-keyed registry of builders and a schema for each
builder's parameters, which is a second copy of the rule API that has to agree
with the first. A module has no second copy: the config calls the same `compose`,
`derive` and builders the shipped styles do. The cost is that the CLI executes
code from the working tree, which is why `--no-config` exists.

**A config style may take a shipped style's name.** A house French is still
French, and every script that says `--style fr` should keep working. The stamp is
derived from the rules and so cannot agree with the shipped one, and both the
stamp and the config's path are in the report header and in `--json`, which is
what makes the substitution visible rather than quiet. `typocheck styles` still
lists the style that was shadowed.

The library has no config concept at all: `check` takes a `Style`, and a host
embedding this package composes one in its own code. The config file exists
because a CLI cannot be handed an object.

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
