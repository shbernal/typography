# Changelog

## 0.1.0

First cut.

- **The packs.** `fr` (Imprimerie nationale), `es` (RAE), `de-DE` and `de-CH`
  (Duden), each rule cited to a section. There is no bare `de`: Germany and
  Austria set `»Wort«` and Switzerland sets `«Wort»`, so a `de` pack id stamped
  on a corpus could not say which convention it was set in.
- **`check` and `fix` as separate rule sets**, with `pack.normalize` being the
  fix set exactly. Eight French rules, five of them fixable; seven Spanish, three
  fixable; seven `de-DE`, four fixable; six `de-CH`, three fixable.
- **Three rule constructors, because a standard can admit two spellings of one
  thing.** `replaceRule` finds and fixes from one pattern; `detectRule` reports
  what a substitution cannot safely repair; `conformRule` repairs to whichever
  admissible spelling the text already uses. The third exists because of the
  French guillemet result below: when the citation does not fix a width, a rule
  with a literal replacement has to invent one, and either invention retypes
  text that was already correct.
- **`typocheck`**, with `check`, `fix --write` and `langs`. Reads files or stdin.
  Requires `--lang` and does not detect. Stamps every report with the tool
  version and the pack id.
- **Zero runtime dependencies**, as a constraint rather than a coincidence.
- **`gates/`**, the release gates, and every language has been through one:
  - `fr` reproduces the implementation it was extracted from byte for byte over
    11,058 real values, 827 of which that implementation rewrites, **and** has
    been run past 2,411,286 characters of published French from three OpenEdition
    journals and The Conversation France: 729 findings, 355 of them false and all
    of those from one check-only rule firing on foreign-language titles in
    bibliographies.
  - `de-DE` over 2,393,884 characters of the BSI IT-Grundschutz-Kompendium 2023:
    zero error-severity findings, 128 warnings, 18 of them genuinely mismatched
    quotation pairs.
  - `es` over 1,106,553 characters from Spain's official gazette, the data
    protection agency's FAQ and 300 FundéuRAE articles: **one**
    `es.unpaired-question` false positive, an English phrase quoted inside
    Spanish, against 332 correctly opened interrogatives. 162
    `es.straight-double-quote` warnings, 100 of them true positives in ordinary
    prose and 62 quoted UI labels, which is the same split German produced.
  - `de-CH` over 311,131 characters of the Swiss Federal Constitution and 37
    federal press releases: zero findings, over 38 Swiss guillemet pairs.
- **All eight corpora are rebuildable.** `gates/sources/*.urls` freezes the
  document URLs and `scripts/fetch-corpus.ts` turns them into text, so every
  number in `gates/` is one somebody else can check rather than one they have to
  believe. The text itself stays out of the repo. This was seven of eight until
  the `de-DE` corpus stopped being a private registry extract of the BSI
  Kompendium and became BSI's own published DocBook XML, which is public,
  version-pinned, 2.4 times the size and six times the exposure on the German
  quotation rules. That removed the `--consumer` flag and the registry reader
  from `scripts/gate-findings.ts` altogether.
- **The French reproduction gate is filed as what it is**: a gate with no public
  referent, and now the only thing in `gates/` an outsider cannot run. It reads
  its corpora *and* the implementation it reproduces out of a private tree, so
  handing over the corpora would not help. It is quoted separately from the
  findings results everywhere in the repo for that reason.
- **The French guillemet rules do not assert a width the citation does not fix.**
  The first cut of `fr.guillemet-open` and `fr.guillemet-close` rewrote the space
  inside every guillemet to U+202F, which fired on 6,462 guillemets in 2.4M
  characters of correctly typeset French. The `Lexique` sets its own guillemets
  with the fine space and specifies the word space in its own p.149 table, so the
  rules were narrowed to the spacing that is wrong under either reading (a
  breaking space, a doubled space, no space) and now repair in whichever no-break
  space the document already uses. `fr.mixed-no-break-space` reports a document
  that uses both and does not repair it, because choosing is the author's call.
  The pack id moved to `fr@0.2.0`; the reproduction gate still reports 0
  differences, because its corpus never exercised the case.
- **Gate reports count exposure.** A rule that reports nothing has either met
  text that was set correctly or text that never contained anything it could
  match, and those are not the same result. Each corpus declares which characters
  it is there to expose the rules to, and the gate fails if it does not contain
  them.
- **`skills/typography-check/`**, shipping from this repo rather than from a
  skills repo, so there is no copy to keep honest against a source.

Not done, and stated rather than glossed: `de-CH`'s quotation rules have an order
of magnitude less exposure than the other languages', 38 guillemet pairs against
`de-DE`'s 1,063 curved quotes, so its zeros are weaker evidence than the other
zeros; `de-CH` has no rule for a German `„Wort“` appearing in Swiss text, though
it has one for the opposite direction; and the French reproduction baseline
cannot be rebuilt by anyone but the maintainer, since it diffs against an
implementation that is not published. See `gates/README.md`, which says each in
its own section rather than in a footnote.
