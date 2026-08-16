# German, per Duden

Source: Duden, `Die deutsche Rechtschreibung`, Richtlinien zur Rechtschreibung
und Zeichensetzung.

## There is no `de`, and that is deliberate

Germany and Austria open a quotation with `»` and close it with `«`. Switzerland
does the opposite: `«Wort»`. The same two characters, pointing opposite ways.

```
de-DE   »Wort«     „Wort“      (guillemets inward, or the low-high pair)
de-CH   «Wort»                 (guillemets outward, closed up)
```

So the tool has two packs and refuses a bare `de`. A pack id gets stamped onto a
corpus as the era it was set in, and a stamp that cannot tell a Swiss quotation
from a German mistake is worse than no stamp at all.

`de-AT` follows the German convention. The tool will **not** resolve `de-AT` to
`de-DE` for you: pass `de-DE` explicitly, so the substitution is visible to
whoever reads the command later.

This is also why the two regions below list the **same rule ids** under different
headings. A rule id names a position, not a character: `guillemet-open-space` is
the space inside whichever mark opens a quotation, which is `»` in Germany and
`«` in Switzerland. The id being equal is what makes the two reports comparable;
the *pack* is what says which mark it means. Read the stamp in the report footer
before reading a finding.

## Shared by both regions

### `apostrophe` (fixable)

Straight apostrophe between two letters becomes U+2019. `geht's`, `Ku'damm`.
Letters on both sides, for the same reasons as French: it keeps the rule off
quotes, code tokens and anything next to a digit.

### `punctuation-spacing` (not fixable)

German takes no space before `; : ! ?`. Reported rather than fixed, because
deleting the space corrupts `a ? b : c` in a code block. Over 2,393,884
characters of published federal German this rule fired **zero** times, which is
the number that matters: it is silent on text somebody set properly.

### `straight-double-quote` (warning, not fixable)

The two ends are the same character, and German has two accepted pairs to choose
between even once you know which end it is. So it is reported.

Worth knowing what this actually caught in the German review: a genuinely
mismatched pair, `Metadaten („Labels")`, opening with U+201E and closing with a
straight quote, in edited federal text. It also fires on quoted code identifiers
like `"default"-Service-Account`, which is a house-style call rather than a
language one. That mix is why it is a warning.

## `de-DE` only

- **`low-quote-open-space`** (fixable): no space after `„`. That character has
  exactly one job, so closing it up damages nothing.

  There is deliberately **no matching rule for the closing U+201C**. That
  character opens a quotation in English, and German technical prose quotes
  English constantly, so deleting the space before it would weld
  `sagte "hello"` together. The asymmetry is the rule, not a gap.

- **`guillemet-open-space`, `guillemet-close-space`** (fixable):
  `» Wort «` becomes `»Wort«`.

- **`guillemet-direction`** (not fixable): `«Wort»` in a German document.
  The repair is mechanically obvious - swap both characters - and it is still not
  safe, because the text may be right and the *pack* wrong. A Swiss quotation
  inside a German document is a citation, not an error.

## `de-CH` only

- **`guillemet-open-space`, `guillemet-close-space`** (fixable):
  `« Wort »` becomes `«Wort»`. Same characters as French, closed up rather than
  spaced, which is the difference that makes running the wrong pack produce
  confident nonsense.

- **`guillemet-direction`** (not fixable): `»Wort«` in a Swiss document, the
  exact inverse of the rule above and unfixable for the same reason.

Both regions' fix rules carry a guard so they never weld a word onto the other
region's quotation mark. Running `de-DE` over Swiss text reports and does not
rewrite, which is the behaviour to expect if a document turns out to be mixed.

## Note on evidence

`de-DE` was reviewed against 2,393,884 characters of the BSI
IT-Grundschutz-Kompendium 2023: zero error-severity findings, 128 warnings, 18 of
them quotation pairs opened with `„` and closed with a straight quote.

`de-CH` was reviewed against 698,683 characters, the Swiss Federal Constitution
and 153 federal press releases: eight findings, six of them real. The Constitution
contains no quotation marks and no apostrophes at all, so every `de-CH` quotation
rule rests on the press releases, which carry 198 Swiss guillemet pairs. The two
false ones are a French attachment title inside a German page, and a footnote
marker read as an opening guillemet.
