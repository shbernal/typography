# The release gates

Two gates, and they are **different in kind**. Conflating them is the mistake
this file exists to prevent.

| Gate | Language | Question | Script |
|---|---|---|---|
| Reproduction | `fr` | Does the pack produce byte-for-byte what the prior implementation produced? | `scripts/gate-fr-reproduction.ts` |
| Findings | `de-DE`, `es`, `de-CH` | Run over real published text, how many findings, and how many are false? | `scripts/gate-findings.ts` |

French has a prior implementation with output already in a corpus, so its gate is
a diff against something that exists. German and Spanish have neither, so there
is nothing to diff and the gate is a triage: read every finding class, decide
true or false, record the counts.

Both run against corpora that are not this repo's to redistribute. What is
committed is **counts and a fingerprint**, never text, so the review artefact for
every release after the first is a *delta*. A rule change that moves German
findings over a fixed corpus from 34 to 210 shows up in a diff instead of in a
user's inbox.

```
node scripts/gate-fr-reproduction.ts --verify
node scripts/gate-findings.ts --verify
```

Neither runs in CI, because neither corpus is on a runner.

## The corpus has to be well set, and that is the whole subtlety

The instinct is to grab whatever prose is handy. Sloppy text is the wrong input:
nearly every finding on it is a true positive, which measures **recall**, which
nobody doubts. A regular expression that spots a straight apostrophe spots
straight apostrophes.

In professionally typeset text **every finding is a suspected false positive by
construction**. That is the failure mode these rules actually have, and the only
one that stays invisible until the checker meets prose somebody did not write to
exercise it.

## `de-DE`, reviewed 2026-08-09 against `grundschutz-2023-de`

BSI IT-Grundschutz-Kompendium 2023, German source text: 8,500 values, 986,380
characters, published by a federal agency and edited to a house standard.

**Every error-severity rule fired zero times.** All 13 findings came from one
warning-level rule.

| Rule | Findings | Verdict |
|---|---|---|
| `de.apostrophe` | 0 | fixable, silent on a million characters |
| `de.space-before-punctuation` | 0 | silent |
| `de.straight-double-quote` | 13 | mixed, see below |
| `de-DE.low-quote-space` | 0 | fixable, silent |
| `de-DE.guillemet-open-space` | 0 | fixable, silent |
| `de-DE.guillemet-close-space` | 0 | fixable, silent |
| `de-DE.outward-guillemets` | 0 | silent |

The 13 fall into three classes:

1. **A genuinely mismatched pair.** `Metadaten („Labels")` opens with U+201E and
   closes with a straight quote. Unambiguous defect, in edited federal text,
   found by the rule that was hardest to justify. This one finding is most of
   what the gate bought.
2. **A quotation mark that should be German.** `"P-A-P"-Struktur`. True positive.
3. **A quoted code identifier**: `"default"-Service-Account`, `"-all" Parameter`.
   Typographically German would set these with `„ "`, and many house styles keep
   straight quotes around literals. This is the domain judgement rather than the
   language one, and it is why the rule is a **warning** and is not fixable.

Zero false positives at error severity over a million characters is the number
this gate existed to produce.

## What is missing, and it blocks the release rather than the build

- **`es` has no corpus anywhere.** Nothing in this repo or the consumer holds
  Spanish. The Spanish rules, including `es.unpaired-question` which is the rule
  the whole package's design turns on, have never been run past real published
  Spanish. Sourcing a few thousand words of professionally typeset Spanish is a
  task, not a decision, and it is the one prerequisite outside this repo.
- **`de-CH` has no corpus.** Its rules are `de-common` plus two guillemet rules,
  so the German review above covers most of it, and "most of it" is not a gate.

Note what does *not* qualify: a plain-text transcription. Those flatten the
typography on the way in, which turns a false-positive test into a recall test
and quietly answers the wrong question.
