# The release gates

Two gates, and they are **different in kind**. Conflating them is the mistake
this file exists to prevent.

| Gate | Language | Question | Script |
|---|---|---|---|
| Reproduction | `fr` | Does the pack produce byte-for-byte what the prior implementation produced? | `scripts/gate-fr-reproduction.ts` |
| Findings | `fr`, `de-DE`, `de-CH`, `es` | Run over real published text, how many findings, and how many are false? | `scripts/gate-findings.ts` |

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

A gate you cannot re-run is worth less than one you can, so all eight corpora are
rebuilt from frozen URL lists by `node scripts/fetch-corpus.ts`.

| Corpus | Language | Source |
|---|---|---|
| `openedition-journals-fr` | `fr` | 39 articles from three OpenEdition journals |
| `theconversation-fr` | `fr` | 43 articles from The Conversation France |
| `bsi-kompendium-2023-de` | `de-DE` | the BSI IT-Grundschutz-Kompendium 2023, DocBook XML |
| `boe-lopdgdd-2018-es` | `es` | Ley Orgánica 3/2018 from the Boletín Oficial del Estado |
| `aepd-faq-es` | `es` | the Spanish data protection agency's FAQ |
| `fundeu-rae-es` | `es` | 300 FundéuRAE articles |
| `fedlex-bv-2024-de-ch` | `de-CH` | the Swiss Federal Constitution, consolidated 2024 |
| `admin-ch-medien-de-ch` | `de-CH` | 37 Swiss federal press releases |

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

The monthly `Corpus` workflow rebuilds all eight and verifies them. Its first two
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
manufacturing 19 of the 25 `fr.space-before-colon` findings this corpus reported:
the same mistake nineteen times, by a CMS, in a corpus whose whole purpose is to
show what people who set French properly actually do. They are now removed at
extraction by the `drop` in `gates/corpora.json`, which costs 1,782 characters and
two genuine findings, both in a headline a callout reproduces. Which four
characters differ is still unknown, which is why the whole block goes rather than
the phrase alone.

That is also where this stops being closed. The pattern is anchored to the
callout's structure and its phrase together, and from a GitHub runner it matches
nothing at all: the rebuild that used to come back 76 characters short now comes
back 1,706 characters long, which is 19 callouts still being there, each of them
4 characters shorter than the ones this pattern was written against. So the four
characters are inside the callout markup rather than somewhere near it, and the
block served to a data centre is not the block served here. What it is instead is
not known. Guessing costs a rebuild per guess, so the next step is to measure it
rather than to widen the pattern until something matches.

The consequence for anyone rebuilding: `theconversation-fr` reproduces from a
connection that is served the callouts this repository was built against and does
not from one that is not. Matching seven of eight fingerprints from a data centre
is the expected result and is not evidence that anything upstream has changed. The
other seven match from everywhere.

Both of those were diagnosed at the granularity of a whole corpus, because a whole
corpus was all the committed evidence could describe. `gates/documents-*.json`
exists because of the second one: 76 characters somewhere in 43 documents is a
question the fingerprint poses and cannot answer. It answered it on its first use,
which is the argument for it. A rebuild that disagrees now prints the file name
and the delta, and the investigation is a line of CI output rather than a
hypothesis.

## What is committed, and what is not

The corpora are third-party published works and are not this repo's to
redistribute, so `gates/corpora/` is ignored. What is committed is:

- **`gates/sources/*.urls`**, a frozen list of document URLs, for each corpus
  that has one.
- **`scripts/fetch-corpus.ts`**, which turns a list into text.
- **`gates/findings-*.json`**, the per-rule counts, exposure counts, samples and
  a corpus fingerprint, for every corpus.
- **`gates/documents-*.json`**, a character count and a hash for each document in
  each corpus. Metadata about somebody else's text rather than the text, so it is
  this repo's to commit, and it is what makes a disagreement legible: the
  fingerprint says a corpus moved, and this says which of its 300 documents did.
  Written by `scripts/fetch-corpus.ts`, which prints the delta against it on
  every rebuild and **declines to rewrite it from a build that came back short** -
  regenerating it from an incomplete fetch would record the documents that failed
  to arrive as the new truth, which is the same trap as re-baselining a gate.

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
| `de-CH` | `fedlex-bv-2024-de-ch`: 722 no-break spaces, no quotation marks at all | `admin-ch-medien-de-ch`: 38 Swiss guillemet pairs |

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
| `fr.apostrophe` | 71 | 109 | true positives |
| `fr.space-before-colon` | 38 | 6 | true positives |
| `fr.space-before-high-punctuation` | 9 | 9 | true positives |
| `fr.guillemet-open` | 51 | 2 | true positives |
| `fr.guillemet-close` | 48 | 2 | true positives |
| `fr.mixed-no-break-space` | 2 | 0 | true positives |
| `fr.missing-space-before-high-punctuation` | 355 | 0 | **355 false** |
| `fr.straight-double-quote` | 6 | 0 | domain judgement |

708 findings, 355 of them false, and every false one from a single check-only
rule. Those are the numbers for `fr@0.2.0`.

The numbers for `fr@0.1.0` over the same corpora were **7,188 findings, 6,817
false**, left as they were measured, which was before the `theconversation-fr`
callouts were excluded. Everything else in this section is a property of the text
rather than of a pack version, so it is recomputed against the corpus as it now
stands. The next section is about what was between the two versions, because the
diagnosis is more useful than the totals.

### The guillemet rules fired on every guillemet in well-set French

At `fr@0.1.0`, `fr.guillemet-open` fired on all 3,305 opening guillemets in the
corpus and `fr.guillemet-close` on 3,254 of 3,255 closing ones. Not on a subset.
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
`fr.space-before-high-punctuation` converted a plain space before `; ! ?` to
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
- **Using both widths in one document**: reported by `fr.mixed-no-break-space`
  and never repaired, because *which* one to settle on is the author's call and
  on a near-even split harmonising would silently retype half the document.

The colon stayed a fixed U+00A0, because nothing about it is in dispute: the
Lexique specifies the word space and the corpora use it 2,450 times with no
counter-example.

The result is the table above. The guillemet rules now report 103 findings, which
is exactly the count of real defects in the row-by-row breakdown, and
`fr.mixed-no-break-space` reports 2, which is exactly the number of stray U+202F
in a corpus that is otherwise entirely U+00A0. `fix --lang fr` is safe on
well-set text.

Two things this cost, both worth stating. The pack id moved to `fr@0.2.0`, so
counts stamped `fr@0.1.0` are a different era and are not comparable. And
`gates/fr-reproduction.json` still reports 827 rewrites and **0 differences**:
the private corpus contains no guillemet the prior implementation had to
re-space, so the narrowing was invisible to the gate that appeared to forbid it.

### The 355 `fr.missing-space-before-high-punctuation` are all foreign titles

Every one is in `openedition-journals-fr`, and `theconversation-fr`, which has no
bibliography, produced none. Classified by the language of the surrounding
window: 311 English, and the remainder Portuguese, Spanish and English titles
carrying a French subtitle.

> `D'Aveni Richard A., Hypercompetition: managing the dynamics of strategic maneuvering`
>
> `Notícias automatizadas: A evolução que levou o jornalismo a ser feito por não humanos`

An English or Portuguese book title inside a French bibliography is set to its
own language's rules, correctly, and French spacing does not govern it. This is
the same false positive `es.unpaired-question` produced against an English phrase
quoted inside Spanish, at 355 times the volume, and it says the same thing: the
unit these rules operate on is not reliably monolingual. The rule already ships
as `find` with no `fix`, which is the outcome that matters, and this corpus is
the evidence that the decision was right rather than cautious.

### The 368 findings that are real

`fr.apostrophe` fired 180 times on a straight apostrophe between two letters in
documents that use U+2019 everywhere else, including once in a sentence carrying
both forms. `fr.space-before-colon` fired 63 times on a plain breaking space
before a colon, and `fr.space-before-high-punctuation` 20 times on a breaking
space before `; ! ?`. The guillemet rules account for 103 and
`fr.mixed-no-break-space` for 2. All of them are genuine, and all but the last
two are fixable.

The six `fr.straight-double-quote` are foreign words quoted inside brackets in
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
| `de.apostrophe` | 0 | fixable, silent over 2.4M characters |
| `de.space-before-punctuation` | 0 | silent over 647 colons |
| `de.straight-double-quote` | 128 | mixed, see below |
| `de-DE.low-quote-space` | 0 | fixable, silent over 544 low quotes |
| `de-DE.guillemet-open-space` | 0 | fixable, no exposure |
| `de-DE.guillemet-close-space` | 0 | fixable, no exposure |
| `de-DE.outward-guillemets` | 0 | no exposure |

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
   same false positive `fr.missing-space-before-high-punctuation` produces at
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
entry is a question, and it is the only material that puts `es.unpaired-question`
in front of correctly opened interrogatives at any volume.

| Rule | BOE | AEPD | Fundéu | Exposure across the three |
|---|---|---|---|---|
| `es.guillemet-open-space` | 0 | 0 | 0 | 1,068 opening guillemets |
| `es.guillemet-close-space` | 0 | 0 | 0 | 1,066 closing guillemets |
| `es.opening-mark-space` | 0 | 0 | 0 | 370 `¿`, 1 `¡` |
| `es.unpaired-question` | 0 | 0 | **1** | 370 `¿`, 370 `?` |
| `es.unpaired-exclamation` | 0 | 0 | 0 | 1 `¡`, 1 `!` |
| `es.space-before-punctuation` | 0 | 0 | 0 | 287 `;`, 415 `:` |
| `es.straight-double-quote` | 0 | **162** | 0 | 162 straight quotes |

### The one `es.unpaired-question`, which is the finding the design turns on

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

### The 162 `es.straight-double-quote`, which split cleanly in two

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

## `de-CH`, reviewed 2026-08-09 against two corpora

311,131 characters. Swiss German is not a dialect note here: Switzerland sets
`«Wort»` where Germany sets `»Wort«`, and drops the eszett, so this is a separate
pack and it needs separate evidence.

| Corpus | What it is | Values | Characters |
|---|---|---|---|
| `fedlex-bv-2024-de-ch` | Swiss Federal Constitution, German, consolidated 2024 | 1 | 199,319 |
| `admin-ch-medien-de-ch` | 37 press releases of the Swiss federal administration | 37 | 111,812 |

**Every rule fired zero times over both.** The exposure is what makes that
readable:

| Rule | Findings | Exposure |
|---|---|---|
| `de.apostrophe` | 0 | 23 `’`, 2 straight apostrophes |
| `de.space-before-punctuation` | 0 | 660 `;`, 183 `:` |
| `de.straight-double-quote` | 0 | no straight double quotes at all |
| `de-CH.guillemet-open-space` | 0 | 38 `«` |
| `de-CH.guillemet-close-space` | 0 | 38 `»` |
| `de-CH.inward-guillemets` | 0 | 38 `»`, none of them opening |

The Constitution contributes 722 no-break spaces and not one quotation mark,
which is precisely why it is not the only Swiss corpus. The press releases
contribute the guillemets: 38 pairs, correctly set, none of them German-facing.

This is the weakest of the four language reviews and saying so is the point. 38
guillemet pairs is an order of magnitude less exposure than German's 1,063 curved
quotes or Spanish's 1,068 guillemets, so `de-CH`'s quotation rules are evidenced
rather than well evidenced. A Swiss corpus with heavier quotation would improve
it.

## Gaps the corpora found and the packs do not close

**`de-CH` has no rule for `„Wort“`.** `admin-ch-medien-de-ch` contains one `„`,
the German low quote, in Swiss federal text. `de-CH.inward-guillemets` catches
the other direction, a German `»Wort«` appearing in Swiss text, but there is no
`de-CH` rule for the low quote. The asymmetry is not deliberate and the corpus is
what surfaced it. Adding the rule is a judgement about `de-CH`'s scope rather
than a bug fix, so it is recorded here rather than made quietly.

**`de-CH`'s quotation exposure is thin**, as the section above says: 38 pairs
against `de-DE`'s 1,063 marks. This is a corpus problem rather than a rule
problem, and it is the one place where a zero in this file should be read as
weaker evidence than the other zeros.

### Closed

**The French guillemet rules**, which normalised U+00A0 to U+202F and accounted
for 6,462 of the `fr@0.1.0` gate's 7,188 findings. Closed in `fr@0.2.0` by
`conformRule`: the rules now fire only on spacing that is wrong under either
reading of the citation, and repair in the width the document already uses. The
worry recorded here at the time, that the change was blocked by the reproduction
gate pinning `normalize`, turned out to be false and was settled by measuring:
the private corpus never exercised the case. That is the entry worth remembering,
because the reasoning that produced it was sound and the conclusion was wrong.
