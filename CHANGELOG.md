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
- **`gates/`**, the release gates, and every language has been through one:
  - `fr` reproduces the implementation it was extracted from byte for byte over
    11,058 real values, 827 of which that implementation rewrites.
  - `de-DE` over 986,380 characters of published federal German: zero
    error-severity findings, 13 warnings, one of them a genuinely mismatched
    quotation pair.
  - `es` over 1,106,553 characters from Spain's official gazette, the data
    protection agency's FAQ and 300 FundeuRAE articles: **one**
    `es.unpaired-question` false positive, an English phrase quoted inside
    Spanish, against 332 correctly opened interrogatives. 162
    `es.straight-double-quote` warnings, 100 of them true positives in ordinary
    prose and 62 quoted UI labels, which is the same split German produced.
  - `de-CH` over 311,131 characters of the Swiss Federal Constitution and 37
    federal press releases: zero findings, over 38 Swiss guillemet pairs.
- **Corpora are rebuildable.** `gates/sources/*.urls` freezes the document URLs
  and `scripts/fetch-corpus.ts` turns them into text, so a gate is a number
  somebody else can check rather than one they have to believe. The text itself
  stays out of the repo.
- **Gate reports count exposure.** A rule that reports nothing has either met
  text that was set correctly or text that never contained anything it could
  match, and those are not the same result. Each corpus declares which characters
  it is there to expose the rules to, and the gate fails if it does not contain
  them.
- **`skills/typography-check/`**, shipping from this repo rather than from a
  skills repo, so there is no copy to keep honest against a source.

Not done: nothing is published yet, and `de-CH`'s quotation rules have an order
of magnitude less exposure than the other languages'. See `gates/README.md`,
which says so in the section about the weakest review rather than in a footnote.
