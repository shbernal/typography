# Design

Three decisions shape everything else in this package: `check` is a superset of
`fix`, there is one module per convention rather than one engine with a locale
parameter, and a pack id is an era stamp. Each of them came from a finding
rather than from a preference.

## `check` is a superset of `fix`

A Spanish sentence ending in `?` with no opening `¿` is a real, unambiguous
defect. Detecting it is a regular expression and a backward scan. *Fixing* it
means deciding where the interrogative clause began, which is a parse, and a
parse that guesses wrong moves a mark into the middle of somebody's prose.

So every pack has two rule sets and the fixable one is smaller:

- **`check`** reports everything and touches nothing.
- **`fix`** applies only the rules that are safe unattended and idempotent.
- `pack.normalize` **is** the fix set, so a host that binds it cannot
  accidentally get the rest.

A finding that is not fixable is the interesting kind. It means a human or a
model has to decide, not that nobody got round to writing the repair. Do not
"complete" a check-only rule by guessing a repair.

## Three rule constructors

`src/pack.ts` exports three, and the third exists because a standard can admit
two spellings of one thing.

| Constructor | Use it when | Example |
|---|---|---|
| `replaceRule` | The defect and its repair both fall out of one pattern | `apostrophe` |
| `conformRule` | The standard admits two spellings and the defect is using neither | `guillemet-open-space` |
| `detectRule` | The repair needs information the pattern does not have | `unpaired-question` |

`replaceRule` derives `find` and `fix` from a single pattern, so the report and
the rewrite cannot disagree about what the rule matches. **Never write a rule
twice.** If you find yourself writing a matcher and a rewriter separately, plus a
test to keep them equal, stop: the test is a symptom.

`conformRule` is the one worth understanding, and the French guillemet is the
case that produced it. The `Lexique` typesets its own guillemets with the fine
space (U+202F) while its own table at p.149 specifies `espace mots insécable`
(U+00A0). A rule with a literal replacement has to pick one, and either pick
retypes text that was already correct in the other. So `conformRule` matches only
what is wrong under *both* readings and spells the repair the way the text
already spells it.

Two properties every fix must have:

- **Idempotent.** Otherwise a backfill never converges and each pass looks like
  progress. An inserting rule therefore has to match its own output: the French
  guillemet rules match zero *or more* spaces and rewrite the already-correct
  form to itself, and `find` filters out the matches that changed nothing.
- **`choose` must be stable under its own fix**, for `conformRule`. A `choose`
  that counts spellings breaks ties toward a fixed side, so applying the fix
  moves the count further toward the side already chosen rather than away from
  it.

`test/styles.test.ts` asserts both per rule and per style.

## One module per convention

This is the table that rules out a single engine with a locale parameter:

| | French | Spanish | German (DE/AT) | German (CH) |
|---|---|---|---|---|
| Quotation marks | `« … »` | `«…»` | `»…«` | `«…»` |
| Space inside them | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden |
| Space before `; : ! ?` | **required** | forbidden | forbidden | forbidden |
| Opening marks | none | `¿` `¡`, **paired** | none | none |

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way, and Switzerland points them back. A shared rule
with a region option would be a switch statement wearing a table's clothes.

So there is one module per convention, no shared engine, and **no bare `de`**.
A tag is as specific as the convention requires and no more: `fr` and `es` are
bare because at this level of detail those languages really are one convention;
German is two.

There is also no fallback from a region to a bare language. `de-AT` does not
silently resolve to `de-DE`, however plausible that is, because the whole cost of
getting it wrong is paid by a user who never learns a substitution happened. A
host that wants that substitution makes it in its own dispatch, where somebody
can see it.

## A pack id is an era stamp

`pack.id` is `<lang>@<version>`, and the version lives in the pack module, not
in `package.json`. It moves when a rule changes and never for a README fix.

The reason is what a stamp is for. A corpus normalized under `fr@0.1.0` had the
inside of every quotation retyped and one under `fr@0.2.0` did not, so the two
are genuinely different typography eras. Every row in either is individually
correct, and nothing compares two rows, which is how a corpus splits invisibly.
A stamp that cannot tell the two apart is worse than no stamp at all.

This is why the package version and the pack versions move independently, and
why `0.1.0` shipped French at `fr@0.2.0` and the other three packs at `@0.1.0`.
It is also why [`withWidth`](api.md) returns a style whose stamp carries the
width it imposes.

## A rule with no citation does not ship

That is the line between a national standard and a house style, and it is the
only thing keeping the packs from becoming a place where preferences collect.
English gets no pack for exactly this reason: the Oxford comma is not a standard.

The corollary, learned the expensive way: **a pack must not assert what its
citation does not fix.** At `fr@0.1.0` the guillemet rules rewrote the space
inside every guillemet to U+202F, and fired on 6,462 guillemets in 2.4M
characters of correctly typeset French. They were not finding a defect. They were
retyping the inside of every quotation. When a standard admits two spellings,
rule on what is wrong under both and preserve the rest: consistency within a
document is honestly assertable, and a house preference dressed as a national
standard is the thing this repo exists not to do.
