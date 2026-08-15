# Evidence

Every language has been run past real published text. This page says what those
numbers are and what they are worth. [`gates/README.md`](../gates/README.md)
owns the detail, including where the evidence is thin.

| | Evidence | Result |
|---|---|---|
| `fr` | 2,409,504 characters: three OpenEdition journals and The Conversation France | 708 findings, 355 of them false and all from one check-only rule |
| `de-DE` | 2,393,884 characters: the BSI IT-Grundschutz-Kompendium 2023 | zero error-severity findings, 128 warnings, 18 of them mismatched quotation pairs |
| `es` | 1,106,553 characters: Spain's official gazette, the data protection agency's FAQ, 300 FundéuRAE articles | one false positive, and it is an English phrase quoted inside Spanish |
| `de-CH` | 698,683 characters: the Swiss Federal Constitution and 153 federal press releases | eight findings over 198 Swiss guillemet pairs, six of them real |

## Why published text and not unit tests

Unit tests measure whether a rule fires on text written to make it fire, which
is recall, which was never in doubt. Only prose somebody published without a
thought for this checker measures the failure mode these rules actually have,
which is the false positive.

That is also why the single most useful issue this project can receive is a
false positive report: text that was set correctly and that `typocheck`
complained about anyway. It is the one thing this repo cannot generate for
itself.

## The French row used to be the bad one

At `fr@0.1.0` it read 7,188 findings with 6,817 false, because
`fr.guillemet-open` and `fr.guillemet-close` rewrote the space inside every
guillemet to U+202F and both publishers use U+00A0. The rules were not finding a
defect; they were retyping correctly set French.

The fix was not to pick the other width. The citation turned out not to settle
the width at all, so `fr@0.2.0` rules only on what is wrong under either reading
and repairs in the width the document already uses. The same corpora now yield
103 guillemet findings, and each one is a breaking space, a doubled space or a
missing space. `fix --lang fr` is safe on well-set text.

The remaining 355 are one check-only rule,
`fr.missing-space-before-high-punctuation`, firing on English and Portuguese
titles in bibliographies. It ships as a `find` with no `fix` for exactly that
reason.

## The Spanish number is the one that went right

`es.unpaired-question`, the rule this package's whole shape was designed around,
met 332 correctly opened interrogatives and reported none of them. It also
produced the single false positive in the table, an English phrase quoted inside
Spanish.

## Two gates, and they measure different things

**Findings triage** runs the packs over professionally typeset text and counts
what they report. Sloppy text measures recall; typeset text measures the
false-positive rate, which is the actual failure mode.

**The French reproduction gate** is different in kind. The pack reproduces the
implementation it was extracted from byte for byte over 11,058 string fields,
827 of which that implementation rewrites. That is an equivalence claim over
translation output rather than a false-positive measurement over published
French.

The difference between them is the point, and the guillemet result is the proof.
The reproduction gate passed from the first commit, never once surfaced the
6,817 false positives, and still passes unchanged after the narrowing that fixed
them: its corpus never exercised the case that was wrong. **A reproduction gate
constrains a rule only where its corpus exercises it.** Measure before concluding
that a gate forbids a change.

## A zero is not automatically a result

A rule reports nothing either because the publisher set the text correctly or
because the text contained nothing it could match, and only the first is
evidence. So every gate report carries an `exposure` block counting the
characters that actually occurred, each corpus declares in `gates/corpora.json`
what it is there to expose the rules to, and the gate fails if the corpus does
not contain it.

## What is thin, stated rather than glossed

- Every `de-CH` quotation rule rests on one corpus. The Constitution contains no
  quotation mark and no apostrophe at all, so the federal press releases are the
  whole of that evidence. They were also thin, at 38 guillemet pairs against
  `de-DE`'s 1,063 curved quotes, until the corpus was taken to 153 documents and
  198 pairs on 2026-08-15; the single-publisher dependency is what remains.
- `de-CH` has no rule for a German `„Wort“` appearing in Swiss text, though it
  has one for the opposite direction.
- `de-CH.inward-guillemets` reads a footnote marker after a closing guillemet as
  a German-facing opening one. Once, in 698,683 characters, and it is check-only.
- The French reproduction baseline cannot be rebuilt by anyone but the
  maintainer, because it diffs against an implementation that is not published.
  It is quoted separately from the findings results everywhere in the repo for
  that reason.

## The corpora are rebuildable, and are not in the repo

`gates/sources/*.urls` freezes the document URLs and `scripts/fetch-corpus.ts`
turns them into text, so every number above is one somebody else can check rather
than one they have to believe. The text itself stays out of the repo: it is
third-party published work and this repository does not redistribute it.

Two workflows keep that honest, and they ask different questions. `Corpus links`
runs monthly against the publishers, so the claim in the previous paragraph fails
loudly when a document moves rather than quietly when a contributor tries.
`Corpus pins` runs when a rule or a corpus definition changes, rebuilds from the
archived captures the URL lists name, and re-measures: red there means the
numbers above no longer describe the text they were cut from. The French
reproduction baseline is the one exception to any of this, and `gates/README.md`
names it rather than averaging it away.
