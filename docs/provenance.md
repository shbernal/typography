# Provenance

Where each shipped style's defaults came from, and the measurements that shaped
them. `cite` records provenance on a rule and no longer decides whether the rule
may exist; this page is the same thing one level up, for the style.

The numbers below were cut from nine corpora of published text, 5.8M characters,
which this repository no longer carries. They left with the corpus gate, because
the question changed. The gate asked "does this rule misfire on text a
professional already set correctly", which is answered here and does not need
re-asking. What the project asks now is "do twelve generations of the same
content come back with the same typography", and no corpus of published text can
answer that. `audit` in [`compose.ts`](../src/compose.ts) does.

## The sources

| Style | Where its defaults come from |
|---|---|
| `en` | *The Chicago Manual of Style* (17th ed., 2017) and *New Hart's Rules* (Oxford, 2014), where they agree |
| `fr` | Imprimerie nationale, *Lexique des règles typographiques* (2002) |
| `es` | RAE, *Ortografía de la lengua española* (2010) |
| `de-DE`, `de-CH` | *Duden, Die deutsche Rechtschreibung*, Richtlinien |
| `nl` | Nederlandse Taalunie, *Technische Handleiding* (oktober 2016), and Taaladvies.net (Taalunie, INT, Onze Taal) |

Three of those are weaker than they look, and all three weaknesses are
load-bearing:

- **English has no standards body at all**, so `en` is the one style here whose
  row names two sources and a stance between them. It ships the intersection: a
  rule exists only because both manuals state it, and where they diverge the
  style either reports without repairing or has no rule. The serial comma is the
  divergence everybody asks about and it is absent for that reason, not for the
  older one about national standards. Two consequences for whoever changes these
  rules next. Citations here name a topic rather than a section, because the two
  manuals number differently and a paragraph reference would be half the source;
  and the 18th edition of Chicago (2024) supersedes the one cited, which the
  topic-level citations survive but which is worth checking against before
  adding a rule.
- **The Lexique does not fix the width of the no-break space inside a
  guillemet.** It typesets its own guillemets with U+202F and its own table at
  p.149 specifies U+00A0; French practice outside Switzerland has settled on
  U+00A0 and Swiss practice prescribes U+202F. So `fr` rules only on spacing that
  is wrong under both readings, and repairs in the width the text already uses.
- **Taaladvies states that its advice has "geen kracht van wet of ander bindend
  karakter".** It is cited anyway, because the Technische Handleiding is a
  spelling standard and rules on neither spacing nor quotation marks, which makes
  Taaladvies the most authoritative statement that exists on Dutch punctuation.
  The corpus those rules were measured against was published by the same body, a
  circularity worth naming rather than one worth hiding.

None of this is authority the library claims. A style is a named bundle of rules
with opinionated defaults, and any of them can be dropped, replaced or added to
by whoever composes one. The table says where a default came from so that a user
overriding it knows what they are overriding.

## The measured constraints

Each of these is written into the comment above the rule it constrains, which is
where it belongs. It is repeated here because every one of them reads from the
code like a needless complication and every one of them was paid for with a
corpus.

| Constraint | What it costs to lose |
|---|---|
| `apostrophe` requires a letter on **both** sides ([`rules/apostrophe.ts`](../src/rules/apostrophe.ts)) | 22 of the 24 straight apostrophes in 698,683 characters of federal Swiss German are thousands separators. A rule matching a straight apostrophe anywhere reports `Z'graggen`, and also repairs `100'000` into `100’000`. |
| `apostrophe-elision` needs a closed clitic set plus a following boundary ([`rules/apostrophe-elision.ts`](../src/rules/apostrophe-elision.ts)) | Widening either one turns it into a rule that retypes the opening quotation mark of any quoted word beginning with s, t, n, k, m or r. |
| The spacing rules around `; : ! ?` run behind `looksMachine` ([`prose.ts`](../src/prose.ts)) | They fire on `a ? b : c` and on query strings. Under this project's input, generated text, that filter is more load-bearing than it was, not less. |
| Guillemet inner spacing matches only what is wrong under both readings of the Lexique ([`rules/inner-space.ts`](../src/rules/inner-space.ts)) | 6,817 false positives against 103 real defects, over 2.4M characters of correctly set French. `admissible` is the one field that holds this, and `withWidth` widens it deliberately, for a caller who has stated a width. |
| The space before a colon stays U+00A0 under every width ([`rules/colon-spacing.ts`](../src/rules/colon-spacing.ts)) | Nothing about that position is in dispute: the Lexique specifies the word space and the corpora used it 2,458 times against no counter-example. Imposing U+202F there would be a style asserting what its citation does not fix, in the one place the citation is explicit. |
| Every guillemet rule declines a mark with a letter or a digit on its outside ([`rules/inner-space.ts`](../src/rules/inner-space.ts)) | `«` opens a quotation in French, Spanish and Swiss German and closes one in Germany. Without the guard, `es.normalize('Er sagte »Wort« und ging.')` deleted both spaces and welded two pairs of words; `fr` re-spaced the same sentence as though it were French. What it costs is `mot«cite»mot`, the one string the two readings share. |

The last row is the one constraint here that no corpus produced, and it could not
have: each corpus was one publisher writing one language correctly, so a rule
that misreads *another* language's marks has nothing in any of them to fire on.
Both instances were found by reading the rules side by side, and the shape they
have in common is [`test/fixtures.ts`](../test/fixtures.ts)'s `MIXED` group now.

And one ceiling rather than a narrowing. **U+2019 is the closing single quote and
the apostrophe at once**: the Technische Handleiding contains 537 of them and the
opening marks pair with 144, so 393 are apostrophes. Any conversion of `‘…’`
into `“…”` retypes those 393. This is why the ballot generalizes and the
imposer does not: `withWidth` can impose a space width because the repair is a
substitution, and a `withStyle` imposing a quotation system cannot exist.

## Why eleven of the nineteen rule ids have no fix

Eleven of them ship without a `fix` in at least one style, because the repair
needs information the pattern does not have, and in three languages
independently the missing information was the same one: **the unit these rules
run over is not reliably monolingual.**

- 355 `missing-punctuation-space` findings in a French bibliography, every one an
  English or Portuguese book title set correctly to its own language's rules.
- The single `unpaired-question` false positive in 1.1M characters of Spanish:
  `What's your name?` quoted inside a Spanish sentence. Inserting the `¿` the
  rule wants would be actively wrong.
- One `punctuation-spacing` finding in Swiss German, on a French document title
  in an attachment list.

The published pages mark those as foreign with italics, and the checker sees text
with the markup already stripped, so the one signal that resolves them is exactly
the one that does not survive. A host that still has the markup should not expect
the library to have it too.

`straight-double-quote` is check-only for a different reason and it recurred just
as reliably: the straight quotes in published Spanish and German split between
prose, where the standard's marks are right, and quoted UI labels, menu paths,
domain names and identifiers, where they are not. That split is between the
domain and the language rather than between right and wrong, so the rule is a
warning that reports and does not repair.

`double-hyphen` is the third reason and the newest, and no corpus is behind it:
the two English manuals disagree about what replaces `--`, Chicago closing an em
dash up and Oxford setting a spaced en dash, so either repair retypes text that
is correct under the other. It has the domain hazard as well, since `--` between
two letters is a dash in prose and a modifier in a stylesheet, but the citation
would have stopped the repair on its own.

## What the corpora were

Nine corpora, chosen on one bar: professionally typeset text nobody wrote with
this checker in mind, so that every finding is a suspected false positive by
construction. Sloppy text would have measured recall, which was never in doubt.

| Style | Corpus | Result |
|---|---|---|
| `fr` | 2,409,504 characters: 39 articles from three OpenEdition journals, 43 from The Conversation France | 708 findings, 355 false and all from one check-only rule |
| `de-DE` | 2,393,884 characters: the BSI IT-Grundschutz-Kompendium 2023, from the agency's DocBook XML | zero error-severity findings; 128 warnings, 18 of them mismatched quotation pairs in edited federal text |
| `es` | 1,106,553 characters: Ley Orgánica 3/2018 from the Boletín Oficial del Estado, the AEPD's FAQ, 300 FundéuRAE articles | one false positive, the English phrase above; 332 correctly opened interrogatives and no complaint about any of them |
| `nl` | 880,407 characters: 300 Taaladvies.net advice articles | twelve findings, all twelve real, ten of them one word-initial smart-quote defect in the Taalunie's own prose |
| `de-CH` | 698,683 characters: the Swiss Federal Constitution and 153 federal press releases | eight findings, six real, including French guillemet spacing inside Swiss German quotation marks |

A tenth gate reproduced `fr.normalize` byte for byte against the private
implementation `fr` was extracted from, over 11,058 string fields of which that
implementation rewrites 827. It could never run outside the maintainer's machine,
and it is deleted with the rest.

**`en` has no row here and will not get one.** It shipped after the corpora left,
so it is the first style measured only by the fixtures and the three properties.
That is the standard every style is held to now and it is not the same standard:
the corpora answered whether a rule misfires on text somebody already set
correctly, and nothing in the current suite asks that question of English. The
rules most exposed to it are the two that convert U+2018 in a position a
quotation can also open in. A document setting quotations with the single pair
and opening one on a clitic or a figure is what would break them, which is to say
`‘tis the season’` and `‘90s revival’` as quotations rather than as elisions.
Both are narrow enough that no fixture holds one, and narrow is not the same as
absent: the closed clitic set and the required boundary are what keep the odds
that low, and neither has been checked against a corpus.

Two things those measurements established that outlive them:

- **A zero is not automatically a result.** A rule reports nothing either because
  the publisher set the text correctly or because the text contained nothing it
  could match, and only the first is evidence. Two Dutch rules, `ij-capital` and
  `apostrophe-after-symbol`, have never met a line of published Dutch containing
  anything they could match. Their zeros were vacuous then and are vacuous now.
- **A reproduction gate constrains a rule only where its corpus exercises it.**
  The French narrowing above looked blocked by the reproduction gate, which pins
  `normalize` byte for byte. It was not: that corpus contains no guillemet the
  prior implementation had to re-space, so the narrowing was invisible to the
  gate that appeared to forbid it. The reasoning was sound and the conclusion was
  wrong, and measuring was what settled it.
