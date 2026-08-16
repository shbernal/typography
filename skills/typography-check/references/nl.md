# Dutch, per the Nederlandse Taalunie

Sources: `Technische Handleiding` (Nederlandse Taalunie, oktober 2016) for
spelling, and Taaladvies.net for punctuation.

Dutch is the pack whose shape differs most from the other three, and the
difference is the first thing to understand before answering a question about it.
**It has no rule about which quotation marks Dutch uses**, because the Taalunie
never made one. What it has instead is a rule about using more than one system in
the same document.

One pack, no regions. The Taalunie is a treaty body whose spelling binds the
Netherlands, Flanders and Suriname alike, so `nl` is bare in the way `fr` and `es`
are and unlike `de`.

## `mixed-quotation-marks` (warning, not fixable)

The document opens quotations with more than one of `‘…’`, `“…”` and `„…”`. Every
opening mark of the minority system is reported.

Taaladvies is explicit on both halves of this:

> Er zijn geen vaste regels voor het gebruik van enkele of dubbele
> aanhalingstekens. We raden aan om consequent voor één systeem te kiezen.

So a pack that ruled on which system to use would be asserting what its citation
does not fix. Consistency is the whole of what can honestly be claimed, and it is
claimed.

**Do not harmonise this yourself, and this is a stronger warning than the French
one.** U+2019 is both the closing single quotation mark and the apostrophe. In the
Taalunie's own 427,000-character document there are 537 of them, of which 144
close a quotation and 393 are apostrophes. A pass that converted `‘…’` into `“…”`
would retype those 393 apostrophes as closing double quotes. Report the split, say
which system is in the minority, and let the author choose.

The low pair `„…”` is obsolescent - Onze Taal calls it "hoe langer hoe meer in
onbruik" - but a document that uses it consistently is correct, not defective.

## `apostrophe` (fixable)

A straight quote **or a U+2018** between two letters becomes U+2019.

Dutch reaches for the apostrophe far more than French or German, because the
plural of a vowel-final noun takes one: `auto's`, `baby's`, `taxi's`.

This is the only pack that converts U+2018. Between two letters it cannot be
opening a quotation, so it can only be a smart-quote pass that turned the wrong
way. The standard uses U+2018 to open a quotation 144 times and as an apostrophe
never.

## `apostrophe-elision` (fixable)

A word-initial elision: `'s morgens`, `'t huis`, `'n keer`, `'s-Gravenhage`.

**This is the position where a Dutch apostrophe and an opening single quotation
mark are the same character in the same place.** `'s morgens` is an elision and
`'strand'` is a quoted word. The rule is safe only because it requires both a
closed set of elided words - `'s 't 'n 'k 'm 'r 'ns` - and a space or hyphen
closing it. `'strand'` fails on the second, since `s` is followed by `t`.

If a user asks why it did not fix some other word-initial apostrophe, that is the
answer: outside the closed set the tool cannot tell an elision from a quotation.

## `apostrophe-after-symbol` (not fixable)

`A4'tje`, `80'ers`, `2'en`, `D66'er`, `65+'er`, `@'je`. Dutch attaches a suffix to
a number, an initialism or a symbol with an apostrophe.

Reported rather than fixed, for the same reason as
`punctuation-spacing`: a digit to the left of a straight quote followed by
letters is also a sized literal in a hardware description language (`4'b1010`,
`8'hFF`), and a foot-and-inch measure is the same characters again. The
letter-to-letter rule has a lookbehind that separates prose from those. Here the
digit *is* the context, so there is nothing left to narrow with.

## `ij-capital` (not fixable)

A word-initial `Ij`.

IJ is one letter written with two signs, so it capitalises whole: `IJmuiden`,
`IJszee`, `IJzermonding`, and lowercase `ijs` inside a sentence. `Ij` is therefore
wrong under **every** reading, which is what makes it detectable.

And unfixable for the same reason the Spanish opening mark is: knowing the form is
wrong does not tell you which way to correct it. `Ijs` starting a sentence wants
`IJs`; the same word inside one wants `ijs`. Choosing means knowing where the
sentence began and whether the word is a proper noun. Ask the user.

## `punctuation-spacing` (not fixable)

Dutch takes no space before `; : ! ?`.

Worth watching in Dutch specifically. Dutch and French are in daily contact in
Belgium, and French spacing carried into Dutch is a defect under the Belgian half
of the Taalunie's own authority rather than a Belgian convention. That is why the
pack is `nl` and not `nl-BE` plus `nl-NL`.

Check-only for the usual reason: `a ? b : c` is a ternary.

## `straight-double-quote` (warning, not fixable)

Reported, never converted. The two ends are the same character, and Dutch has
three admissible pairs to choose between rather than two.

## Note on evidence

Two of these rules - `mixed-quotation-marks` and `punctuation-spacing`
- cite Taaladvies.net, which states plainly that its advice has "geen kracht van
wet of ander bindend karakter". It is the joint service of the Taalunie, the
Instituut voor de Nederlandse Taal and Onze Taal, and it is the most authoritative
statement that exists on Dutch punctuation, because the treaty body declined to
make one. If a user disputes one of those two findings on the grounds that it is
advice rather than a standard, they are right about the status and the tool is
still reporting what the advice says.

See `gates/README.md` in the package repo for what the Dutch corpora do and do not
exercise.
