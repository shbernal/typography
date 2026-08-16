# Design

Four decisions shape everything else in this package: a rule is the primitive
and a style is a bundle of them, `check` is a superset of `fix`, a style's stamp
is derived from its rules rather than declared, and every rule says where it came
from. Each of them came from a finding rather than from a preference.

## A rule is the primitive

The input this package is for is a model's output: generated text, translated
text, anything handled non-deterministically. That text arrives set however the
model happened to set it, and the useful question about it is not "did somebody
set this correctly" but "does the same content come back the same way twice". The
first is a question about a publisher and the second is a question about a
pipeline, and only the second is answerable without knowing who wrote the text.

So the unit is a rule, and a style is a rule list with a name:

```ts
interface Style {
  readonly id: string;      // `fr@a8ada4df7c7c`
  readonly name: string;
  readonly stamp: string;
  readonly lang?: string;   // where the style is about a language, which is not required
  readonly standard: string;
  readonly rules: readonly Rule[];
  readonly normalize: (value: string) => string;
}
```

`compose({ name, lang?, standard, rules })` builds one, `derive(base, {...})`
builds one out of another, and the shipped six are `compose` calls over the
builders exported from `@shbernal/typography/rules`. There is no privileged path:
`fr` is a rule list somebody did the homework for, and a style you write is a
rule list you did the homework for. Nothing registers itself, so `{ id, normalize }`
remains the whole contract a host needs.

`derive` takes three verbs rather than one merge, and each asserts something
about the base: dropping an id the base does not have throws, replacing one it
does not have throws, adding one it already has throws. A config outlives the
version of the package it was written against, and the failure it must not have
is the quiet one.

### Which is not one engine with a locale flag

| | French | Spanish | German (DE/AT) | German (CH) |
|---|---|---|---|---|
| Quotation marks | `« … »` | `«…»` | `»…«` | `«…»` |
| Space inside them | **required**, U+00A0 or U+202F | forbidden | forbidden | forbidden |
| Space before `; : ! ?` | **required** | forbidden | forbidden | forbidden |
| Opening marks | none | `¿` `¡`, **paired** | none | none |

French and Spanish use the identical pair of characters with opposite spacing.
German points them the other way, and Switzerland points them back.

That is one question with four answers, and it is written once: `innerSpace`
takes *what the correct inner spacing is*, and the empty string, a no-break space
and "whichever no-break space this document already uses" are three settings of
one parameter. Six builders cover most of the rules in the package that way. What
a style contributes is which rules, with which parameters, under which citation,
and that is where the languages differ.

The rule ids are global for the same reason, which forces them to **name the
position rather than the verdict**: `punctuation-spacing` and not
`space-before-punctuation`, because French requires the space and three other
styles forbid it and it is the same question about the same position. An id
naming the verdict would have made two ids out of one rule and let a style
introduce a near-duplicate by spelling a name slightly differently.

There is still **no bare `de`**, and no fallback from a region to a bare
language. `de-AT` does not silently resolve to `de-DE`, however plausible that
is, because the whole cost of getting it wrong is paid by a user who never learns
a substitution happened. A host that wants that substitution makes it in its own
dispatch, where somebody can see it.

## `check` is a superset of `fix`

A Spanish sentence ending in `?` with no opening `¿` is a real, unambiguous
defect. Detecting it is a regular expression and a backward scan. *Fixing* it
means deciding where the interrogative clause began, which is a parse, and a
parse that guesses wrong moves a mark into the middle of somebody's prose.

So every style has two rule sets and the fixable one is smaller:

- **`check`** reports everything and touches nothing.
- **`fix`** applies only the rules that are safe unattended and idempotent.
- `style.normalize` **is** the fix set, so a host that binds it cannot
  accidentally get the rest.

A finding that is not fixable is the interesting kind. It means a human or a
model has to decide, not that nobody got round to writing the repair. Do not
"complete" a check-only rule by guessing a repair.

Uniformity is the goal and it does not reach everything, which is why the verb
survived the pivot: eleven of the nineteen rule ids have no `fix` in at least one
style, and each of them is check-only because the repair is a parse rather than a
substitution. Dropping `check` would mean dropping those rules or guessing at
their repairs.

## Three rule constructors

`src/pack.ts` exports three, and the third exists because a source can admit two
spellings of one thing.

| Constructor | Use it when | Example |
|---|---|---|
| `replaceRule` | The defect and its repair both fall out of one pattern | `apostrophe` |
| `conformRule` | The source admits two spellings and the defect is using neither | `guillemet-open-space` |
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

The two repairing constructors take a pattern and no predicate, deliberately.
Only `detectRule` can consult `looksMachine`, so a repair that first has to
decide whether it is looking at prose is not a substitution and does not get
written as one. That is what keeps English straight-to-curly quote conversion out
of `en`, and it is the same line as the paragraph above.

Two properties every fix must have:

- **Idempotent.** Otherwise a backfill never converges and each pass looks like
  progress. An inserting rule therefore has to match its own output: the French
  guillemet rules match zero *or more* spaces and rewrite the already-correct
  form to itself, and `find` filters out the matches that changed nothing.
- **The spelling must be stable under its own fix**, for `conformRule`. A ballot
  that counts spellings breaks ties toward a fixed side, so applying the fix
  moves the count further toward the side already chosen rather than away from
  it.

`test/styles.test.ts` asserts both per rule and per style.

## The stamp is derived, not declared

`style.id` is `<name>@<stamp>`, and the stamp is a hash over each rule's id,
sentence, citation, severity, pattern and parameters, in order. Two styles with
the same rules stamp the same however they are named, and any change to a rule
moves the stamp without anybody deciding to.

The reason is what a stamp is for. Text normalized by one rule set and text
normalized by another are two typography eras: every row in either is
individually correct, and nothing compares two rows, which is how a body of text
splits invisibly. A stamp that cannot tell the two apart is worse than no stamp
at all.

A hand-written version could not survive composition. A user's style is composed
in the user's code, and there is nobody to bump a constant in it; a stamp that
only shipped styles carried would go quiet at exactly the point the text stops
being reproducible. So it is derived, which also removes three couplings that
used to be maintained by hand: `de-DE` and `de-CH` share a rule list and their
stamps now move together because the list moved.

Two consequences worth knowing before touching a builder.

**A builder that cannot sign a parameter must not accept it.** `conformRule`
originally took a `choose` closure, and `fr` passed a ballot reader while
`fr.withWidth` passed `() => width`. Those two build character-for-character
identical patterns, because the width reached the text through the closure and
never through the pattern, so a derived stamp could not have told a corpus
normalized into U+00A0 from one normalized into U+202F. The fix is not to declare
the width twice, once to the closure and once to the stamp: `rules/spelling.ts`
makes it data that carries its own behaviour, so one declaration produces both.

**The stamp hashes what a rule declares and cannot see anything else.** An edit
to `src/prose.ts`, to a runner in `pack.ts` or to a helper every builder calls
changes what every style does to text and moves no stamp at all.
`test/battery.test.ts` carries a digest per style for exactly that, and
[development.md](development.md) has the diff procedure.

## A rule says where it came from

`cite` is provenance and not permission. It records where a default came from and
it shows in every report, so a user disputing a finding has something to read; it
does not decide whether a rule may exist, because a style need not be about a
national standard at all. A rule you write still carries one, even if it reads
"ACME house style v3". The discipline is writing down why.

Where a standards body does decide the question, the shipped default follows it:
Imprimerie nationale, RAE, Duden, the Nederlandse Taalunie. English has no such
body, which is why `en` cites two manuals and asserts only what both of them say.
The serial comma is the case everybody asks about: Chicago requires it and other
authorities forbid it, so it is a divergence, and shipping either answer would be
a preference wearing a citation. It is absent for that reason and not because
English lacks a standards body.

The corollary, learned the expensive way: **a style must not assert what its
citation does not fix.** At `fr@0.1.0` the guillemet rules rewrote the space
inside every guillemet to U+202F, and fired on 6,462 guillemets in 2.4M
characters of correctly typeset French. They were not finding a defect. They were
retyping the inside of every quotation. When a source admits two spellings, rule
on what is wrong under both and preserve the rest: consistency within a document
is honestly assertable, and a house preference dressed as a national standard is
the thing this repo exists not to do.

What a divergence becomes, when it is not simply left out, is a parameter with a
default: `withWidth` is that for the French no-break space. A parameter needs a
*repair* to attach to, though. Both English divergences reach a report and
nothing else, so `withDash` and `withPrimary` do not exist: a style differing from
`en` only in the wording of a summary would be a second era claiming a
distinction the rules do not make.

## The properties, which replaced a corpus

Nine corpora of published text used to run in CI and measure how often a rule
fired on text somebody had already set correctly. They are gone, with the
question they answered; [provenance.md](provenance.md) records what they
established and every narrowing in the code that one of them paid for.

`audit(style, samples)` is what runs in their place, and it is exported rather
than kept in `test/` because the promise is about *composed* styles. It holds a
style to three properties:

- **Idempotence.** `normalize(normalize(x)) === normalize(x)`.
- **Conformance.** `check` after `fix` reports nothing fixable. This is the
  actual product promise, and it is the one no corpus was ever asked for.
- **Non-interference.** No rule's fix reintroduces what an earlier rule removed.
  This is the real hazard of a user-composed set, and order is why: `derive`
  keeps a replaced rule in its original position, because the order of the list
  decides what `normalize` does.

A shipped style is held to these by this repo's test suite. A style a user
composed is held to them by nobody, which is the argument for exporting the
function rather than the fixtures.

**Give it text that reaches the rules.** A rule reports nothing either because
the text was set correctly or because it contained nothing the rule could match,
and only the first is evidence. An empty `audit` result over samples that touch
nothing is not a result at all.
