# Changelog

## 0.1.2

Additive. No pack version moves, no rule changes what it matches, and
`fr.normalize` is byte-for-byte what it was, so a corpus normalized under
`0.1.1` needs nothing done to it.

- **`surveyWidth` and `withWidth`, on `@shbernal/typography/fr`.** For a host
  normalizing many values that have to be consistent with each other, which
  `fr` alone could not give it. The pack decides the no-break-space width per
  value, and the value is whatever the caller passed: a whole file for
  `typocheck`, one field for a translation harness. Both are the right grain and
  they are not the same grain, so a registry normalized field by field could
  settle row 1 on U+00A0 and row 2 on U+202F, each correct alone, and split.
  `fr.mixed-no-break-space` is the right rule at the wrong scope: its survey
  runs within one value and never sees the second row.

  `surveyWidth(values)` folds the ballot across a corpus and returns the
  verdict, the minority width and the minority count. It is the same ballot
  rather than a second implementation of it: the tally is additive, so summing
  per-value tallies is exactly tallying the concatenation, which is what stops a
  host drifting from the pack the first time a rule changes. `withWidth(width)`
  returns a pack that spells every no-break space the same way. Reported by a
  consumer who had moved a translation pipeline onto this package (#3).

- **`withWidth` rebuilds the guillemet patterns rather than pinning `choose`,
  and had to.** The obvious implementation does nothing, silently. The shipped
  patterns carry `CORRECT_AFTER_OPEN` and `CORRECT_BEFORE_CLOSE`, whose entire
  job is to exclude *both* correct spellings, and that exclusion is the
  narrowing that took French from 6,817 false positives to 103. The rows that
  split a corpus are correct-in-the-other-width, so the shipped patterns never
  match them and `choose` is never consulted: measured on a two-row corpus, a
  pinned `choose` found 0 matches and rewrote nothing. So the derived pack takes
  each space run unconditionally, which is `fr@0.1.0` behaviour re-admitted on
  purpose and reachable only where a host has stated the width. Still linear,
  and `test/perf.test.ts` now measures the two derived packs alongside the four
  registry ones rather than taking that on trust.

- **A derived pack carries its own era stamp**, `fr@0.2.0+house-00A0` or
  `fr@0.2.0+house-202F`. A corpus normalized by it has had correct text retyped
  into the imposed width and one normalized by `fr` has not, which is two
  typography eras by exactly the argument separating `fr@0.1.0` from `fr@0.2.0`.
  A stamp reading `fr@0.2.0` on both would have said they were set the same way,
  which is the failure the stamp exists to prevent, reintroduced one layer up.

- **`fr.mixed-no-break-space` is not in a derived pack.** Its content is that
  choosing a width is the author's call, and calling `withWidth` is the author
  making it. It would also have been a lie in the report: it is check-only, so
  every finding carries `fixable: false`, while the derived pack's `normalize`
  repairs every position it detects. Nothing is lost, because the three conform
  rules cover the same three ballot positions exactly.

- **`docs/`**, and a `README.md` that is about why the package exists and what
  it is for rather than how it works. The design, the API, the evidence and the
  development notes moved into five pages; `AGENTS.md` keeps the invariants and
  points at them. The corpus-count check in `test/gates.test.ts` watches the new
  locations too: the claim moved, and a check still watching only the old ones
  would have gone quiet rather than gone red.

  `docs/` ships in the tarball, so the README's links resolve for somebody
  reading the package rather than the repository.

## 0.1.1

No change to the packs, the CLI or anything else inside the tarball: `0.1.1`
installs as `0.1.0` did. What changed is where the tarball comes from.

- **Releases publish from CI**, on a published GitHub Release, over npm trusted
  publishing. The registry authenticates the workflow over OIDC, so there is no
  token in the repository to leak or rotate, and the tarball carries build
  provenance that ties it to the run and the commit that produced it.
- **`0.1.0` has no provenance attestation, and cannot be given one.** It was
  published by hand, and npm only generates provenance from a CI provider it
  recognises. That is the whole reason this release exists: the first version
  published this way had to be published the other way, since a trusted publisher
  cannot be configured for a package the registry does not have yet. Anyone
  verifying the supply chain should start at `0.1.1`.

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
- **`typocheck`**, with `check`, `fix --write`, `langs` and `--version`. Reads
  files or stdin. Requires `--lang` and does not detect. Stamps every report with
  the tool version and the pack id. An argument starting with a dash that is not
  a flag it knows is a misuse and exits `2`; a bare `-` is still stdin. Without
  that, a typo in `--write` fell through to the file list and came back as
  "cannot read --wrote", so a mistyped flag read as a missing file and the
  rewrite silently did not happen.
- **Every pack runs in linear time**, asserted in `test/perf.test.ts` over long
  runs of each of the four spaces, unbroken tokens and very long URLs. This is
  filed as a feature because three rules did not have it. `fr.guillemet-open` and
  `fr.guillemet-close` were alternations over `ANY_SPACE*BREAKABLE ANY_SPACE*`,
  and since `BREAKABLE` is a subset of `ANY_SPACE` the engine could split a run of
  spaces at every position in it: 242 ms at 800 spaces, 1.5 s at 1,600, and 15 s
  for one padded 3,000-space line - an indented block or a wrapped table, not an
  attack. `es.guillemet-close-space`, `de-DE.guillemet-close-space` and
  `de-CH.guillemet-close-space` were quadratic for a plainer reason: `ANY_SPACE+»`
  re-enters at every character of a run. `es`'s token scan walked to the nearest
  whitespace once per `?`, which is quadratic in an unbroken token and is now
  capped at 128 characters either way. All eight corpora and the reproduction gate
  report identical results before and after, so this is a rewrite of how the rules
  are spelled and not of what they find.

  Worth recording separately: the German and Spanish instances were found by the
  scaling assertion in that test file, *after* the French one had been fixed and
  written up as French-only. The measurement caught what reading the diff did not.
- **Zero runtime dependencies**, as a constraint rather than a coincidence.
- **`gates/`**, the release gates, and every language has been through one:
  - `fr` reproduces the implementation it was extracted from byte for byte over
    11,058 real values, 827 of which that implementation rewrites, **and** has
    been run past 2,409,504 characters of published French from three OpenEdition
    journals and The Conversation France: 708 findings, 355 of them false and all
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
  differences, because its corpus never exercised the case. **So this release
  ships French at `fr@0.2.0` and the other three packs at `@0.1.0`**, which is
  what a pack version being independent of the package version looks like the
  first time it happens. There is no `0.2.0` section below to look for.
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
