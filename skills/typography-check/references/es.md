# Spanish, per the RAE

Source: `Ortografía de la lengua española` (Real Academia Española, 2010).

Spanish is where this package's shape came from. Read the first rule below before
answering any question about why the tool did not fix something.

## `unpaired-question`, `unpaired-exclamation` (not fixable)

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

## `punctuation-spacing` (not fixable)

Spanish takes no space before `; : ! ?`. It is almost always a Frenchism carried
over by a translator.

**Deleting the space looks like the safest edit imaginable and is not.** In
technical Spanish, `a ? b : c` is a ternary and `1 : 2` is a ratio, and a fenced
code block carries both. Closing those up silently corrupts code that rendered
correctly. So it is reported, and a human decides.

## `guillemet-open-space`, `guillemet-close-space` (fixable)

Spanish sets `«texto»` **closed up**. `« hola »` becomes `«hola»`.

This is the French rule with the opposite answer, built from the same
`innerSpace` builder: what differs is the spacing the style requires, which is a
parameter and not a separate rule. It is safe to fix for the same reason
French's insertion is safe, and with the same guard, since guillemets are
unambiguous within a convention and not across them. `«` closes a quotation in
Germany, so both rules decline a mark with a letter or a digit immediately on its
outside and leave `Er sagte »Wort« und ging` alone. Without that guard the rule
deleted both spaces and welded two pairs of words together, which is what shipped
in `es@0.1.0`.

The quotation-mark order in Spanish is `«…»` first, then `"…"`, then `'…'` for a
quote inside a quote inside a quote.

## `opening-mark-space` (fixable)

`¿ Como estas?` becomes `¿Como estas?`.

Fixable where the closing half is not, and the difference is the whole argument:
the `¿` is already in the text, so its position is known and only the spacing is
wrong. Nothing has to be inferred.

## `straight-double-quote` (warning, not fixable)

Reported, never converted. The two ends are the same character.

## Note on evidence

The Spanish rules were measured against 1.1M characters of published Spanish
(the Boletín Oficial del Estado, the AEPD and FundéuRAE) and produced one false
positive: an English phrase quoted inside a Spanish sentence, where inserting the
`¿` the rule wants would have been actively wrong. That is why the two
unpaired-mark rules report and never repair. `docs/provenance.md` in the package
repo has the rest, and a surprising Spanish finding is still worth capturing
rather than dismissing.
