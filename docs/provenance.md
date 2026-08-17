# Provenance

Where each shipped style's defaults came from, and the measurements that shaped
them. `cite` records provenance on a rule and no longer decides whether the rule
may exist; this page is the same thing one level up, for the style.

Most of the numbers below were cut from nine corpora of published text, 5.8M
characters, which this repository no longer carries. They left with the corpus
gate, because the question changed. The gate asked "does this rule misfire on
text a professional already set correctly", which is answered here and does not
need re-asking. What the project asks now is "do twelve generations of the same
content come back with the same typography", and no corpus of published text can
answer that. `audit` in [`compose.ts`](../src/compose.ts) does.

The rest are from two runs made after they left, and neither is a gate either.
One is over 6.7M characters of English, because `en` shipped too late to have a
corpus and was the only style with no false-positive measurement at all. The
other is 976k characters of Dutch statute, because `nl` was the thinnest-measured
style and its one corpus was published by the body that wrote its citations. Both
are recorded in the last two sections.

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
| `apostrophe-elision` needs a closed clitic set plus a following boundary ([`rules/apostrophe-elision.ts`](../src/rules/apostrophe-elision.ts)) | Widening either one turns it into a rule that retypes the opening quotation mark of any quoted word beginning with s, t, n, k, m or r. Measured in English: 255 quotations opened with the single pair, 37 of them on a word beginning `t` or `e`, and the boundary declined every one. |
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

Two things those measurements established that outlive them:

- **A zero is not automatically a result.** A rule reports nothing either because
  the publisher set the text correctly or because the text contained nothing it
  could match, and only the first is evidence. Two Dutch rules, `ij-capital` and
  `apostrophe-after-symbol`, had never met a line of published Dutch containing
  anything they could match; a second Dutch corpus and 976k characters later,
  they still effectively have not, and the Dutch section below says what it cost
  to find that out. The English run produced two more of them.
- **A reproduction gate constrains a rule only where its corpus exercises it.**
  The French narrowing above looked blocked by the reproduction gate, which pins
  `normalize` byte for byte. It was not: that corpus contains no guillemet the
  prior implementation had to re-space, so the narrowing was invisible to the
  gate that appeared to forbid it. The reasoning was sound and the conclusion was
  wrong, and measuring was what settled it.

## The English run

`en` shipped after the corpora left, with no row in the table above and the
question they asked never put to it. It has been put now, once, over ten Project
Gutenberg books: Frankenstein, The Great Gatsby, Jekyll and Hyde, Moby-Dick, On
the Origin of Species, Pride and Prejudice, Relativity, The Principles of
Scientific Management, The Wealth of Nations and The Yellow Wallpaper.
6,658,520 characters after the Project Gutenberg licence wrapper is cut off each
one, which is otherwise the same 19,000 characters counted ten times.

**This is a recorded measurement and not a gate.** The books are official
Project Gutenberg EPUB3 downloads, they are not committed, and nothing in
`pnpm check` re-runs any of it. It is here for the same reason the rows above
are: to say what the defaults were held against, so that whoever changes a rule
knows what the change is walking away from.

**Rerunnable, unlike the nine corpora.** The books and the four scripts that
produced every number below sit untracked and gitignored under `.tmp/`, with the
`.source.md` sidecar each EPUB was downloaded with: landing page, exact URL,
retrieval date and SHA-256, so a copy can be checked against what was measured.
`.tmp/README.md` is the entry point, and the one to read first is `census.ts`,
which is what makes the zeros here mean anything.

| What | Result |
|---|---|
| `check` over all ten | 371 findings, and 366 of them in one book |
| False positives | zero |
| `audit` over all ten | zero violations: idempotence, conformance and non-interference all hold on 6.6M characters of real prose |

The one book is *The Principles of Scientific Management*, which Gutenberg ships
as XHTML wrapped around its plain-text edition: no U+2019 anywhere in it, no
curly double quote, 117 straight apostrophes and 271 straight double quotes. So
its 366 findings are the recall half rather than the precision half, and they are
all real. The other five are an artefact of the extraction rather than of the
book: *Relativity* sets its inline formulae as images, and stripping an `<img>`
out of `been <img/>; this` leaves a space in front of a semicolon that no reader
of the book ever saw.

**The zeros that are evidence.** A rule reports nothing either because the text
was set correctly or because it held nothing to match, so each rule was counted
against the correct spelling of its own position:

| Rule | Reached | Reported |
|---|---|---|
| `apostrophe` | 5,204 correctly set U+2019 between letters | 95, all real |
| `apostrophe-elision` | 67 correct `’tis` / `’twas` / `’em`, and 255 quotations opened with the single pair, 37 of them on a word beginning `t` or `e` | none |
| `straight-double-quote` | 12,380 curly marks in the nine typeset books | 271, all real, all in the plain-text edition |
| `punctuation-spacing` | 18,507 positions where a letter meets `; : ! ?` | none, once the image artefact above is set aside |

The second row is the one this run was worth making for. Before it, the named
hazard for `en` was a quotation opened with the single pair on a clitic or a
figure, `‘tis the season’` and `‘90s revival’` set as quotations rather than as
elisions, which is the one shape that turns `apostrophe-elision` and
`decade-apostrophe` into rules that retype somebody's quotation marks. The corpus
opens 255 quotations with the single pair and not one of them lands on either:
zero on a clitic word with or without the boundary, zero in front of a figure.
The closed set and the required boundary held on every one.

**The zeros that are not.** `decade-apostrophe` was never reached at all, in
either spelling, since nineteenth-century prose does not write `’90s`.
`double-hyphen` met 4,310 dashes and no double hyphen, so its recall is untested
and its false-positive hazard, `--` as a stylesheet modifier, needs code this
corpus does not contain. Both zeros are the vacuous kind and neither is evidence
of anything.

**What it found, and it is a ceiling rather than a defect.** `fix` repaired 95 of
the 117 straight apostrophes in the plain-text book and left 22. Nineteen are
quotation marks, which is the parse `en` declines everywhere. The other three are
possessives that follow an `s`: `bricklayers' unions` twice and `goodness' sake`
once, sitting in a document where `day's` beside them has been repaired. A
word-final apostrophe and a closing single quotation mark are the same character
in the same position, which is the U+2019 collision counted above in Dutch,
arriving in a third position. **`check` does not report them either**, so `fix`
on ASCII English returns a document carrying both marks and the report afterwards
calls it clean. `test/fixtures.ts`'s `en-possessive` and a case in
`test/en.test.ts` hold that boundary now, so it is asserted rather than
remembered.

The run says nothing about the hazard this package actually ships for. Ten novels
and treatises contain no fenced block, no JSON payload and no identifier, which
is the whole subject of `test/fixtures.ts`'s `MACHINE` group and of the open
question about `apostrophe` retyping code. A corpus of published prose could not
have answered that one, which is why it is not what replaced the corpora.

## The Dutch run

`nl` was the thinnest-measured style: one corpus, published by the body that
wrote two of its citations, and two of its seven rules reached by nothing in it.
[Issue #4](https://github.com/shbernal/typography/issues/4) put a second corpus
to it from a different register and, better than that, counted per rule how much
of the resulting zero was evidence. This section is that measurement reproduced
independently and then widened at the rules that had no denominator, which is
what the issue offered.

Four consolidated statutes, as the Staatsblad's own BWB XML served by
wetten.overheid.nl. **Nothing renders the text before the checker sees it**: no
PDF, no HTML page, no CMS, so these are the strings the government stores.

| Statute | Characters | Why this one |
|---|---|---|
| Cyberbeveiligingswet (the NIS2 transposition) | 140,356 | the corpus the issue reported |
| Waterwet | 35,756 | chosen for geography; it holds the run's one defect |
| Gemeentewet | 232,046 | chosen for `'s`-initial municipality names |
| Omgevingswet | 567,821 | the largest statute in Dutch law, for a denominator |

975,979 characters in 7,222 distinct units, at `nl@54bd114c5488`, after
`<meta-data>` comes off and repeated units are collapsed. **Rerunnable and not a
gate**, on the English section's terms: the XML and the four scripts sit
gitignored under `.tmp/nl/`, each statute beside a sidecar giving the exact URL,
the retrieval date and a SHA-256, and `.tmp/nl/README.md` is the entry point.

| What | Result |
|---|---|
| `check` | 5 findings, all five real |
| False positives | zero |
| `normalize` | 1 of 7,222 units rewritten |
| `audit` | zero violations over every unit and over each whole statute |

**The zeros that are evidence.** Each rule was counted against the correct
spelling of its own position, an opportunity being text sitting where the rule
looks, set the way the rule leaves alone:

| Rule | Reached | Reported |
|---|---|---|
| `punctuation-spacing` | 1,498 positions where a letter meets `; : ! ?` | none |
| `apostrophe` | 101 correctly set U+2019 between letters, and no straight mark or U+2018 in that position anywhere | none |
| `apostrophe-elision` | 3 correct (`’s avonds`, `’s ochtends`, `’s Rijksbelastingen`) and 1 defective | 1, real, repaired |

`punctuation-spacing` is the row that carries weight, and it is the one this
register is good for: 1,498 marks across four statutes and no complaint about any
of them.

**The zeros that are not, and there are three of them.** `mixed-quotation-marks`
had no ballot to count: there is not one quotation mark of any of the three Dutch
systems in 976k characters of statute, which also means `straight-double-quote`'s
four findings are recall and not precision, since no curly mark stood beside them
to be left alone. `apostrophe-after-symbol` was never reached. `ij-capital` met
two opportunities, `IJsselmeer` and `IJssel`, which is not a denominator.

**A bigger corpus of the same register would not fix that, and this was measured
rather than assumed.** The Omgevingswet is the largest statute in Dutch law, 4.2MB
of XML, and it contains exactly two `IJ`-initial words: legislative Dutch names
ministries rather than places, does not quote, and barely contracts. So the
register that measures the spacing rules best is the worst available for the
quotation rules, and `ij-capital` needs geography or journalism rather than more
statute. Choosing the next corpus at a named rule is the cheap move here, and it
is honest as long as the count is reported per rule.

**What it found, and it is the uniformity claim in the wild.** The single defect
is `'s Rijksbelastingen` in the Waterwet, set with a straight apostrophe, which
`fix` repairs to U+2019. The Gemeentewet sets the same phrase with U+2019
already. One publisher, one phrase, two spellings, each correct-looking in its own
document and no reader of either ever placed side by side: that is exactly the
failure this package is about one register up from a model's output, and it is why
the question is whether the same content comes back the same way twice. The other
four findings are the Gemeentewet's oath formulae, set with ASCII double quotes,
which `straight-double-quote` reports and declines to repair for the reason it
always does.

**Two things about the method, because they change what the numbers mean.**

- **A ballot rule cannot be measured one unit at a time.**
  `mixed-quotation-marks` counts a document and reports its minority, so a
  per-unit run hands it one unit's worth of votes and it can never report
  anything, whatever the document does. Every statute here was therefore checked
  unit by unit, which is how a consumer calls it, and then once as a single
  string. The same applies to `audit`: a sample too short to hold two votes
  measures nothing about a ballot.
- **A denominator depends on where the unit boundary is drawn, so it has to be
  stated.** The issue measured 121,469 characters of the Cyberbeveiligingswet and
  407 `punctuation-spacing` opportunities; this walk measures 140,356 characters
  of the same statute, because it also takes headings and table cells, and 322
  opportunities, because it counts only the position the rule actually reads, a
  letter in front of the mark. Both agree on the finding that matters, which is
  which rules the register reaches at all.
