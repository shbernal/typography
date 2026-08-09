# Spanish, per the RAE

Source: `Ortografia de la lengua espanola` (Real Academia Espanola, 2010).

Spanish is where this package's shape came from. Read the first rule below before
answering any question about why the tool did not fix something.

## `es.unpaired-question`, `es.unpaired-exclamation` (not fixable)

A sentence ending in `?` with no `¿` earlier in it, or `!` with no `¡`.

RAE requires **both** halves. Omitting the opening one is the single most common
defect in Spanish written by speakers of languages that have no opening mark,
which is to say in most translated Spanish.

**Detecting it is trivial and fixing it is a parse.** The mark opens the
*interrogative clause*, not the sentence:

```
Si vienes, ¿me avisas?        correct
¿Si vienes, me avisas?        wrong, and what a naive fix would produce
```

Knowing the mark is missing tells you nothing about where it goes. Report it and
ask the user. Do not insert it, and do not offer a regular expression that does.

The scan stops at a sentence boundary, so `¿Vienes? Y tu hermano?` reports the
second question rather than letting the first one's `¿` excuse it. It skips
tokens that look like URLs, query strings or paths, because `?b=1` is the same
character doing a different job.

## `es.space-before-punctuation` (not fixable)

Spanish takes no space before `; : ! ?`. It is almost always a Frenchism carried
over by a translator.

**Deleting the space looks like the safest edit imaginable and is not.** In
technical Spanish, `a ? b : c` is a ternary and `1 : 2` is a ratio, and a fenced
code block carries both. Closing those up silently corrupts code that rendered
correctly. So it is reported, and a human decides.

## `es.guillemet-open-space`, `es.guillemet-close-space` (fixable)

Spanish sets `«texto»` **closed up**. `« hola »` becomes `«hola»`.

This is the exact mirror of the French rule, using the identical characters, and
it is why there is no shared rule with a locale option. Safe to fix for the same
reason French's insertion is safe: guillemets are unambiguous, so there is no
other construction to damage.

The quotation-mark order in Spanish is `«…»` first, then `"…"`, then `'…'` for a
quote inside a quote inside a quote.

## `es.opening-mark-space` (fixable)

`¿ Como estas?` becomes `¿Como estas?`.

Fixable where the closing half is not, and the difference is the whole argument:
the `¿` is already in the text, so its position is known and only the spacing is
wrong. Nothing has to be inferred.

## `es.straight-double-quote` (warning, not fixable)

Reported, never converted. The two ends are the same character.

## Note on evidence

As of `0.1.0` the Spanish rules have **not** been run past a real published
Spanish corpus - see `gates/README.md` in the package repo. The rules are cited
and unit-tested, and their false-positive rate on professionally typeset Spanish
is unmeasured. If a user reports a surprising Spanish finding, that is worth
capturing rather than dismissing.
