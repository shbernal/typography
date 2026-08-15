# Changelog

## Unreleased

**A fifth pack: `nl@0.1.0`, Dutch, per the Nederlandse Taalunie.** Subpath export
`@shbernal/typography/nl`. Seven rules, two of them fixable.

- **It has no rule about which quotation marks Dutch uses, and that is the
  point.** The Taalunie's Technische Handleiding is a spelling standard and rules
  on neither spacing nor quotation marks. Taaladvies.net, which covers both, says
  there are no fixed rules for choosing between `‘…’` and `“…”` and then
  recommends picking one system and keeping to it. So `nl` asserts no system and
  ships `nl.mixed-quotation-marks`, which reports a document using more than one.

  This is `fr.mixed-no-break-space` reached from the other direction, and it is
  the second instance of that shape, which is what makes it a pattern rather than
  a French one-off. French had to *infer* its consistency claim from a standard
  that specifies one width and typesets another; Dutch is told in a sentence.

- **There is no `withStyle`, and the reason is measured.** `src/index.ts` had said
  that if a second language ever admitted two spellings, that is when `withWidth`
  would be generalised. A second language now does, and only half of the shape
  travelled. Imposing one no-break space is a substitution; imposing one quotation
  system is not, because U+2019 is the closing single quotation mark *and* the
  apostrophe. In the Taalunie's own 427,000-character document there are 537 of
  them, of which 144 close a quotation and 393 are apostrophes, so a harmoniser
  would retype 393 apostrophes as closing double quotes.

- **`nl.apostrophe` also converts U+2018**, which no other pack does. Between two
  letters a left single quotation mark cannot be opening anything, so it can only
  be a smart-quote pass that turned the wrong way.

- **`nl.apostrophe-elision` is the rule no other language here needs.** Dutch
  elides at the *front* of a word - `'s morgens`, `'t huis`, `'s-Gravenhage` - and
  that is the one position where an apostrophe and an opening single quotation
  mark are the same character in the same place. It is safe to fix only because
  the elided words are a closed set and a space or hyphen has to close them:
  `'strand'` fails on the second test and is left alone.

- **The gate found the defect the design had split along.** Against 880,407
  characters of Taaladvies.net, `nl.apostrophe` reports **zero** and
  `nl.apostrophe-elision` reports **ten**, every one of them U+2018 where U+2019
  belongs and every one word-initial. Three of the five documents carry the
  correct form within a line of the wrong one. That is a smart-quote algorithm,
  which has a letter to look at mid-word and nothing to look at at the start of
  one - so the two rules turn out to divide along the seam of the actual defect,
  which was not designed in.

- **One corpus: `taaladvies-nl`**, 300 posts, 880,407 characters, one straight
  apostrophe in the lot. Newspapers were measured and rejected because NOS and
  VRT set quotations with straight marks; the official gazette because it holds
  two apostrophes in twenty thousand characters; DBNL because it is transcription.
  `nl.ij-capital` and `nl.apostrophe-after-symbol` have no exposure in it at all
  and are shipped unevidenced, which `gates/README.md` records rather than hides.

- **`reveal` now names the curved quotation marks**, `<LSQUO>`, `<LDQUO>`,
  `<RDQUO>` and `<BDQUO>`, alongside the spaces and `<RSQUO>` it already named.
  Dutch is what made this necessary and it was always wrong: an excerpt of
  `‘nee’` printed the closing mark as `<RSQUO>` and the opening one raw, so the
  one rule whose whole subject is telling two marks apart showed a reader only
  one of them. Report excerpts change; no finding count does. The French corpus
  samples move too, which is the same defect having been present all along.

- **A test that had never checked anything.** `test/skill.test.ts` asserted that
  the skill description names every language the tool ships, with an `||` clause
  that passed whenever the description mentioned any one of French, Spanish or
  German. Adding Dutch is what exposed it: `nl` shipped and the test stayed green.
  The language list, the reference files and the pack-id pattern are now all
  derived from the registry, so a sixth pack fails these before its docs exist.

Two pack versions move: **`de-DE@0.2.0`** and **`de-CH@0.2.0`**. A German corpus
checked under `@0.1.0` and one checked under `@0.2.0` were asked different
questions about the same text, so the counts are not comparable and the stamp
says so.

- **`de.space-before-punctuation` no longer reports machine text.** German takes
  no space before `; : ! ?`, and `https://ejemplo.de/a ?b=1` is not German
  taking one. Spanish has had that filter since it was written and German never
  did, while the German rule's own comment cited the Spanish file for the
  reasoning: on `Siehe https://beispiel.de/a ?b=1 und pfad/x : y hier.` Spanish
  reported nothing and German reported twice. The rule is character for
  character the Spanish one, so the two packs disagreed about a URL and about
  nothing else, and neither answer was defensible as a *German* decision, since
  no clause of the Duden says a query string is punctuated prose.

  Both German packs move because the rule is in `germanCommonRules`. Nothing
  Swiss changed and `de-CH` still moves, because what a stamp promises is that
  two corpora carrying it were checked by the same rules.

- **The heuristic is now one implementation, in `src/prose.ts`.** It was private
  to `es.ts`, which is how it came to exist in one pack and not the other. It is
  shared where `ANY_SPACE` is deliberately not: that constant encodes what a
  standard requires and can be split the day RAE and Duden disagree, whereas no
  standards body has an opinion about what a URL looks like, so there is nothing
  here for a release to have to split. Internal, like `de-common.ts`; no subpath
  export and no change to the public surface.

- **The release gate does not see this change, and that is the honest report.**
  `de.space-before-punctuation` scored zero on all three German corpora before
  it and zero after. The zero was a real one rather than a vacuous one - the
  Kompendium exposes 647 colons, the Constitution 637 semicolons - so what it
  said is that federal German publishers do not put a space before punctuation.
  The corpora do not contain the shape this change is about, and the evidence
  for it is the constructed case above.

  It has since stopped being zero, for a reason that has nothing to do with a
  URL. Deepening `admin-ch-medien-de-ch` from 36 press releases to 153 turned up
  one finding, `Résumé : Cinquième rapport`, which is a French attachment title
  sitting in an otherwise German page. French takes that space and German does
  not, and the rule cannot see that the sentence changed language, which is why
  it ships as `find` with no `fix`.

- **`de-CH` has four and a half times the evidence it had.**
  `admin-ch-medien-de-ch` went from 36 press releases to 153 and from 38 Swiss
  guillemet pairs to 198, which is a corpus change and not a rule change: no
  pack version moves for it and nothing was re-measured except by having more to
  measure. The zeros did not survive. Eight findings over 698,683 characters of
  federal Swiss German, six of them real, including French spacing inside Swiss
  guillemets in a single sentence that also sets a second quotation correctly,
  and a quotation opened with a straight `"` and closed with `»`.
  `gates/README.md` reads all eight.

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
