---
name: typography-check
description: Check or fix English, French, Spanish, German and Dutch orthotypography with the typocheck CLI - straight apostrophes that should be U+2019, no-break spaces before French punctuation, guillemets and their spacing, the paired Spanish opening marks ¿ and ¡, German quotation marks, Dutch apostrophes and mixed quotation systems, English elisions, decades and double hyphens. Use when validating or cleaning translated or generated strings, an English, French, Spanish, German or Dutch document, subtitle or UI copy, or when someone asks whether text follows Imprimerie nationale, RAE, Duden, Taalunie or Chicago convention. Not a speller, grammar checker or style guide, and it does not translate.
---

# Typography check

Run the checker. Do not hand-apply typographic rules from memory, and do not
write a regular expression to do this: the rules are cited to a standard, the
edge cases are the whole difficulty, and the tool already exists in this package.

## Invoke it

Installed as a dependency, the binary is next door:

```bash
npx typocheck check --style fr path/to/file.md
```

Installed as a plugin, the binary came out of the same tarball as this file:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" check --style fr path/to/file.md
```

With no project to install into and no plugin:

```bash
npx @shbernal/typography check --style fr path/to/file.md
```

Piping works, and is usually what you want for a paragraph out of a conversation
or a column of translated strings:

```bash
printf '%s' "$TEXT" | npx typocheck check --style es -
```

Verbs and flags:

| | |
|---|---|
| `check` | report only. Never touches a file. The default thing to do. |
| `fix --write` | apply the safe subset in place |
| `--style <name>` | required: `en`, `fr`, `es`, `de-DE`, `de-CH`, `nl`, or a style the project's config defines |
| `--json` | machine-readable findings |
| `--strict` | make warnings fail too |
| `styles` | list the styles, their standards and where each came from |
| `--no-config` | ignore the project's config and use the shipped styles |
| `--version` | the tool version and every style stamp |

Exit `0` clean, `1` findings, `2` misuse.

## Four things to get right

### 1. The findings are invisible. Never quote raw text back

A no-break space (U+00A0), a narrow no-break space (U+202F) and a regular space
render identically. So does a straight apostrophe next to a curly one at small
sizes. If you paste raw output into a message, you will show the user two
identical-looking strings and it will look completely fine.

The tool already escapes them: `<NBSP>`, `<NNBSP>`, `<THINSP>`, `<RSQUO>`,
`<LSQUO>`, `<LDQUO>`, `<RDQUO>`, `<BDQUO>`, `<LAQUO>`, `<RAQUO>`. **Quote the
tool's excerpt, not the source text.**

### 2. Some findings must not be fixed, and the report says which

Every finding is marked `fixable` or not. The unfixable ones are the interesting
half and they are unfixable for a reason, not an oversight.

The canonical case: a Spanish sentence ending in `?` with no opening `¿` is an
unambiguous defect, and inserting the `¿` means deciding where the interrogative
*clause* began. `Si vienes, ¿me avisas?` is correct, and no substitution could
have produced it. So report those to the user and ask. Never rewrite them
yourself, and never suggest a `sed` that does.

`mixed-no-break-space` is the other kind: the document uses U+00A0 in some
guillemets and U+202F in others. Both are admissible French and using both is
not, so the finding is real, but which one the document should settle on belongs
to whoever wrote it. Report the count and ask; do not harmonise on your own.

`mixed-quotation-marks` is the same kind with a sharper edge. Dutch has no
rule about which quotation marks to use and an explicit recommendation to pick
one system and keep to it, so the finding is about the document rather than about
any one mark. **Do not harmonise it yourself even if the user asks for a quick
substitution**: U+2019 is the closing single quotation mark *and* the apostrophe,
so converting `‘…’` to `“…”` retypes every apostrophe in the text. In the
Taalunie's own document that would be 393 of them.

### 3. `--write` is a separate decision from checking

Default to `check`. Rewriting somebody's file needs them to have asked for it.
`fix` without `--write` prints exactly what it would have done, so run that first
and show it.

**French no longer has the exception it used to have.** An early version of the
guillemet rules fired on every guillemet in 2.4 million characters of published
French, wanting U+202F where French publishers use U+00A0. They now accept either
no-break space and repair only spacing that is wrong under both readings, in
whichever width the document already uses. `fix --style fr` is safe on well-set
text. If a report you are reading carries a French stamp other than the current
one, check its guillemet findings before acting on them.

### 4. State the language; do not sniff it

The tool refuses to guess, and so should you. A French rule applied to Swiss
German produces confident nonsense: French requires a narrow no-break space
inside its guillemets and German forbids one, using the same two characters.

There is **no bare `de`**. Germany and Austria set `»Wort«`; Switzerland sets
`«Wort»`. If you do not know which, ask - the answer is usually in the document's
own metadata, the target locale of the project, or the user's first message.
`de-AT` follows `de-DE`, and the tool will not make that substitution for you on
purpose, so pass `de-DE`.

## Reading a report

```
draft.fr.md:12:34  fixable colon-spacing  Breaking space before a colon; French requires U+00A0
      "voici<NBSP>: ici"
      Imprimerie nationale, Lexique des règles typographiques (2002), "Ponctuation"
```

`file:line:column`, then `fixable` or the severity, then the rule id, then the
citation. When a user disputes a finding, the citation is the answer, and the
answer to "why did it not fix this one" is always that the repair needs
information a substitution does not have.

A count with no stamp beside it is not comparable to the next one, which is why
the footer stamps `typocheck 0.1.0 (fr@a8ada4df7c7c)`. The part after the `@` is
derived from the rules themselves, so two reports carrying it were checked by the
same rules and two carrying different ones were not. Keep the stamp when you
paste a report anywhere it will be read later. `typocheck --version` prints the
same two without needing a file to check.

**The style may not be the shipped one.** A project can define its own in a
`typography.config.mjs`, and one may take a shipped style's name, so `--style fr`
in a repo that has a config is that repo's French. The footer says so when it
happens - `(fr@<a stamp that is not the shipped one> via typography.config.mjs)` -
and `typocheck styles`
lists what the project actually offers. Do not treat a house style as a
misconfiguration to correct: it is the project's decision, and its rules carry
their own citations. `--no-config` gets the shipped rules if you need to compare
against them.

## Per-language detail

Read one only when the language is settled and the user asks *why* a rule exists
or disputes a finding:

- [references/en.md](references/en.md) - Chicago and New Hart's Rules
- [references/fr.md](references/fr.md) - Imprimerie nationale
- [references/es.md](references/es.md) - RAE
- [references/de.md](references/de.md) - Duden, both regions
- [references/nl.md](references/nl.md) - Nederlandse Taalunie

## What this is not

It does not translate, spell-check or judge grammar or style.

**English is the style with no standards body**, and it is narrower than the other
four rather than broader for it: it ships what Chicago and New Hart's Rules agree
on and rules on nothing they disagree about. The serial comma is therefore not in
it, and neither is the choice between an em dash and a spaced en dash. If a user
wants either enforced, that is a house style, and the package supports it the
honest way - compose a style with the rule in it and cite the house style - rather
than by widening `en`.
