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

## Shared by both regions

### `de.apostrophe` (fixable)

Straight apostrophe between two letters becomes U+2019. `geht's`, `Ku'damm`.
Letters on both sides, for the same reasons as French: it keeps the rule off
quotes, code tokens and anything next to a digit.

### `de.space-before-punctuation` (not fixable)

German takes no space before `; : ! ?`. Reported rather than fixed, because
deleting the space corrupts `a ? b : c` in a code block. Over 986,380 characters
of published federal German this rule fired **zero** times, which is the number
that matters: it is silent on text somebody set properly.

### `de.straight-double-quote` (warning, not fixable)

The two ends are the same character, and German has two accepted pairs to choose
between even once you know which end it is. So it is reported.

Worth knowing what this actually caught in the German review: a genuinely
mismatched pair, `Metadaten („Labels")`, opening with U+201E and closing with a
straight quote, in edited federal text. It also fires on quoted code identifiers
like `"default"-Service-Account`, which is a house-style call rather than a
language one. That mix is why it is a warning.

## `de-DE` only

- **`de-DE.low-quote-space`** (fixable): no space after `„`. That character has
  exactly one job, so closing it up damages nothing.

  There is deliberately **no matching rule for the closing U+201C**. That
  character opens a quotation in English, and German technical prose quotes
  English constantly, so deleting the space before it would weld
  `sagte "hello"` together. The asymmetry is the rule, not a gap.

- **`de-DE.guillemet-open-space`, `de-DE.guillemet-close-space`** (fixable):
  `» Wort «` becomes `»Wort«`.

- **`de-DE.outward-guillemets`** (not fixable): `«Wort»` in a German document.
  The repair is mechanically obvious - swap both characters - and it is still not
  safe, because the text may be right and the *pack* wrong. A Swiss quotation
  inside a German document is a citation, not an error.

## `de-CH` only

- **`de-CH.guillemet-open-space`, `de-CH.guillemet-close-space`** (fixable):
  `« Wort »` becomes `«Wort»`. Same characters as French, closed up rather than
  spaced, which is the difference that makes running the wrong pack produce
  confident nonsense.

- **`de-CH.inward-guillemets`** (not fixable): `»Wort«` in a Swiss document, the
  exact inverse of the rule above and unfixable for the same reason.

Both regions' fix rules carry a guard so they never weld a word onto the other
region's quotation mark. Running `de-DE` over Swiss text reports and does not
rewrite, which is the behaviour to expect if a document turns out to be mixed.

## Note on evidence

`de-DE` was reviewed against 986,380 characters of published German source text:
zero error-severity findings, 13 warnings. **`de-CH` has no corpus.** Its rules
are the shared ones plus two guillemet rules, so the German review covers most of
it, and most of it is not a gate.
