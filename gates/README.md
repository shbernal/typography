# The release gates

Two gates, and they are **different in kind**. Conflating them is the mistake
this file exists to prevent.

| Gate | Language | Question | Script |
|---|---|---|---|
| Reproduction | `fr` | Does the pack produce byte-for-byte what the prior implementation produced? | `scripts/gate-fr-reproduction.ts` |
| Findings | `fr`, `de-DE`, `de-CH`, `es`, `nl` | Run over real published text, how many findings, and how many are false? | `scripts/gate-findings.ts` |

French has a prior implementation with output already in a corpus, so it can be
diffed against something that exists. German and Spanish have neither, so there
is nothing to diff and their gate is a triage: read every finding class, decide
true or false, record the counts.

French is now in **both**, and the reason is the whole argument for the second
kind. The reproduction gate asks whether the pack matches the implementation it
came from, over that implementation's own translation output. That is a question
about equivalence, and French passed it while nobody had yet asked the other
question: how often does the pack disagree with French somebody published? The
answer turned out to be 6,565 times over 2.4 million characters, and none of it
was visible from the reproduction gate. A gate that only compares you to your
predecessor cannot tell you that you both had the same opinion and it was wrong.

The sequel is worth the same amount. Narrowing the rules to fix that looked
blocked by the reproduction gate, which pins `normalize` byte for byte. It was
not blocked: the private corpus contains no guillemet the prior implementation
had to re-space, so the narrowed rules still reproduce it exactly. **A
reproduction gate constrains a rule only where its corpus exercises it**, and the
way to find out which is to measure rather than to reason from the gate's
existence.

```
node scripts/fetch-corpus.ts            # build the corpora from frozen URL lists
node scripts/gate-fr-reproduction.ts --verify
node scripts/gate-findings.ts --verify
```

The findings gate needs only a checkout and a network. It does not run in CI
because the corpora are several megabytes of somebody else's text, not because it
could not. The reproduction gate cannot run in CI at all, for the reason below.

## Every corpus is rebuildable

A gate you cannot re-run is worth less than one you can, so all nine corpora are
rebuilt from frozen URL lists by `node scripts/fetch-corpus.ts`. 263 of the 360
URLs are read from an archived capture rather than from the live page; see "Where
the bytes come from" for which, and for what a frozen URL does not freeze.

| Corpus | Language | Source |
|---|---|---|
| `openedition-journals-fr` | `fr` | 39 articles from three OpenEdition journals |
| `theconversation-fr` | `fr` | 43 articles from The Conversation France |
| `bsi-kompendium-2023-de` | `de-DE` | the BSI IT-Grundschutz-Kompendium 2023, DocBook XML |
| `boe-lopdgdd-2018-es` | `es` | Ley Orgánica 3/2018 from the Boletín Oficial del Estado |
| `aepd-faq-es` | `es` | the Spanish data protection agency's FAQ |
| `fundeu-rae-es` | `es` | 300 FundéuRAE articles |
| `fedlex-bv-2024-de-ch` | `de-CH` | the Swiss Federal Constitution, consolidated 2024 |
| `admin-ch-medien-de-ch` | `de-CH` | 153 Swiss federal press releases |
| `taaladvies-nl` | `nl` | 300 Taaladvies.net advice articles |

This was seven of eight until the `de-DE` corpus changed. It had been a
`registry.sqlite3` extract of the Kompendium in a private consumer tree, on the
premise that the BSI shipped the Kompendium as a document set no URL list could
freeze. That premise was wrong: BSI publishes the whole edition as one DocBook
XML file at a version-pinned URL, which is the publisher's own structured source
and therefore better evidence than the extract as well as public. Swapping it in
retired the `--consumer` flag and the registry reader from
`scripts/gate-findings.ts` entirely, and quadrupled the German corpus on the way
past. See "`de-DE`, reviewed 2026-08-10" below for what changed in the numbers.

### The reproduction gate is not on that table, and the reason is stronger

An unrebuildable *corpus* is a file somebody else could in principle hold. The
French reproduction gate is not that. `scripts/gate-fr-reproduction.ts` reads its
corpora from `<consumer>/data/work/*/registry.sqlite3` **and imports the
implementation it reproduces** from `<consumer>/src/core/typography.ts`. Handing
an outsider the corpora would not help: the thing being reproduced does not exist
publicly at all. That is not an unrebuildable corpus, it is a gate with no public
referent, and it is why the reproduction result is quoted differently from the
findings results everywhere else in this repo.

What it establishes is real but narrow: over 11,058 string fields, 827 of which
the prior implementation rewrites, the pack rewrites exactly the same bytes. That
is a strong equivalence claim and a weak evidence claim, because the corpora are
translation output from one pipeline rather than published French, and 812 of the
827 come from a single corpus (`nist-sp800-53`). By this file's own argument that
is the register that measures recall. The findings gate below is what measures
the other thing.

Two names appear here and they are different things.
[`translation-harness`](https://github.com/shbernal/translation-harness) is the
public tool whose `job.normalize` a pack satisfies structurally, and no code in
this repo imports it. `translation-agents` is a private working tree that happens
to hold registries in that tool's format, and it is the only thing `--consumer`
ever points at. Nothing public depends on the second.

So off the maintainer's machine, `pnpm corpus && node scripts/gate-findings.ts
--verify` now reproduces every corpus and every number in this file, and the
French *reproduction* gate cannot run at all. That last limit is real and the
honest thing is to state it rather than let a failing gate imply a broken
checkout. An unrun gate said plainly is fine.

## Two ways a rebuild disagrees with the baseline, neither of which is drift

CI rebuilds all nine and verifies them. Its first two
runs turned up both of the ways that can fail without anything having changed,
and both are recorded here because the obvious response to either - re-baseline
and move on - would quietly rewrite what the numbers in this file describe.

**The publisher throttles you.** The AEPD refused 17 of 116 requests with `503`
from a GitHub runner, and 7 even after three retries. Every URL was live; the
same list from a laptop returns all 116 documents, byte for byte the committed
baseline. The fetcher used to log each refusal and carry on, so the corpus came
back a sixth short and the script exited 0 - a corpus that looks fine, a
fingerprint that has moved, and every incentive to re-baseline against text that
was never missing. A document that does not arrive is now counted and fails the
run, and the request rate was slowed from 400 ms to 1.5 s, which is the cause
rather than the symptom.

**The publisher serves you the same page differently.** `theconversation-fr` used
to rebuild to 403,951 characters in CI and 404,027 here, over the same 43
documents, both numbers stable across runs. 76 characters, deterministic, and not
a revision: a fresh local re-fetch was byte-identical to the baseline.

`gates/documents-*.json` turned that into ten file names, and the ten deltas were
all multiples of four. The number of `À lire aussi :` callouts in each of those
documents is its delta divided by four, in all ten, and there are none in the
other 33. Those callouts are the newsroom's template rather than anyone's prose,
and the phrase sets a plain space before its colon, so they were also
manufacturing 19 of the 25 `colon-spacing` findings this corpus reported:
the same mistake nineteen times, by a CMS, in a corpus whose whole purpose is to
show what people who set French properly actually do. They are now removed at
extraction by the `drop` in `gates/corpora.json`, which costs 1,782 characters and
two genuine findings, both in a headline a callout reproduces. Which four
characters differ is still unknown, which is why the whole block goes rather than
the phrase alone.

**The four characters are the callout's own label, and it is localised.** The
pattern was anchored to the callout's structure and its French phrase together,
so from a GitHub runner it matched nothing at all and the rebuild that used to
come back 76 characters short came back 1,706 characters long instead: 19
callouts still there, each 4 characters from the length this pattern was written
against. Fetching the same 43 URLs from the Internet Archive reproduces that
number exactly, which is what finally made it a thing anyone could look at
rather than a thing that needed a rebuild per guess. The markup either side is
identical to the tag:

    <hr><p><em><strong> À lire aussi : <a href=...>headline</a> </strong></em></p><hr>
    <hr><p><em><strong> Read more:      <a href=...>headline</a> </strong></em></p><hr>

`À lire aussi :` is 14 characters and `Read more:` is 10. The Conversation
serves the label by where the request comes from and not by which edition is
being read, so a French article carries an English label to a data centre, and
the count of callouts in a document times four was its delta all along.

The `drop` now matches either label. That is why it is written as one
alternation inside the same structural anchor rather than as a looser pattern:
the two labels are a fact about this publisher's CMS, and anything wide enough
to catch a third without being told about it would also be wide enough to catch
prose. Widening it moved no committed number - the French label still matches
what it always matched - and it closed the gap it was written to close, from
everywhere. `theconversation-fr` now rebuilds to 402,245 characters and to its
committed pins from a residential connection, from a data centre and from the
archive.

Both of those were diagnosed at the granularity of a whole corpus, because a whole
corpus was all the committed evidence could describe. `gates/documents-*.json`
exists because of the second one: 76 characters somewhere in 43 documents is a
question the fingerprint poses and cannot answer. It answered it on its first use,
which is the argument for it. A rebuild that disagrees now prints the file name
and the delta, and the investigation is a line of CI output rather than a
hypothesis.

## And one that was drift: a publisher withdrew a document

Rebuilding `admin-ch-medien-de-ch` on 2026-08-15 returned 110,484 characters
against a committed 111,812, and `gates/documents-*.json` named the two files
immediately:

    ~ newnsb-m5dXtFD2sVP_nBvBol-Tm.txt: sha mismatch, 1400 -> 75 characters
    ~ newnsb-wcH3pK00kcgQRVfxKbItB.txt: sha mismatch, 2154 -> 2151 characters

The 75 characters are `Diese Seite existiert nicht oder die Medienmitteilung
wurde zurückgezogen.` The Swiss federal administration retracted that press
release, and the URL serves the notice at the same address rather than a 404. The
other document lost three characters, which is a sub-editor.

**The two things this taught are worth more than the incident.** A withdrawal
served at `200` is invisible to every check the fetcher had: it fails a document
that extracts to nothing, and an error page is not nothing. And no length
threshold separates a notice from a short press release, so there is no number
that would have caught this one without firing on real text. The general answer
is neither a threshold nor a smarter emptiness test. It is that
`gates/documents-*.json` already records what that document is supposed to
contain, and comparing against it catches a withdrawal, a redirect, an
interstitial and a sub-editor with one mechanism and no guessing.

`scripts/fetch-corpus.ts` now enforces those records rather than reporting them
and rewriting them: a build in which any document fails its recorded length and
hash exits 3, naming the file, and writing the records is the separate act of
`--rebaseline`. That is what closes this section rather than mitigating it. The
incident that made the enforcement non-negotiable was not this one but a quieter
one two corpora over: a rebuild picked up three documents `theconversation-fr`
had silently revised, overwrote the record of what they used to say, and exited
0. The evidence that anything had moved was destroyed by the run that discovered
it. All three were recovered from the Internet Archive and verified against the
hashes the records still held: a record that is enforced is also a record that
lets a document be put back.

**The decision taken: the URL is dropped from the frozen list.** An error page in
a corpus whose stated qualification is professionally typeset published text
violates that qualification, and 75 characters that expose nothing do not pay for
the ambiguity of leaving it in.

The costs are separated rather than summed, because the withdrawal and the
`de-CH@0.2.0` rule change had to land in one baseline cut: the corpus on disk was
already in the post-withdrawal state and the withdrawn text is not recoverable,
so there was no intermediate state to sequence them through. The attribution is
therefore measured, over the same text, three times:

| | Documents | Characters | `«` | `»` | `'` | Findings |
|---|---|---|---|---|---|---|
| Committed baseline, `de-CH@0.1.0` | 37 | 111,812 | 38 | 38 | 2 | 0 |
| After the withdrawal, `de-CH@0.1.0` | 37 | 110,484 | 36 | 36 | 0 | 0 |
| After the withdrawal, `de-CH@0.2.0` | 37 | 110,484 | 36 | 36 | 0 | 0 |
| After dropping the URL, `de-CH@0.2.0` | 36 | 110,409 | 36 | 36 | 0 | 0 |

So: **the withdrawal cost 1,328 characters, two guillemet pairs and both straight
apostrophes**; **the rule change cost nothing**, which is the same answer it gave
on the other two German corpora and for the same reason, that this text has no
space before punctuation anywhere; and **dropping the URL cost 75 characters and
nothing else at all**, which is the whole argument for dropping it.

That also settles a question this section used to leave open. The guillemets were
attributable to the withdrawn document by arithmetic, two pairs being four
characters against a three-character edit, and the apostrophes were not. Running
the old pack over the post-withdrawal corpus answers it directly: both straight
apostrophes went with the withdrawn press release, and `apostrophe` now meets
23 curly apostrophes and no straight ones.

The last of it is that the corpus was thin enough for one document to matter this
much. 37 documents carrying the entire `de-CH` guillemet evidence base means one
withdrawal moved that exposure by 5%, and no amount of pinning fixes that: a pin
tells you a document changed, not that the corpus could not afford to lose it.
That is what `pnpm gates:status --fragility` measures and what deepening the
corpus to 153 press releases closed; both are under "Gaps the corpora found".

## Where the bytes come from: captures where there are any

Every story above is one shape: a frozen URL freezes an address, and an address
is not a document. So a line in `gates/sources/*.urls` may carry a second column,
the timestamp of an Internet Archive capture, and that capture is what a rebuild
reads. `--live` asks the publisher instead, which is the only way to find out
whether these addresses still resolve and is what `Corpus links` runs.

The mechanic is Wayback's `id_` modifier, which returns a capture as it was
received rather than rewritten for a reader, so the `region` and `drop` selectors
match exactly what they match live. `scripts/fetch-corpus.ts` says the rest,
including the one edge that costs an afternoon.

**Coverage, measured over all 357 URLs and not assumed:**

| Corpus | Archived | Why the rest are not |
|---|---|---|
| `theconversation-fr` | 43 of 43 | |
| `boe-lopdgdd-2018-es` | 1 of 1 | |
| `fedlex-bv-2024-de-ch` | 1 of 1 | |
| `admin-ch-medien-de-ch` | 125 of 153 | 28 have no capture that reproduces the pin, and the URLs added in the deepening below were chosen from the archive's own index, so this corpus is covered by construction |
| `aepd-faq-es` | 80 of 116 | 30 captures predate the pins, some by two years, and there is no newer one |
| `openedition-journals-fr` | 13 of 39 | 22 never captured; 4 captured an anti-bot challenge page, served at 200 |
| `bsi-kompendium-2023-de` | 0 of 1 | never captured |
| `fundeu-rae-es` | 0 of 3 | never captured, which is a crawler not following a `wp-json` query |

**Every timestamp committed here is one whose bytes reproduced the committed pin
on this machine.** That is the only test that means anything: a capture that
exists and a capture that is the document are different things, and the
difference showed up as a 403, an interstitial and thirty stale revisions. A
capture that could not be verified was not written down, so a mixed corpus is
mixed in a way that is recorded rather than hoped for, and `pnpm gates:status`
prints the split per corpus in its `source` column.

**How the capture is found decides how much of it you get, and that was worth
32 press releases.** The first pass took the newest capture of each URL, by
asking for `web/2id_/<url>` and reading the redirect: one cheap request, no CDX
API, and it is what the row above used to say `3 of 36`. The newest capture of an
admin.ch page is usually the archive's copy of admin.ch refusing a crawler, so
that method threw away the good older ones. Asking the CDX API for captures
filtered to `statuscode:200` finds those instead, and 7 of the 12 it turned up for
the original list reproduced pins that had been sitting there unmatched. The
cheap probe is still the right first move; what it is not is an answer about
coverage.

**The trade, stated plainly.** This swaps a dependency on eight publishers for a
dependency on one archive, and an archive is a single point of failure in a way
eight independent publishers are not. It is still the better trade, because not
changing its bytes is the archive's entire job and serving the current version is
every publisher's. It is also not a trap: `--live` reproduces the original claim
exactly, that anyone with a checkout and a network can rebuild these corpora, and
the three corpora with no useful coverage never stopped depending on it.

What this buys is narrower than "the corpora cannot drift" and worth having: the
corpus that actually drifted twice is now the one that is fully archived, and the
four-character disagreement above was solved by fetching the awkward variant on
demand instead of waiting for CI to serve it.

## Two workflows, because there were always two questions

There was one `Corpus` workflow, monthly, and it asked both of these at once and
reported one answer:

| Workflow | Question | When | Reads |
|---|---|---|---|
| `Corpus links` | Do these URLs still resolve, and still extract? | monthly, and on demand | the publishers, `--live` |
| `Corpus pins` | Do the rules still measure what this repo records? | on a push touching a pack, a corpus definition, a URL list or a committed manifest | the captures |

The mismatch was in the *when*, and every false alarm the old workflow produced
came out of it. Reproducibility is a property of a commit: the counts in this
file can only stop describing the corpus if somebody changes a rule, so checking
them monthly asks a question whose answer nobody has touched. Link rot is the
opposite, a property of somebody else's month. Asking the second question on the
first question's schedule, against live text, means every sub-editor in eight
newsrooms can turn a release gate red on the first of the month.

So a pin mismatch is **information** in `Corpus links` and a **failure** in
`Corpus pins`, and that is the same fact reported twice rather than an
inconsistency. Live text differing from a pin is what a live web does, and the
per-document deltas are the useful part; captured bytes differing from a pin
cannot be a publisher, so it is this repository's doing. A build that comes back
short is red in both, because neither question can be answered from a corpus that
is missing documents.

Nothing is rebaselined in either. `--rebaseline` stays a person reading a delta
and committing it, for the reason the withdrawal section gives: the run that
discovers a change must not be the run that destroys the record of what it used
to be.

## What is committed, and what is not

The corpora are third-party published works and are not this repo's to
redistribute, so `gates/corpora/` is ignored. What is committed is:

- **`gates/sources/*.urls`**, a frozen list of document URLs, for each corpus
  that has one, each line optionally carrying the archive capture a rebuild
  reads instead of the live page.
- **`scripts/fetch-corpus.ts`**, which turns a list into text.
- **`gates/findings-*.json`**, the per-rule counts, exposure counts, samples and
  a corpus fingerprint, for every corpus, plus a copy of that corpus's `note`
  from `gates/corpora.json` so the counts and the reason the corpus exists are
  one artefact. The note is the only field in there that is not a measurement,
  and `--verify` treats it that way: a difference confined to it is reported and
  does not fail, because a release gate that goes red for a typo fix is one
  people learn to re-run with `--rebaseline`. The file is still stale and still
  has to be regenerated; a note that changed alongside a count still fails.
- **`gates/documents-*.json`**, a character count and a hash for each document in
  each corpus. Metadata about somebody else's text rather than the text, so it is
  this repo's to commit. It does two jobs. It makes a disagreement legible - the
  fingerprint says a corpus moved, this says which of its 300 documents did - and
  it is **the corpus contract**: the URL list freezes which documents a corpus
  contains, and this freezes what they say. `scripts/fetch-corpus.ts` enforces it
  on every build, exits 3 naming any document that fails, and writes it only under
  `--rebaseline`, which it **refuses from a build that came back short** -
  regenerating from an incomplete fetch would record the documents that failed to
  arrive as the new truth, which is the same trap as re-baselining a gate.

That combination is deliberate. A gate whose corpus cannot be rebuilt is a number
nobody else can check, and a gate that ships the corpus is a redistribution
problem. A frozen list plus a fingerprint is both: anyone can rebuild and compare.
Every release after the first then reviews a **delta**, so a rule change that
moves German findings over a fixed corpus from 34 to 210 shows up in a diff
instead of in a user's inbox.

The extraction from HTML and XML is load-bearing rather than incidental. This
package's whole subject is characters that are invisible on screen, so the reader
collapses only the ASCII space and tab, decodes entities in full, and turns block
tags into newlines. Anything that normalised whitespace would quietly delete the
evidence, and anything that stripped tags without a separator would weld two words
together and manufacture a finding the publisher never wrote.

That last point decided the German source. The Kompendium also ships as PDF and
as XLSX checklists, and the XML was chosen over both because it is the structured
original: a PDF text layer has already thrown away the distinction between a
no-break space and a space, which is most of what these rules are about. The
block-tag list in `scripts/fetch-corpus.ts` gained DocBook's element names for
this corpus, taken from the frozen document's own element inventory; the addition
was verified byte-identical against the existing HTML and XML corpora before it
was committed.

## The corpus has to be well set, and that is the whole subtlety

The instinct is to grab whatever prose is handy. Sloppy text is the wrong input:
nearly every finding on it is a true positive, which measures **recall**, which
nobody doubts. A regular expression that spots a straight apostrophe spots
straight apostrophes.

In professionally typeset text **every finding is a suspected false positive by
construction**. That is the failure mode these rules actually have, and the only
one that stays invisible until the checker meets prose somebody did not write to
exercise it.

Note what does *not* qualify: a plain-text transcription. Those flatten the
typography on the way in, which turns a false-positive test into a recall test
and quietly answers the wrong question.

## Zero findings is two different results, so the gate counts exposure

A rule that reports nothing has either met text the publisher set correctly, or
met text that never contained anything it could match. The first is the result
this gate exists to produce. The second is a vacuous run reported as a pass, and
it is the same failure the French gate refuses when the prior implementation
rewrites nothing.

So every report carries an `exposure` block: how many times each significant
character actually occurs in the corpus. And each corpus **declares** in
`gates/corpora.json` which characters it is there to expose the rules to, which
the gate checks rather than trusts. If a re-fetch loses the Swiss guillemets,
`admin-ch-medien-de-ch` fails instead of going on reporting a clean zero over
text that has stopped being able to disagree with it.

This is also why the corpora come in pairs. One member carries scale and
register, the other carries the characters the first one lacks:

| Language | Scale and register | The characters |
|---|---|---|
| `fr` | `openedition-journals-fr`: 2.0M characters, 3,102 opening guillemets | `theconversation-fr`: 99 question marks, which formal academic French barely uses |
| `es` | `boe-lopdgdd-2018-es`, `fundeu-rae-es` | `aepd-faq-es`: 332 correctly opened interrogatives |
| `de-CH` | `fedlex-bv-2024-de-ch`: 722 no-break spaces, no quotation marks at all | `admin-ch-medien-de-ch`: 198 Swiss guillemet pairs |

`de-DE` is the one language with a single corpus, and it can be because the
Kompendium carries both halves at once: 2.4M characters of one register, and 544
`„` with 128 straight quotes inside them.

## `fr`, reviewed 2026-08-10 against two corpora

2,409,504 characters, and this is the review that changed what the package can
claim about French. Until it ran, French had only the reproduction gate, which
compares the pack to its own predecessor over translation output. Nothing had
ever asked what the pack does to French that a French publisher set.

| Corpus | What it is | Values | Characters |
|---|---|---|---|
| `openedition-journals-fr` | Articles from three OpenEdition journals: `rfsic`, `questionsdecommunication`, `terrain` | 39 | 2,007,259 |
| `theconversation-fr` | The Conversation France, academic authors edited by a newsroom | 43 | 402,245 |

Both qualify on the test this file insists on. Across 2.4M characters there are
19,389 curly apostrophes against 183 straight, and six straight double quotes in
total. This is French set by people who were paying attention, so every finding
is a suspected false positive by construction.

| Rule | OpenEdition | The Conversation | Verdict |
|---|---|---|---|
| `apostrophe` | 71 | 109 | true positives |
| `colon-spacing` | 38 | 6 | true positives |
| `punctuation-spacing` | 9 | 9 | true positives |
| `guillemet-open-space` | 51 | 2 | true positives |
| `guillemet-close-space` | 48 | 2 | true positives |
| `mixed-no-break-space` | 2 | 0 | true positives |
| `missing-punctuation-space` | 355 | 0 | **355 false** |
| `straight-double-quote` | 6 | 0 | domain judgement |

708 findings, 355 of them false, and every false one from a single check-only
rule. Those are the numbers for `fr@0.2.0`.

The numbers for `fr@0.1.0` over the same corpora were **7,188 findings, 6,817
false**, left as they were measured, which was before the `theconversation-fr`
callouts were excluded. Everything else in this section is a property of the text
rather than of a pack version, so it is recomputed against the corpus as it now
stands. The next section is about what was between the two versions, because the
diagnosis is more useful than the totals.

### The guillemet rules fired on every guillemet in well-set French

At `fr@0.1.0`, `guillemet-open-space` fired on all 3,305 opening guillemets in the
corpus and `guillemet-close-space` on 3,254 of 3,255 closing ones. Not on a subset.
On essentially every one.

What is actually inside them:

| Inside the guillemet | Opening | Closing | Is it a defect? |
|---|---|---|---|
| U+00A0 no-break space | 3,252 | 3,204 | this is the question |
| plain space | 41 | 42 | yes, it permits a line break |
| U+2009 thin space | 11 | 7 | yes, breaking |
| nothing at all | 1 | 1 | yes |
| U+202F narrow no-break | 0 | 1 | no, and it is the only one that did not fire |

So 103 findings were real defects and 6,456 were the pack objecting to U+00A0 and
wanting U+202F. The rule matched `«` followed by *any* of the three spaces and
rewrote to U+202F, which meant `normalize` silently retyped the inside of every
quotation in a correctly set French document.

Whether that is wrong depends on which reading of the citation you take, and
**the citation contradicts itself**. The `Lexique` typesets its own guillemets
with the fine space, while the table on its page 149 specifies `espace mots
insécable`, which is U+00A0. French practice outside Switzerland has settled on
U+00A0, and both publishers here use it exclusively. Swiss typography is the one
that prescribes the fine space, which is a pointed thing to discover in a pack
whose whole design premise is that `de-DE` and `de-CH` had to be split.

The same review found a second-order inconsistency inside the pack.
`punctuation-spacing` converted a plain space before `; ! ?` to
U+202F and **left U+00A0 alone**, while the guillemet rules extended no such
tolerance. The pack accepted U+00A0 before a question mark and rejected it after
an opening guillemet, and no reading of the standard asks for that combination.

### What `fr@0.2.0` does instead, and why it is not just the other width

Picking U+00A0 would have been the same mistake facing the other way: it would
retype every document following the reading the Lexique's own typesetting
demonstrates, and this package's rule is that **a pack must not assert what its
citation does not fix**.

So the rules were narrowed to the spacing that is wrong under *either* reading,
and the repair was made to depend on the document:

- **Wrong under both readings, and repaired**: a breaking space (U+0020 or
  U+2009) anywhere inside the guillemet, more than one space, or no space at all.
  U+2009 is worth naming separately: it is the right width and the wrong breaking
  behaviour, so it survives proofreading and comes apart when the text reflows.
- **Admissible, and left alone**: exactly one U+00A0, or exactly one U+202F.
- **The width a repair is spelled in**: whichever of the two the document already
  uses, counted over its guillemets and its `; ! ?`. A tie, or no evidence at
  all, goes to U+202F. This needed a third rule constructor, `conformRule`,
  because a literal replacement cannot adapt to the text it is repairing.
- **Using both widths in one document**: reported by `mixed-no-break-space`
  and never repaired, because *which* one to settle on is the author's call and
  on a near-even split harmonising would silently retype half the document.

The colon stayed a fixed U+00A0, because nothing about it is in dispute: the
Lexique specifies the word space and the corpora use it 2,450 times with no
counter-example.

The result is the table above. The guillemet rules now report 103 findings, which
is exactly the count of real defects in the row-by-row breakdown, and
`mixed-no-break-space` reports 2, which is exactly the number of stray U+202F
in a corpus that is otherwise entirely U+00A0. `fix --lang fr` is safe on
well-set text.

Two things this cost, both worth stating. The pack id moved to `fr@0.2.0`, so
counts stamped `fr@0.1.0` are a different era and are not comparable. And
`gates/fr-reproduction.json` still reports 827 rewrites and **0 differences**:
the private corpus contains no guillemet the prior implementation had to
re-space, so the narrowing was invisible to the gate that appeared to forbid it.

### The 355 `missing-punctuation-space` are all foreign titles

Every one is in `openedition-journals-fr`, and `theconversation-fr`, which has no
bibliography, produced none. Classified by the language of the surrounding
window: 311 English, and the remainder Portuguese, Spanish and English titles
carrying a French subtitle.

> `D'Aveni Richard A., Hypercompetition: managing the dynamics of strategic maneuvering`
>
> `Notícias automatizadas: A evolução que levou o jornalismo a ser feito por não humanos`

An English or Portuguese book title inside a French bibliography is set to its
own language's rules, correctly, and French spacing does not govern it. This is
the same false positive `unpaired-question` produced against an English phrase
quoted inside Spanish, at 355 times the volume, and it says the same thing: the
unit these rules operate on is not reliably monolingual. The rule already ships
as `find` with no `fix`, which is the outcome that matters, and this corpus is
the evidence that the decision was right rather than cautious.

### The 368 findings that are real

`apostrophe` fired 180 times on a straight apostrophe between two letters in
documents that use U+2019 everywhere else, including once in a sentence carrying
both forms. `colon-spacing` fired 63 times on a plain breaking space
before a colon, and `punctuation-spacing` 20 times on a breaking
space before `; ! ?`. The guillemet rules account for 103 and
`mixed-no-break-space` for 2. All of them are genuine, and all but the last
two are fixable.

The six `straight-double-quote` are foreign words quoted inside brackets in
English abstracts. Domain judgement, which is why the rule is a warning.

## `de-DE`, reviewed 2026-08-10 against `bsi-kompendium-2023-de`

BSI IT-Grundschutz-Kompendium, Edition 2023, from the agency's own DocBook XML:
2,393,884 characters, published by a federal agency and edited to a house
standard.

This replaced a 986,380-character extract of the same Kompendium that was read
from a private registry, and the replacement is a strict improvement in three
ways: it is 2.4 times the text, it carries 544 `„` against the extract's 85, and
anybody can rebuild it. The counts below therefore supersede the 2026-08-09
review rather than continuing it.

**Every error-severity rule fired zero times.** All 128 findings came from one
warning-level rule, and the corpus contains exactly 128 straight double quotes,
so that rule fired on all of them.

| Rule | Findings | Verdict |
|---|---|---|
| `apostrophe` | 0 | fixable, silent over 2.4M characters |
| `punctuation-spacing` | 0 | silent over 647 colons |
| `straight-double-quote` | 128 | mixed, see below |
| `low-quote-open-space` | 0 | fixable, silent over 544 low quotes |
| `guillemet-open-space` | 0 | fixable, no exposure |
| `guillemet-close-space` | 0 | fixable, no exposure |
| `guillemet-direction` | 0 | no exposure |

The 128 fall into three classes, counted rather than sampled:

1. **18 genuinely mismatched pairs**, opening with `„` and closing with a
   straight quote: `Metadaten („Labels")`, `„Patches"`, `„Container-Ausbruch"`,
   `„Microsoft Technet"`. Unambiguous defects, in edited federal text, found by
   the rule that was hardest to justify. The old corpus contained exactly one of
   these, so quadrupling the corpus turned a single anecdote into a class.
2. **104 marks forming 52 straight pairs** in German prose: `"überrascht"`,
   `"normaler"`, `"Kenntnis nur, wenn nötig"`, alongside product and technical
   names like `"Active Directory Domain Services"`. Duden sets all of these with
   `„ “`, so they are true positives, though the ones wrapping identifiers are
   the same house-style judgement Spanish produced.
3. **6 closing quotes in bibliography entries** for English standard titles from
   IEC and ISO. A title quoted in its own language's convention, which is the
   same false positive `missing-punctuation-space` produces at
   scale, and the reason this rule is a **warning** and is not fixable.

The `„` count exceeds the `“` count by 25, and the 18 above are most of that gap.

The four German guillemet rules have no exposure here, which the corpus states
rather than hides: this text quotes with `„ “` throughout.

## `es`, reviewed 2026-08-09 against three corpora

1,106,553 characters in total, from three publishers with three registers.

| Corpus | What it is | Values | Characters |
|---|---|---|---|
| `boe-lopdgdd-2018-es` | Ley Orgánica 3/2018, from Spain's official gazette | 1 | 245,269 |
| `aepd-faq-es` | The Spanish data protection agency's public FAQ | 116 | 220,269 |
| `fundeu-rae-es` | 300 FundéuRAE articles | 300 | 641,015 |

FundéuRAE is the foundation the Real Academia Española promotes with the Agencia
EFE, and correct Spanish is its entire subject, so a typographic finding in its
own prose is worth reading twice. The AEPD FAQ is here for one reason: every
entry is a question, and it is the only material that puts `unpaired-question`
in front of correctly opened interrogatives at any volume.

| Rule | BOE | AEPD | Fundéu | Exposure across the three |
|---|---|---|---|---|
| `guillemet-open-space` | 0 | 0 | 0 | 1,068 opening guillemets |
| `guillemet-close-space` | 0 | 0 | 0 | 1,066 closing guillemets |
| `opening-mark-space` | 0 | 0 | 0 | 370 `¿`, 1 `¡` |
| `unpaired-question` | 0 | 0 | **1** | 370 `¿`, 370 `?` |
| `unpaired-exclamation` | 0 | 0 | 0 | 1 `¡`, 1 `!` |
| `punctuation-spacing` | 0 | 0 | 0 | 287 `;`, 415 `:` |
| `straight-double-quote` | 0 | **162** | 0 | 162 straight quotes |

### The one `unpaired-question`, which is the finding the design turns on

> `guachisnai, que procede de What’s your name? y se usa en Cádiz`

One false positive in 641,015 characters, and it is a foreign-language quotation:
an English phrase carried inside a Spanish sentence, where Spanish punctuation
does not govern. No pattern over Spanish text can get this right, and the fix
that suggests itself, inserting `¿` before `What`, would be actively wrong. This
is the concrete case behind the rule shipping with `find` and no `fix`.

There is a second lesson in it. The published article marks the phrase as foreign
with italics; the checker sees text with the markup already stripped, so the one
signal that would have resolved it is exactly the one that does not survive.
A host that has the markup should not expect the pack to have it too.

The other number matters more than the finding: **332 correctly opened
interrogatives in the AEPD FAQ, and zero false positives.** The rule the whole
package's shape was designed around has now met real published Spanish.

### The 162 `straight-double-quote`, which split cleanly in two

They land in 21 of the 116 AEPD documents, and the split is the same one German
produced independently:

- **62 are quoted UI labels and a domain name**, concentrated in two how-to
  pages: `"Ver" > "Paneles de navegación" > "Firmas"` in an Acrobat Reader walk
  through, `"Certificado AC RAIZ FNMT-RCM"` and `"Abrir"` in a browser
  certificate one, `"tudecideseninternet.es"` twice. Setting a menu path with
  `« »` would be wrong; you quote a label verbatim. Domain judgement.
- **100 are ordinary Spanish prose**: `"fichero de morosos"` 33 times in one FAQ
  section, `"videovigilancia"` and `"cámaras de seguridad"` across the community
  of owners pages, `"apto o no apto"` in the occupational health one. The RAE
  prescribes `« »` as the primary Spanish quotation mark. These are true
  positives, in text published by a Spanish public authority.

Two languages, two publishers, one conclusion: the split is between the domain
and the language, not between right and wrong, which is why the rule is a
**warning** and is not fixable.

## `de-CH`, reviewed 2026-08-09, press releases deepened 2026-08-15

698,683 characters. Swiss German is not a dialect note here: Switzerland sets
`«Wort»` where Germany sets `»Wort«`, and drops the eszett, so this is a separate
pack and it needs separate evidence.

| Corpus | What it is | Values | Characters |
|---|---|---|---|
| `fedlex-bv-2024-de-ch` | Swiss Federal Constitution, German, consolidated 2024 | 1 | 199,319 |
| `admin-ch-medien-de-ch` | 153 press releases of the Swiss federal administration | 153 | 499,364 |

**This review supersedes the 2026-08-09 one rather than continuing it.** That one
read 37 press releases and reported zero findings from every rule, over 38
guillemet pairs. The corpus is now 153 press releases and 198 pairs, and the
zeros are gone:

| Rule | Findings | Exposure | Verdict |
|---|---|---|---|
| `apostrophe` | 2 | 24 straight `'`, 100 `’` | true positives |
| `punctuation-spacing` | 1 | 690 `;`, 460 `:` | **1 false** |
| `straight-double-quote` | 1 | 1 straight `"` | true positive |
| `guillemet-open-space` | 1 | 198 `«` | true positive |
| `guillemet-close-space` | 2 | 199 `»` | true positives |
| `guillemet-direction` | 1 | 199 `»` | **1 false** |

Eight findings over 698,683 characters of federal Swiss German, six of them real.
Nothing about the pack changed to produce them; `de-CH@0.2.0` read 4.5 times as
much of the same publisher.

### The six that are real, and four of them are in two documents

**A postulate title set the French way.** One press release quotes two report
titles in one sentence, `«Rückführbarkeit von Messergebnissen auf bekannte
Referenzwerte im Gesundheitswesen»` closed up and correct, and then `« Durchsetzung
zuverlässiger und richtiger Messwerte im Gesundheitswesen »` with a plain space
inside each guillemet. Same paragraph, same author, both conventions. That is
`guillemet-open-space` and one of the two `guillemet-close-space`, and
it is the failure the pack exists for: French spacing inside Swiss German
quotation marks, in text nobody would call badly set.

The other close-space finding is the same defect in a narrower spelling:
`«Das Weinjahr 2025` then a **U+202F narrow no-break space** and then `»`. Right
width for French, wrong convention for Swiss German, and invisible on the page.
It is written out here rather than quoted, because a U+202F pasted into a
markdown file is indistinguishable from a space and this file would then be
asserting the wrong thing.

**A quotation opened straight and closed Swiss.** `"Strategie Digitale
Souveränität der Schweiz»` is the corpus's only straight double quote, and it is
half of a mismatched pair. This is the class the Kompendium produced 18 of, found
here in one of one: the arithmetic says so as well, since 198 `«` against 199 `»`
is 198 pairs plus this orphan.

**Two `Z'graggen`.** A Swiss surname set with a straight apostrophe, twice in the
same press release, in a document that gets its guillemets right. Duden sets
`Z’graggen`, so both are fixable true positives.

That last one is where the pack's narrowing earns its keep. The corpus contains
24 straight apostrophes and 22 of them are the Swiss thousands separator:
`98'200`, `100'000`, `2'324`. `apostrophe` requires a letter on **both** sides,
so it reports the two names and none of the numbers. A rule matching a straight
apostrophe anywhere would have produced 22 false positives on federal Swiss text
and would have *repaired* them, turning `100'000` into `100’000`. The narrowing
was written for `Ku'damm` and it holds a case nobody had thought of.

### The two that are false, and neither is new in kind

**`Résumé : Cinquième rapport du Gouvernement suisse`**, in the attachment list of
an otherwise entirely German press release. French takes a space before its
colon; German does not, and the rule cannot see that the sentence changed
language. This is the third language to produce this same finding, after
`unpaired-question` on an English phrase and 355
`missing-punctuation-space` on foreign titles, and it is why the
rule ships as `find` with no `fix`. The comment above `punctuation-spacing`
predicted it in as many words - "in German corpora this fires almost exclusively
on text a French-speaking translator touched" - which is now evidence rather than
a guess.

**`der Parteien.»1 Trotz allem`**, where a correct closing guillemet is followed
by a footnote marker. `guillemet-direction` matches `»` followed by a letter
or digit, on the reasoning that a `»` opening something is the German setting; a
superscript `1` is a digit by the time the reader sees it. Check-only, so it
costs a human one glance rather than a corrupted document, and narrowing it to
exclude digits would stop it seeing `»2. Weltkrieg«`. Worth knowing about the
extraction as well: `<sup>1</sup>` flattens to `1`, so the adjacency this rule
matched is one no reader of the page has ever seen.

### What each corpus contributes, and why there are two

The Constitution contributes 722 no-break spaces, 637 semicolons and not one
quotation mark, which is precisely why it is not the only Swiss corpus. The press
releases contribute everything else: every guillemet, every apostrophe, every
question mark and the one straight double quote in the language.

That is also the standing weakness. `admin-ch-medien-de-ch` is the **only** `de-CH`
corpus with any quotation mark at all, so six rules rest on one publisher; see
"Gaps the corpora found" for the rest of that. It is no longer thin, though. 198
pairs is within sight of German's 1,063 curved quotes and Spanish's 1,068
guillemets, where 36 was an order of magnitude short, and the largest share of it
held by any single document fell from 25% to 8%.

## `nl`, reviewed 2026-08-15 against `taaladvies-nl`

880,407 characters, 300 advice articles from the service the Nederlandse Taalunie
runs with the Instituut voor de Nederlandse Taal and Onze Taal. Twelve findings.

| Rule | Findings | Values |
|---|---|---|
| `apostrophe-elision` | 10 | 5 |
| `mixed-quotation-marks` | 2 | 2 |
| every other `nl` rule | 0 | 0 |

**All twelve are real, and the ten are one mechanism.** Every
`apostrophe-elision` finding is U+2018 where U+2019 belongs, and every one of
them is word-initial: `‘k eens lekker`, `‘s-Hertogenbosch`, `‘r`, `‘ns`. Three of
the five documents carry the correct U+2019 form of the same word within a line
or two of the wrong one, and one prints `‘ns / ’s` in a single list.

That pattern is a smart-quote pass, not a typist. An algorithm deciding whether
`'` opens a quotation or stands in for a letter looks at what precedes it, and at
the start of a word there is nothing there, so it turns the mark the wrong way.
It is also exactly why `apostrophe` reports **zero** across the same 880,407
characters: mid-word the algorithm has a letter to look at and gets it right. The
pack's two apostrophe rules split along the seam of the defect rather than along
a grammatical category, and that was not designed in. The corpus found it.

Worth stating plainly, because it is the strongest evidence this gate has
produced for any pack: the Taalunie's own advice service mis-sets the Dutch
word-initial apostrophe, in prose whose subject is correct Dutch.

**The two `mixed-quotation-marks` are both genuine mixtures.** One document
opens two quotations with `“` and one with `‘`; the other does the reverse, two
`‘` against one `“`. In each the minority mark is reported and the majority is
left alone, which is the behaviour the rule claims. Against 863 `‘` and 3 `“` in
the corpus overall, Taaladvies is overwhelmingly consistent and these are the two
places it is not.

**The zeros are worth reading individually**, since a zero is only evidence where
the corpus exposes the rule:

- `punctuation-spacing`: 0 against 1,805 colons, 1,776 semicolons and 605
  question marks. That is a real zero and a strong one. An earlier hand-rolled
  extraction of the same posts reported 121 findings here, every one of them
  manufactured by replacing inline tags with spaces so that `<b>ANS</b>:` became
  `ANS :`. The number in the table is from `fetch-corpus.ts`, which does not do
  that. The lesson is the one this file keeps relearning: a finding count is a
  property of the extraction as much as of the rules.
- `straight-double-quote`: 0 against 0 straight double quotes. Vacuous, and
  the exposure block says so.
- `ij-capital` and `apostrophe-after-symbol`: 0 against **no exposure at
  all**. Neither an IJ digraph nor a digit-plus-apostrophe occurs in this corpus.
  These two rules are currently unevidenced; see the gaps below.

**Fragility.** The best-distributed corpus here. Exposure spreads across 199 to
291 of the 300 documents and the largest single document holds 1% to 4% of any
declared mark, against 8% for `admin-ch-medien-de-ch` and 100% for the
single-document corpora.

### Why this corpus and not a newspaper

Measured before it was chosen, and three obvious candidates failed the "well set"
bar in three different ways:

- **NOS and VRT set quotations with straight marks.** A Dutch news corpus would
  report a true positive on nearly every quotation, which measures recall. Nobody
  doubts recall.
- **The official gazette is set properly and has no apostrophes**, two in twenty
  thousand characters. It would expose nothing this pack is about, and this pack
  is mostly about apostrophes.
- **DBNL is transcription rather than typesetting**, 1,188 straight double quotes
  in one text, and is disqualified by name further up this file.

The Taalunie's own newsroom was measured too and rejected on the same bar: 19
straight apostrophes against 11 curly across 45,590 characters, and no
word-initial elision at all.

### The citation weakness, recorded rather than hidden

Two `nl` rules cite Taaladvies.net, which states that its advice has "geen kracht
van wet of ander bindend karakter". That is weaker than the Lexique, the
Ortografía or the Duden, and it is weaker on purpose: the Taalunie's Technische
Handleiding is a spelling standard and rules on neither spacing nor quotation
marks, so Taaladvies is the most authoritative statement that exists on Dutch
punctuation because the treaty body declined to make one.

The corpus and the citation are the same publisher, which is a real circularity
and the same one `fundeu-rae-es` has for Spanish. It is worth naming: a rule
cited to Taaladvies, measured against Taaladvies, reporting zero, has been
checked for agreement with its author rather than for correctness. The ten
findings above are the answer to that in this particular case, since they are the
publisher disagreeing with itself.

## Gaps the corpora found and the packs do not close

**`de-CH` has no rule for `„Wort“`.** `admin-ch-medien-de-ch` contains one `„`,
the German low quote, in Swiss federal text. `guillemet-direction` catches
the other direction, a German `»Wort«` appearing in Swiss text, but there is no
`de-CH` rule for the low quote. The asymmetry is not deliberate and the corpus is
what surfaced it. Adding the rule is a judgement about `de-CH`'s scope rather
than a bug fix, so it is recorded here rather than made quietly.

**`guillemet-direction` reads a footnote marker as an opening guillemet.**
`»(?=[\p{L}\p{N}])` treats a `»` followed by a digit as German-facing, and a
superscript footnote after a closing quotation is exactly that once the markup is
gone. One finding in 698,683 characters, check-only, so the cost is a glance;
narrowing it to letters would stop it catching `»2. Weltkrieg«`, which is a real
German setting. Recorded rather than fixed because the trade is a judgement and
neither side of it is obviously right.

**Two `nl` rules have no corpus at all.** `ij-capital` and
`apostrophe-after-symbol` report zero against zero exposure: `taaladvies-nl`
contains no IJ digraph and no digit-plus-apostrophe. Both rules are cited to the
Technische Handleiding and unit-tested, and neither has been in front of a line
of published Dutch. This is the sharper version of the single-corpus weakness
below, and closing it needs a second `nl` corpus with place names and dates in it
rather than more of the same publisher. Recorded here because a zero with no
exposure is not a result, and the table above would otherwise read as though
seven Dutch rules had been measured.

**`nl` has one corpus, and it is also one of its two citations.** See the
circularity note in the `nl` section. `de-DE` is single-corpus by design and the
Kompendium can carry it alone; `nl` is single-corpus because a second qualifying
Dutch source has not been found yet, which is a different situation wearing the
same shape.

**Six rules rest on a single corpus each.** `exposes` says which characters a
corpus is here for, and comparing those declarations across the corpora of one
language says something else: which rules would have no evidence at all if one
publisher were dropped.

The corpus is the subject here rather than the rule, because a rule id names a
position and not a language: `straight-double-quote` appears three times below,
once for each style whose only evidence for it comes from one publisher.

| Only exposed by | Rules resting on it alone |
|---|---|
| `admin-ch-medien-de-ch` | every `de-CH` quotation rule, plus `apostrophe` and `straight-double-quote`: the Constitution has no quotation mark and no apostrophe at all |
| `aepd-faq-es` | `straight-double-quote` for `es`: 162 straight quotes, and the other two Spanish corpora have none |
| `fundeu-rae-es` | `unpaired-exclamation`: one `¡` and one `!` in 1.1M characters |
| `openedition-journals-fr` | `straight-double-quote` for `fr`: six straight quotes, all in English abstracts |

`de-DE` is not on that list only because it has one corpus by design, which the
Kompendium can carry alone. The others are worth reading as the same kind of
weakness the exposure block exists to make visible: a number that is real and
comes from one place.

**How much of that exposure sits in one document** is the finer-grained version
of the same question, and `pnpm gates:status --fragility` prints it. Most corpora
spread their declared marks across nearly every document at 6% to 10%. Three do
not: `fundeu-rae-es` holds 29% of its 38 `¿` in one article, `aepd-faq-es` 22% of
its straight quotes in one how-to page, and `admin-ch-medien-de-ch` 8% of its
guillemets in one press release - which is the number that used to be 25%, and is
what deepening that corpus was for. `taaladvies-nl` is the other end of the
scale at 1% to 4% across 199 to 291 of its 300 documents, which is what 300 short
articles from one newsroom look like when every one of them is prose about
language.

### Closed

**`de-CH`'s quotation exposure was thin**, at 36 guillemet pairs against
`de-DE`'s 1,063 marks, which made every `de-CH` zero weaker evidence than the
other zeros. Closed on 2026-08-15 by taking the corpus from 36 press releases to
153 and the exposure to 198 pairs. It was not closed by picking press releases
that quote things: the added URLs were taken in URL order from the archive's
index of the same newsroom, blind to their contents, because a guillemet count
that came from choosing documents by their guillemets would measure the choosing.
The zeros did not survive it - six real findings appeared, and the section above
reads them - which is the argument for the whole exercise rather than a mark
against it.

**The French guillemet rules**, which normalised U+00A0 to U+202F and accounted
for 6,462 of the `fr@0.1.0` gate's 7,188 findings. Closed in `fr@0.2.0` by
`conformRule`: the rules now fire only on spacing that is wrong under either
reading of the citation, and repair in the width the document already uses. The
worry recorded here at the time, that the change was blocked by the reproduction
gate pinning `normalize`, turned out to be false and was settled by measuring:
the private corpus never exercised the case. That is the entry worth remembering,
because the reasoning that produced it was sound and the conclusion was wrong.
