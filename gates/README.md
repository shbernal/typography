# The release gates

Two gates, and they are **different in kind**. Conflating them is the mistake
this file exists to prevent.

| Gate | Language | Question | Script |
|---|---|---|---|
| Reproduction | `fr` | Does the pack produce byte-for-byte what the prior implementation produced? | `scripts/gate-fr-reproduction.ts` |
| Findings | `de-DE`, `de-CH`, `es` | Run over real published text, how many findings, and how many are false? | `scripts/gate-findings.ts` |

French has a prior implementation with output already in a corpus, so its gate is
a diff against something that exists. German and Spanish have neither, so there
is nothing to diff and the gate is a triage: read every finding class, decide
true or false, record the counts.

```
node scripts/fetch-corpus.ts            # build the corpora from frozen URL lists
node scripts/gate-fr-reproduction.ts --verify
node scripts/gate-findings.ts --verify
```

Neither runs in CI, because two of the corpora live in a private working tree
and the rest are several megabytes of somebody else's text.

## Four of the six corpora are rebuildable, and two are not

Say which, because a gate you cannot re-run is worth less than one you can and
the difference should not have to be discovered.

| Corpus | Rebuildable | How |
|---|---|---|
| `boe-lopdgdd-2018-es` | yes | `node scripts/fetch-corpus.ts` |
| `aepd-faq-es` | yes | same |
| `fundeu-rae-es` | yes | same |
| `fedlex-bv-2024-de-ch` | yes | same |
| `admin-ch-medien-de-ch` | yes | same |
| `grundschutz-2023-de` | **no** | a `registry.sqlite3` in a private consumer tree, resolved against `--consumer` |

The French reproduction gate is in the second category too: its baseline is the
prior implementation and the corpora it ran over, both of which live in the same
private tree.

Two names appear here and they are different things.
[`translation-harness`](https://github.com/shbernal/translation-harness) is the
public tool whose `job.normalize` a pack satisfies structurally, and no code in
this repo imports it. `translation-agents` is a private working tree that happens
to hold registries in that tool's format, and it is the only thing `--consumer`
ever points at. Nothing public depends on the second.

So off the maintainer's machine, `pnpm corpus && node scripts/gate-findings.ts
--verify` reproduces `es` and `de-CH` in full and reports `grundschutz-2023-de`
as absent, and the French gate cannot run at all. That is a real limit on what an
outside contributor can check, and the honest thing is to state it rather than
let a failing gate imply a broken checkout. An unrun gate said plainly is fine.

`grundschutz-2023-de` stays where it is because the BSI publishes the
Kompendium as a document set rather than as pages a URL list could freeze, and
the registry is where it was already extracted and aligned. Moving it into the
`fetch` shape is a task, not a decision.

## What is committed, and what is not

The corpora are third-party published works and are not this repo's to
redistribute, so `gates/corpora/` is ignored. What is committed is:

- **`gates/sources/*.urls`**, a frozen list of document URLs, for each corpus
  that has one.
- **`scripts/fetch-corpus.ts`**, which turns a list into text.
- **`gates/findings-*.json`**, the per-rule counts, exposure counts, samples and
  a corpus fingerprint, for every corpus including the two that are not
  rebuildable.

That combination is deliberate. A gate whose corpus cannot be rebuilt is a number
nobody else can check, and a gate that ships the corpus is a redistribution
problem. Where the list is frozen, anyone can rebuild and compare fingerprints;
where it is not, the fingerprint is at least enough to tell the maintainer that
the corpus moved. Either way every release after the first reviews a **delta**: a
rule change that moves German findings over a fixed corpus from 34 to 210 shows
up in a diff instead of in a user's inbox.

The extraction from HTML is load-bearing rather than incidental. This package's
whole subject is characters that are invisible on screen, so the reader collapses
only the ASCII space and tab, decodes entities in full, and turns block tags into
newlines. Anything that normalised whitespace would quietly delete the evidence,
and anything that stripped tags without a separator would weld two words together
and manufacture a finding the publisher never wrote.

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
| `es` | `boe-lopdgdd-2018-es`, `fundeu-rae-es` | `aepd-faq-es`: 332 correctly opened interrogatives |
| `de-CH` | `fedlex-bv-2024-de-ch`: 722 no-break spaces, no quotation marks at all | `admin-ch-medien-de-ch`: 38 Swiss guillemet pairs |

## `de-DE`, reviewed 2026-08-09 against `grundschutz-2023-de`

BSI IT-Grundschutz-Kompendium 2023, German source text: 8,500 values, 986,380
characters, published by a federal agency and edited to a house standard. This is
the corpus that is **not** rebuildable from a URL list; see the table above.

**Every error-severity rule fired zero times.** All 13 findings came from one
warning-level rule, and the corpus contains exactly 13 straight double quotes, so
that rule fired on all of them.

| Rule | Findings | Verdict |
|---|---|---|
| `de.apostrophe` | 0 | fixable, silent on a million characters |
| `de.space-before-punctuation` | 0 | silent over 132 colons |
| `de.straight-double-quote` | 13 | mixed, see below |
| `de-DE.low-quote-space` | 0 | fixable, silent over 85 low quotes |
| `de-DE.guillemet-open-space` | 0 | fixable, no exposure |
| `de-DE.guillemet-close-space` | 0 | fixable, no exposure |
| `de-DE.outward-guillemets` | 0 | no exposure |

The 13 fall into three classes:

1. **A genuinely mismatched pair.** `Metadaten („Labels")` opens with U+201E and
   closes with a straight quote. Unambiguous defect, in edited federal text,
   found by the rule that was hardest to justify. This one finding is most of
   what the gate bought.
2. **A quotation mark that should be German.** `"P-A-P"-Struktur`. True positive.
3. **A quoted code identifier**: `"default"-Service-Account`, `"-all" Parameter`.
   Typographically German would set these with `„ “`, and many house styles keep
   straight quotes around literals. This is the domain judgement rather than the
   language one, and it is why the rule is a **warning** and is not fixable.

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

This is the weakest of the three language reviews and saying so is the point. 38
guillemet pairs is an order of magnitude less exposure than German's 167 curved
quotes or Spanish's 1,068 guillemets, so `de-CH`'s quotation rules are evidenced rather than
well evidenced. A Swiss corpus with heavier quotation would improve it.

## One gap the corpus found and the packs do not close

`admin-ch-medien-de-ch` contains one `„`, the German low quote, in Swiss federal
text. `de-CH.inward-guillemets` catches the other direction, a German `»Wort«`
appearing in Swiss text, but there is no `de-CH` rule for `„Wort“`. The asymmetry
is not deliberate and the corpus is what surfaced it. Adding the rule is a
judgement about `de-CH`'s scope rather than a bug fix, so it is recorded here
rather than made quietly.
