# English, per Chicago and New Hart's Rules where they agree

Sources: `The Chicago Manual of Style` (17th ed., 2017) and `New Hart's Rules`
(Oxford, 2014). Citations name a topic rather than a section, because the two
manuals number differently and every rule here exists only because both of them
state it.

**This is the style with no standards body**, and that is the first thing to
understand before answering a question about it. The other four styles cite a
national or treaty authority. English has none, so this one ships the
intersection of two manuals and rules on nothing they disagree about. When a user
says the tool is wrong about English, check first whether the finding is one of
the six below: if it is not, the tool did not make it.

One style, no regions. There is no `en-US` or `en-GB`, because the two places the
manuals differ are a rule that reports without repairing and a rule that does not
exist, so there is nothing in this list for a region tag to change.

## The serial comma is not here

The question everybody asks first. Chicago requires it and other authorities
forbid it, so it is a divergence, and this style rules only on what is wrong under
both readings. A list with one is not a finding and neither is a list without one.
Finding the last item of a list is also a parse rather than a substitution, so it
could not have been repaired even if the manuals agreed.

If a user wants the serial comma enforced, that is a house style, and the package
supports it the honest way: compose a style with that rule in it and cite the
house style. It does not belong in `en`.

## `apostrophe` (fixable)

A straight quote **or a U+2018** between two letters becomes U+2019: `it's`,
`don't`, `o'clock`.

This is most of what `fix --style en` does to ordinary prose, because a model
emits the straight form by default and English elides constantly.

U+2018 is converted here as it is in Dutch. Between two letters it cannot be
opening a quotation, so it can only be a smart-quote pass that turned the wrong
way.

## `apostrophe-elision` (fixable)

A word-initial elision: `'tis`, `'twas`, `'em`.

**This is the position where an apostrophe and an opening single quotation mark
are the same character in the same place.** The rule is safe only because it
requires both a closed set of elided words and a boundary closing it, so
`the unit 'em' in CSS` and `'emphasis' is the word` are left alone: what follows
`em` is a quote in one and a letter in the other.

The set is short on purpose. `'cause`, `'round` and `'bout` are the same shape and
are not in it, and `'n'` is excluded outright, because `rock 'n' roll` and
`the letter 'n'` are the same characters in the same positions and the second is a
quotation. If a user asks why some other word-initial apostrophe was not fixed,
that is the answer: outside the closed set the tool cannot tell an elision from a
quotation.

## `decade-apostrophe` (fixable)

A straight quote or a U+2018 before a shortened decade: `the '90s`, `the '20s`.

Both manuals rule on this in as many words: what stands in for the omitted century
is an apostrophe and not a quotation mark. It is the most-cited typographic defect
in English, and it survives proofreading, because the two marks differ only by
which way they curl.

The `s` is required, so `the class of '08` is out of scope. That is the same
character doing the same job, and it is not distinguishable from a quoted figure:
`'08'` is two marks around a number, and leaving the first alone means knowing
that the second one closes it.

## `double-hyphen` (not fixable)

Two hyphens between two words, which is a dash typed on a typewriter, and what a
model emits when it has been told to avoid the dash character.

Reported and never rewritten, for two reasons that are worth keeping apart.

There is no repair to write. Chicago closes an em dash up (U+2014) and Oxford sets
a spaced en dash (U+2013), so repairing in either spelling would retype text that
is correct in the other. What is wrong under both readings is the double hyphen,
so that is what is reported, and the summary names both admissible repairs. **If a
user asks the tool to pick one, it cannot; ask them which manual they follow and
apply it yourself.**

And `--` between two letters is a dash in prose and a modifier in a stylesheet:
`.button--primary` is BEM and `example.com/a--b` is a slug. A URL is filtered out
because the token carries a `/`; a bare selector in a stylesheet is not, and is
reported. That is a false positive worth dismissing rather than a reason to
distrust the rule.

## `punctuation-spacing` (not fixable)

English takes no space before `; : ! ?`.

Almost always French spacing carried over, which in generated text arrives from
the model rather than from a translator.

Check-only for the usual reason: `a ? b : c` is a ternary and `1 : 2` is a ratio,
and deleting those spaces corrupts code that rendered correctly. A ternary in a
plain line **is** reported, and the fact that the tool declines to fix it is the
point rather than a gap.

## `straight-double-quote` (warning, not fixable)

Reported, never converted.

This is the most valuable rule English could have and the one thing the tool will
not do for you. A straight double quote is what a model emits by default, so
converting it would be worth more than everything above put together. It is a
parse: the two ends are the same character, so choosing between an opening and a
closing mark means pairing across the document, and a quote inside a code token
has to survive it.

**Do not offer a `sed` for it either.** The single-quote half of the same job is
worse: U+2019 is the closing single quotation mark and the apostrophe, so a pass
that curls quotes retypes apostrophes. `references/nl.md` carries the count from a
measured document.

Chicago sets the double pair first with the single pair nested inside it and
Oxford does the reverse, so which pair a document should use is a question this
style does not answer. It only reports that neither of them is a straight quote.
