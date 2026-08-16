# French, per the Imprimerie nationale

Source: `Lexique des règles typographiques en usage à l'Imprimerie nationale`
(2002). Read this when a user disputes a finding or asks why a rule did not fix
something.

## The rules, and what each one is protecting

### `apostrophe` (fixable)

A straight apostrophe (U+0027) between two letters becomes U+2019.

**Both sides must be letters**, and that narrowing is the rule rather than an
implementation detail. It keeps the substitution off a quote character used as a
quote (`'cite'`), an apostrophe inside a preserved code token (`x['key']`), and
anything next to a digit or a bracket (`annee '90`).

Measured on a real 2,125-row corpus, the straight and curly forms split 711/974,
with 4 rows carrying both. That is what a corpus looks like when every row was
written in isolation and nothing ever compared two of them.

### `colon-spacing` (fixable), `punctuation-spacing` (fixable)

An existing breaking space before `:` becomes U+00A0. Before `;`, `!` or `?` it
becomes a no-break space too, in whichever width the document already uses.

The colon is the only one with a fixed width, because it is the only one where
nothing is in dispute: the Lexique specifies the word space and published French
uses it 2,458 times against no counter-example in the gate corpora.

**These convert and never insert.** Inserting before a colon would fire on every
`https://`, and nothing in a pattern can tell a French sentence from a code
literal or a product name. What a real corpus holds is the space already: 137
rows before a colon in the corpus above, so conversion covers the whole measured
defect.

### `guillemet-open-space`, `guillemet-close-space` (fixable)

A guillemet must have exactly one no-break space inside it. The rules fire on a
breaking space (U+0020 or U+2009), on more than one space, and on no space at
all, **inserting one where none exists**. They do *not* fire on a single U+00A0
or a single U+202F, and the repair is spelled in whichever of those two the
document already uses.

That last part is measured rather than chosen. The Lexique typesets its own
guillemets with the fine space U+202F while its p.149 table specifies `espace
mots insécable`, which is U+00A0; the fine space is what Swiss practice
prescribes. Over 2.4M characters of published French both publishers use U+00A0
exclusively. A rule asserting either width would retype correctly set French, so
this pack asserts consistency instead, which is what the citation supports.

Inserting is licensed only because guillemets are unambiguous: there is no other
construction to mistake them for, and a guillemet with no space inside it is
wrong however it got there.

### `mixed-no-break-space` (warning, not fixable)

The document uses U+00A0 in some of these positions and U+202F in others. Both
are admissible and using both is not. Not fixable because *which* one to settle
on is the author's call, and on a document near an even split the repair would
silently retype half of it.

### `missing-punctuation-space` (not fixable)

No space at all before `; : ! ?`, where French requires one. `Bonjour!` should be
`Bonjour !`.

**Real, common, and not repairable by substitution**, which makes it the French
half of this package's central asymmetry. `https://`, `C:\`, `!important`,
`?utf8=x`, `a ? b : c` and every port number are the same characters in
constructions that must not be touched. The pattern is conservative in both
directions (a letter before, whitespace or a closing mark after) and this is
still the rule most likely to fire on technical prose.

### `straight-double-quote` (warning, not fixable)

French quotation marks are the guillemets. A `"` is reported and never converted,
because the two ends are the same character: choosing between `«` and `»` means
tracking pairing across the whole value, and a value may legitimately carry one
half of a pair quoted from elsewhere. A `"` inside a code token must survive too.

## Answering the usual objections

- *"The space before the colon looks too wide."* It is U+00A0, full width, which
  is correct before a colon. `; ! ?` and the guillemets take whichever no-break
  space the rest of the document uses.
- *"My guillemets already had a no-break space and it left them alone."* Correct,
  and deliberate. Only a breaking space, a doubled space or a missing one is a
  defect under both readings of the standard.
- *"Nothing changed in my code block."* Correct. Rules 1 and 2 require letters or
  an existing space, and rule 3 only touches guillemets.
- *"It flagged `Bonjour!` but did not fix it."* It cannot. See above.
