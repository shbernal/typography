# Changelog

## Unreleased

First cut. Nothing published yet.

- **The packs.** `fr` (Imprimerie nationale), `es` (RAE), `de-DE` and `de-CH`
  (Duden), each rule cited to a section. There is no bare `de`: Germany and
  Austria set `»Wort«` and Switzerland sets `«Wort»`, so a `de` pack id stamped
  on a corpus could not say which convention it was set in.
- **`check` and `fix` as separate rule sets**, with `pack.normalize` being the
  fix set exactly. Seven French rules, five of them fixable; seven Spanish, three
  fixable; seven `de-DE`, four fixable; six `de-CH`, three fixable.
- **`typocheck`**, with `check`, `fix --write` and `langs`. Reads files or stdin.
  Requires `--lang` and does not detect. Stamps every report with the tool
  version and the pack id.
- **Zero runtime dependencies**, as a constraint rather than a coincidence.
- **`gates/`**, the release gates. French reproduces the implementation it was
  extracted from byte for byte over 11,058 real values, 827 of which that
  implementation rewrites. `de-DE` reviewed over 986,380 characters of published
  federal German: zero error-severity findings, 13 warnings, one of them a
  genuinely mismatched quotation pair.
- **`skills/typography-check/`**, shipping from this repo rather than from a
  skills repo, so there is no copy to keep honest against a source.

Not done, and stated rather than glossed: **`es` and `de-CH` have no findings
corpus.** Their rules have never been run past real published text. See
`gates/README.md`.
