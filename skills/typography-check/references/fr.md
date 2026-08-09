# French, per the Imprimerie nationale

Source: `Lexique des regles typographiques en usage a l'Imprimerie nationale`
(2002). Read this when a user disputes a finding or asks why a rule did not fix
something.

## The rules, and what each one is protecting

### `fr.apostrophe` (fixable)

A straight apostrophe (U+0027) between two letters becomes U+2019.

**Both sides must be letters**, and that narrowing is the rule rather than an
implementation detail. It keeps the substitution off a quote character used as a
quote (`'cite'`), an apostrophe inside a preserved code token (`x['key']`), and
anything next to a digit or a bracket (`annee '90`).

Measured on a real 2,125-row corpus, the straight and curly forms split 711/974,
with 4 rows carrying both. That is what a corpus looks like when every row was
written in isolation and nothing ever compared two of them.

### `fr.space-before-colon` (fixable), `fr.space-before-high-punctuation` (fixable)

An existing plain space before `:` becomes U+00A0. Before `;`, `!` or `?` it
becomes U+202F, the *narrow* one. Imprimerie nationale distinguishes the two and
Unicode encodes them separately, so using one for both is wrong in a way no
reader can see.

**These convert and never insert.** Inserting before a colon would fire on every
`https://`, and nothing in a pattern can tell a French sentence from a code
literal or a product name. What a real corpus holds is the space already: 137
rows before a colon in the corpus above, so conversion covers the whole measured
defect.

### `fr.guillemet-open`, `fr.guillemet-close` (fixable)

`«` is always followed and `»` always preceded by U+202F, **inserting one where
none exists**.

This is the one inserting rule in the French pack and it is licensed only because
guillemets are unambiguous: there is no other construction to mistake them for,
and a guillemet with no space inside it is wrong however it got there.

### `fr.missing-space-before-high-punctuation` (not fixable)

No space at all before `; : ! ?`, where French requires one. `Bonjour!` should be
`Bonjour !`.

**Real, common, and not repairable by substitution**, which makes it the French
half of this package's central asymmetry. `https://`, `C:\`, `!important`,
`?utf8=x`, `a ? b : c` and every port number are the same characters in
constructions that must not be touched. The pattern is conservative in both
directions (a letter before, whitespace or a closing mark after) and this is
still the rule most likely to fire on technical prose.

### `fr.straight-double-quote` (warning, not fixable)

French quotation marks are the guillemets. A `"` is reported and never converted,
because the two ends are the same character: choosing between `«` and `»` means
tracking pairing across the whole value, and a value may legitimately carry one
half of a pair quoted from elsewhere. A `"` inside a code token must survive too.

## Answering the usual objections

- *"The space before the colon looks too wide."* It is U+00A0, full width, which
  is correct before a colon. The narrow U+202F is for `; ! ?`.
- *"Nothing changed in my code block."* Correct. Rules 1 and 2 require letters or
  an existing space, and rule 3 only touches guillemets.
- *"It flagged `Bonjour!` but did not fix it."* It cannot. See above.
