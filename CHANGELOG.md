# Changelog

## Unreleased

**The packs become composable styles.** A rule is the primitive now and a style
is a rule list with a name, built by `compose` out of the builders in
`@shbernal/typography/rules`, which is exactly how the shipped ones are built. A
user can compose one, name it, and it stamps and reports the way `fr` does.

This breaks every consumer, and the release number is not decided yet: the
heading says `Unreleased` on purpose, and `scripts/check-release-tag.mjs` refuses
to publish while it does.

**Why the project turned.** The input this package is for is a model's output.
The question a corpus of professionally typeset text answers is "does this rule
misfire on text somebody already set correctly", and the question that matters
for generated text is "does the same content come back the same way twice". The
first question was answered at high cost by nine corpora and is now recorded
rather than re-asked; the second is answered by `audit`, offline, over text the
caller supplies.

**No shipped style's behaviour moved.** For every one of the 8,799 generated
inputs in the battery and every written fixture, `normalize` returns the string
it returned at `0.2.1` and every rule's `find` reports the same offsets. Text
normalized under `0.2.1` does not need re-normalizing. What moved is the labels:
the ids of the rules and the stamps of the styles. A summary is documentation and
is not covered by that promise.

### The breaking changes

- **`TypographyPack` is `Style`**, `packs` is `styles`, `packFor` is `styleFor`.
  A style need not be about a language, so `lang` is optional and the registry
  lookup is still by tag.

- **A style id is `<name>@<12 hex>` and the hex is derived**, hashed over each
  rule's id, sentence, citation, severity, pattern and parameters. A hand-written
  version could not survive composition: there is nobody to bump a constant in a
  user's config, so a declared version would go quiet exactly where the text
  stops being reproducible. The same derivation removed three couplings that used
  to be maintained by hand, `de-DE` and `de-CH` most visibly, since they share a
  rule list and now stamp together because the list moved.

  These name the same rules as the versions they replace, and this table is the
  only place that mapping exists:

  | Was | Is |
  |---|---|
  | `fr@0.2.0` | `fr@a8ada4df7c7c` |
  | `es@0.2.0` | `es@8a1408a1e177` |
  | `de-DE@0.2.0` | `de-DE@69f15e8b27a9` |
  | `de-CH@0.2.0` | `de-CH@f4928d1e43d1` |
  | `nl@0.1.0` | `nl@54bd114c5488` |

- **Rule ids are global**, so a finding no longer carries a language prefix, and
  32 distinct ids became 19. A consumer filtering stored findings by id has to
  remap them. A global id has to **name the position rather than the verdict**,
  because French requires a space before `; ! ?` where the other five styles
  forbid one, and that is one question about one position:

  | Was | Is |
  |---|---|
  | `fr.` `de.` `nl.apostrophe` | `apostrophe` |
  | `es.` `de.` `nl.space-before-punctuation`, `fr.space-before-high-punctuation` | `punctuation-spacing` |
  | `fr.space-before-colon` | `colon-spacing` |
  | `fr.missing-space-before-high-punctuation` | `missing-punctuation-space` |
  | `fr.guillemet-open`, `es.` `de-DE.` `de-CH.guillemet-open-space` | `guillemet-open-space` |
  | `fr.guillemet-close`, `es.` `de-DE.` `de-CH.guillemet-close-space` | `guillemet-close-space` |
  | `de-DE.low-quote-space` | `low-quote-open-space` |
  | `de-DE.outward-guillemets`, `de-CH.inward-guillemets` | `guillemet-direction` |
  | everything else | the same id without its prefix |

- **`typocheck --style <name>` replaces `--lang <tag>`**, and the `langs` verb is
  `styles`. Both old spellings answer with the new one rather than falling in
  with the typos, so a script that says `--lang fr` gets a sentence that is true.
  Every shipped style is named for its tag, so `--style fr` is what `--lang fr`
  was.

- **`--json` renames one key and adds one.** `pack` is `style`, for the reason
  every other rename here happened, and `config` is new: the path of the config
  the style came from, and **null rather than absent** when none was loaded, so a
  consumer can tell "this run used the shipped rules" from "this output came from
  a tool that predates configs". A finding's own shape is untouched, and its
  `rule` field carries a global id.

`--strict`, the exit codes and `{ id, normalize }` are unchanged. A host that
binds a style through `job.normalize` needs to do nothing but re-record the
stamp.

### What is new

- **`compose`, `derive`, `stampOf` and `audit`** on the root export, and
  **`@shbernal/typography/rules`**, the builders the shipped styles are made of.
  `derive(base, { name?, drop?, replace?, add? })` is three verbs rather than one
  merge, and each asserts something about the base: dropping an id the base does
  not have throws, replacing one it does not have throws, adding one it already
  has throws. A config outlives the package version it was written against, and
  the failure it must not have is the quiet one.

- **`audit(style, samples)`**, exported rather than kept in `test/`, because the
  promise is about *composed* styles: a shipped style is held to these by this
  repo's suite and a user's style is held to them by nobody. It returns
  violations of three properties. **Idempotence**, `normalize` settles.
  **Conformance**, `check` after `fix` reports nothing fixable, which is the
  actual product promise and is the one no corpus was ever asked for.
  **Non-interference**, no rule's fix reintroduces what an earlier rule removed,
  which is the real hazard of a user-composed set.

- **A sixth style, `en`**, subpath `@shbernal/typography/en`. Six rules, three of
  them fixable, and it is the first style here with no standards body behind it:
  it cites *The Chicago Manual of Style* and *New Hart's Rules* together and
  asserts only what both of them say. Where they diverge the style reports
  without repairing or has no rule, which is why the serial comma is not in it
  and why the dash is named and not replaced. `en` had no corpus and will not get
  one; `docs/provenance.md` says which of its rules that exposes.

- **A config, for the CLI only.** `typography.config.mjs` (or `.js`, or `.ts` on
  Node 22.18 and newer), in the working directory or an ancestor, default
  exporting a style or an array of them. It is a module and not JSON because a
  schema able to say what `src/rules/` says is a second copy of the builder API
  that has to agree with it, which is the defect this repo keeps catching. A
  config style may take a shipped style's name and stand in for it: a house
  French is still French and every script already says `fr`. What keeps that
  visible rather than quiet is the derived stamp, which cannot agree with the
  shipped one, plus the config's path in the report footer and in `--json`.

  The library gets no config concept at all. `check` takes a `Style`, and
  `test/config.test.ts` walks every module in `src/` to hold that, because the
  way it breaks is somebody importing `findConfig` into a rule module.

### What left

- **The nine corpora, both corpus workflows, all four gate scripts and `gates/`
  itself**, 9.4M of fetched text off the disk. `pnpm check` is now the whole gate
  and needs no network. What the corpora established is distilled into
  **`docs/provenance.md`**: the sources each style's defaults come from, the five
  measured narrowings that look like needless complication in the code, why
  eleven of the nineteen rule ids have no `fix`, and what each corpus was.

- **The French reproduction gate**, which pinned `fr.normalize` byte for byte
  against the private implementation `fr` was extracted from. It could never run
  outside the maintainer's machine, and conformance is what replaces it.

- `docs/evidence.md` and `docs/corpus-consistency.md`. The evidence went into
  `provenance.md`; the second was not a corpus document at all but the
  `surveyWidth` / `withWidth` how-to, and it went into `docs/api.md`.

### What holds it now

- **`test/fixtures.ts`**, 52 written samples, weighted at **machine text** rather
  than prose, because a fenced block, a JSON payload and a Windows path arrive in
  the same value as the sentence. It replaced two overlapping hostile lists that
  were themselves the two-copies defect, sitting in the files whose job is to
  catch it.

- **`test/hazards.test.ts`**, which asserts that every rule in every style fires
  on at least one fixture, because a property over samples that reach nothing
  passes for any set of rules. It also holds the rules that rewrite machine text
  to a written-down list. That is a ratchet rather than an approval: every row is
  a defect with an entry beside it, the exposure cannot grow quietly while the
  decision waits, and the row disappears the day somebody fixes it.

- **`pnpm battery` and a digest per style in `test/battery.test.ts`**, over 8,799
  generated inputs. This is the one real gap a derived stamp leaves: the stamp
  hashes what a rule *declares*, so an edit to `src/prose.ts` or to a helper
  every builder calls changes what every style does to text and moves no stamp at
  all. The digest covers the generated inputs only, deliberately, so that adding
  a fixture never re-cuts a baseline and nobody learns to re-cut one without
  looking.

### The character rules become a config, and git hooks run them

- **`scripts/check-no-emdash.ts` is replaced by
  [charcheck](https://github.com/shbernal/charcheck) and
  `charcheck.config.ts`**, a dev dependency and a config rather than a scanner
  this repo maintained. `pnpm lint:text` becomes `pnpm lint:chars`, and
  `test/no-emdash.test.ts` becomes `test/chars.test.ts`, which loads the same
  config rather than restating the character list. The rules gain the surface a
  filesystem walk could not reach at all: the commit message.

- **The invisible-character rule is enforced rather than remembered.** It was a
  convention in three documents and nothing checked it. It found two test
  assertions carrying a literal U+202F, in `test/cli.test.ts` and
  `test/es.test.ts`, both of which now build the character from `NO_BREAK` and
  friends, and it is why `src/pack.ts` defines those constants as escapes. No
  rule and no style moved: `pnpm battery` is byte for byte what it was, which
  the digests in `test/battery.test.ts` assert independently.

- **Git hooks, in `lefthook.yml`.** charcheck and Biome over the staged content
  on `pre-commit`, charcheck and the shared `no-ai-attribution` rule from
  `shbernal/lefthook-rules` on `commit-msg`. `prepare` installs them through
  `scripts/install-hooks.ts`, which skips rather than fails where lefthook does
  not own the hooks directory, since a `prepare` that exits non-zero takes every
  `pnpm run` in the repo down with it. The hooks are a fast pre-filter, skippable
  with `--no-verify`; `pnpm check` and CI remain the gate.

### The skill

`skills/typography-check/` gains `references/en.md`, and its frontmatter names
English and Chicago. Two sentences that named pack versions in prose now name the
change instead, which is better documentation anyway: a reader holding a stamped
report could never have compared a hex to a semver without a table. The test that
checks every stamp the skill quotes is one a style currently carries fires more
often now, not less.

## 0.2.1

**`es.normalize` welded words together on a German quotation, and now does not.**
`es@0.2.0`. One pack version moves and no finding count does.

- **The defect.** `es.normalize('Er sagte »Wort« und ging.')` returned
  `'Er sagte»Wort«und ging.'`. `«` opens a quotation in Spanish, in French and in
  Switzerland, and closes one in Germany and Austria; `»` is the mirror. Both
  Spanish guillemet rules read the German marks as Spanish ones and deleted the
  spaces on the outside of the quotation, which are word boundaries.

- **The repair is the guard both German packs have always had.**
  `es.guillemet-open-space` now requires that the `«` it closes up is not
  preceded by a letter or a digit, and `es.guillemet-close-space` that the `»` is
  not followed by one. That is character for character `de-CH`'s pair, which is
  the point below.

- **`de-CH.ts` said this rule was "the same pattern and replacement as the
  Spanish rule". It was not.** It was the Spanish rule plus the guard, and the
  claim had been false for two pack versions. This is the second instance of one
  shape in two releases: `0.2.0` fixed `de.space-before-punctuation`, which cited
  `es.ts` for a `looksMachine` filter it did not have. **A comment asserting
  parity with another pack is an assertion nothing tests**, and both times the
  pack making the claim was the one in better shape, so the claim read as
  reassurance while the other rule carried the defect. The comment now records
  what happened rather than being quietly corrected.

- **The gate says the guard costs nothing, and this is the whole of what it
  says.** Re-cutting the three Spanish baselines over 1.1M characters changed one
  line in each file, `"pack": "es@0.1.0"` to `"es@0.2.0"`, and moved no count and
  no fingerprint. No Spanish corpus contains a German inward quotation, so the
  corpora cannot speak to the defect at all; what they establish is the other
  half, that the narrowing does not decline a guillemet Spanish publishers
  actually set. `test/es.test.ts` carries the defect itself, both halves of it
  separately, and three shapes the rule must still fix.

- **`fr` has the same hazard and is deliberately not fixed here.** On the same
  input `fr.normalize` returns `Er sagte<NNBSP>»Wort«<NNBSP>und ging.`: it reads
  the German closing `«` as an opening guillemet and rewrites the ordinary word
  spaces on the outside of the quotation into narrow no-break spaces. It welds
  nothing, because the French rules insert and convert where the Spanish ones
  delete, so the defect is a wrong space rather than a missing one. The guard is
  the same two lookarounds. It is held back because it would move `fr@0.2.0` to
  `fr@0.3.0` and split 2.4M characters of French corpus into a new era for a
  hazard no French corpus contains, which is a bigger decision than this release.
  `de-DE`, `de-CH` and `nl` are all correct on this input already.

- **Found by inventorying the rules for a refactor, not by a gate.** The corpora
  are drawn from one publisher's text per language, and a cross-language hazard
  is by construction not in any of them. It is the second thing in two releases
  that no corpus could have found, after the `looksMachine` filter, and the
  argument for the corpora as the primary evidence is weaker for it.

## 0.2.0

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
