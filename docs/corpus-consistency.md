# Corpus consistency: French, and the width of a no-break space

For a host normalizing one file at a time, nothing here applies. This page is
for a host that normalizes many values which have to be consistent **with each
other**: a translation registry, a CMS, a string catalogue.

## The problem

The `Lexique` does not fix a width for the no-break space inside a guillemet.
It typesets its own guillemets with the fine space (U+202F) and specifies the
word space (U+00A0) in its own table at p.149, and Swiss practice prescribes the
fine one. So `fr` does not assert a width. It rules on the spacing that is wrong
under either reading and repairs in whichever no-break space the value already
uses. [design.md](design.md) has why.

That decision is made per value, and the value is whatever the caller passed.
For `typocheck` that is a whole file, which is the right grain. For a host
passing one field at a time it is one field, which is also the right grain, and
it is not the same grain:

```ts
fr.normalize(`«${NO_BREAK}oui${NO_BREAK}»`);        // unchanged
fr.normalize(`«${NARROW_NO_BREAK}non${NARROW_NO_BREAK}»`);  // unchanged
```

Both rows are correct. Together they are a corpus that splits, and nothing in
`fr` compares two rows. `fr.mixed-no-break-space` is the right rule at the wrong
scope: its survey runs within one value, so it never sees the second row.

## The two functions

```ts
import { fr, surveyWidth, withWidth } from '@shbernal/typography/fr';
```

They are deliberately two rather than one. `surveyWidth` reports and
`withWidth` acts on the report, and keeping them apart is the same stance the
pack takes everywhere else: this package can say what a corpus does, and it
cannot say what a corpus should do.

### `surveyWidth(values)`

Folds the ballot across many values.

```ts
const survey = surveyWidth(rows.map((r) => r.fr));

survey.full;           // positions spelled U+00A0
survey.narrow;         // positions spelled U+202F
survey.verdict;        // the width the corpus settles on
survey.minority;       // the width it uses but did not settle on, or null
survey.minorityCount;  // how many positions are in the minority width
```

`minority === null` is the answer you want: the corpus already uses at most one
width and there is nothing to do. Otherwise `minorityCount` is the size of the
problem, and it is the number to look at before reaching for `withWidth`,
because harmonizing rewrites text that is correct.

This is the same ballot as the per-value one rather than a second implementation
of it. The tally is additive, so summing per-value tallies is exactly tallying
the concatenation, and a host cannot drift from the pack the way a
reimplementation would the first time a rule changed.

### `withWidth(width)`

Returns a French pack that spells one width at every position where the width
was ever in question. The intended sequence is survey, decide, then normalize
everything under the one verdict:

```ts
const survey = surveyWidth(values);
if (survey.minority !== null) {
  console.warn(`${survey.minorityCount} positions in the minority width`);
}

const house = withWidth(survey.verdict);   // or a width you have chosen outright
const settled = values.map((v) => house.normalize(v));
```

`fr` itself is untouched. `withWidth` returns a new pack, so every other host
keeps the per-value behaviour exactly as it was.

It throws on any width other than U+00A0 and U+202F. U+2009 is the reason: it is
the right width and it breaks lines, so a host that imposed it would be writing a
defect into every value it owns.

## Four things about `withWidth` that are not obvious

### The colon keeps U+00A0 under either width

The positions it imposes on are the three on the ballot: inside an opening
guillemet, inside a closing one, and before `; ! ?`. They are the three because
they are exactly what the ballot counts, so a corpus normalized here is
consistent by the same measure `surveyWidth` reported it as split by.

The space before a colon is not one of them and does not become one. It is the
one position where nothing is in dispute: the Lexique specifies the word space,
and both corpora use it 2,458 times against no counter-example. So
`withWidth(NARROW_NO_BREAK)` gives you `«<NNBSP>oui<NNBSP>»` and `voila<NNBSP>!`
and still `dit<NBSP>:`, which looks like an exception and is the rule. Imposing
U+202F there would be this pack asserting what its citation does not fix, in the
one function whose whole subject is the difference between those two things.

### It rebuilds the patterns, and it has to

The obvious implementation is to pin `conformRule`'s `choose` to a constant. That
does not work, and it fails silently, which is worse.

The shipped patterns carry `CORRECT_AFTER_OPEN` and `CORRECT_BEFORE_CLOSE`,
lookaheads whose entire job is to exclude *both* correct spellings. That
exclusion is the narrowing that took French from 6,817 false positives to 103.
The rows that split a corpus are correct-in-the-other-width, so the shipped
patterns never match them and `choose` is never consulted. A width imposed by
pinning `choose` is a no-op on precisely the rows it was reached for.

So `withWidth` drops the exclusion and takes each space run unconditionally. That
is `fr@0.1.0` behaviour, re-admitted on purpose and reachable only through this
function, where a host has stated the width. It is still linear: each run is
anchored so it is a candidate once, and there is still one way to match it.
`test/perf.test.ts` measures both derived packs alongside the four registry ones.

### The id is a different era stamp

```ts
withWidth(NO_BREAK).id;         // 'fr@0.2.0+house-00A0'
withWidth(NARROW_NO_BREAK).id;  // 'fr@0.2.0+house-202F'
```

A corpus normalized by this pack has had correct text retyped into the imposed
width. One normalized by `fr` has not. Those are two typography eras by exactly
the argument that separates `fr@0.1.0` from `fr@0.2.0`, and a stamp that read
`fr@0.2.0` on both would say the two corpora were set the same way. If you store
the stamp with the corpus, this is the part that keeps it honest.

### `fr.mixed-no-break-space` is not in the derived pack

Its whole content is that choosing a width is the author's call, and calling
`withWidth` is the author making it. It would also be a lie in the report: it is
check-only, so every finding carries `fixable: false`, while this pack's
`normalize` repairs every position it detects. Nothing is lost by dropping it,
because the three conform rules cover the same three ballot positions exactly:
inside an opening guillemet, inside a closing one, and before `; ! ?`.

The colon is on none of those lists. It has a fixed width by citation, it does
not vote, and imposing a width does not move it.

## When not to use this

If your values are whole documents, use `fr`. Per-value is the correct grain,
and a document is entitled to its own width.

If `surveyWidth` reports `minority === null`, do nothing. The corpus is already
consistent and `withWidth` would rewrite nothing, but you would have stamped it
with an era it did not need.
