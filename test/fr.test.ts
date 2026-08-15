// French. The five fixable rules are asserted against explicit code points
// rather than pasted characters, because U+00A0, U+202F and U+0020 are
// indistinguishable in this file and a test that used them literally would pass
// while asserting the wrong thing.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { fr, surveyWidth, withWidth } from '../src/fr.ts';

const NBSP = '\u00a0';
const NNBSP = '\u202f';
const THINSP = '\u2009';
const RSQUO = '\u2019';

const ids = (text: string) => check(fr, text).map((f) => f.rule);

test('the apostrophe rule needs a letter on both sides', () => {
  assert.equal(fr.normalize("l'ete"), `l${RSQUO}ete`);
  // A quote used as a quote, an apostrophe in a code token, and one next to a
  // digit or a bracket all survive. This narrowing is the rule.
  assert.equal(fr.normalize("'quoted'"), "'quoted'");
  assert.equal(fr.normalize("x['key']"), "x['key']");
  assert.equal(fr.normalize("annee '90"), "annee '90");
});

test('spacing before punctuation converts and never inserts', () => {
  assert.equal(fr.normalize('voici : ici'), `voici${NBSP}: ici`);
  assert.equal(fr.normalize('quoi ?'), `quoi${NNBSP}?`);
  assert.equal(fr.normalize('ah ! oui ; bon'), `ah${NNBSP}! oui${NNBSP}; bon`);
  // Nothing is inserted, so a URL and a code literal are untouched.
  assert.equal(fr.normalize('https://example.com'), 'https://example.com');
  assert.equal(fr.normalize('Bonjour!'), 'Bonjour!');
});

test('the colon takes the full no-break space, and it is the only fixed width', () => {
  // Nothing is in dispute before a colon: the Lexique specifies the word space
  // and both published corpora use it 2,458 times with no counter-example.
  assert.equal(fr.normalize('a : b'), `a${NBSP}: b`);
  // Absent any other evidence the rest default to the narrow one, which is what
  // the Lexique sets its own pages in.
  assert.equal(fr.normalize('a ; b'), `a${NNBSP}; b`);
});

test('guillemets are the one inserting rule', () => {
  assert.equal(fr.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize('« mot »'), `«${NNBSP}mot${NNBSP}»`);
  // Already correct: unchanged, and no finding.
  const correct = `«${NNBSP}mot${NNBSP}»`;
  assert.equal(fr.normalize(correct), correct);
  assert.ok(!ids(correct).includes('fr.guillemet-open'));
});

test('U+00A0 inside a guillemet is accepted, not retyped', () => {
  // The finding that moved this pack from 0.1.0 to 0.2.0. Over 2.4M characters
  // of typeset French the previous rules rewrote 6,462 guillemets like this one,
  // every one of which was already right by the reading its own publisher
  // follows. The citation does not fix a width, so neither does this pack.
  const nbspStyle = `«${NBSP}mot${NBSP}»`;
  assert.equal(fr.normalize(nbspStyle), nbspStyle);
  assert.deepEqual(
    ids(nbspStyle).filter((r) => r.startsWith('fr.guillemet')),
    [],
  );
});

test('spacing that is wrong under both readings is still repaired', () => {
  // A breaking space, a thin space (right width, wrong behaviour) and no space
  // at all are defects whichever convention a document follows.
  assert.equal(fr.normalize('« mot »'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize(`«${THINSP}mot${THINSP}»`), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(fr.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  // A doubled space is a defect in its own right, and it is still evidence of
  // which width the document is set in, so the repair keeps that width rather
  // than falling back to the default.
  assert.equal(fr.normalize(`«${NBSP}${NBSP}mot»`), `«${NBSP}mot${NBSP}»`);
});

test('a repair adopts the width the document already uses', () => {
  // The consistency stance, and the reason `conformRule` exists. The same defect
  // is repaired two different ways because the surrounding text differs.
  const nbspDoc = `«${NBSP}un${NBSP}» et «deux»`;
  assert.equal(fr.normalize(nbspDoc), `«${NBSP}un${NBSP}» et «${NBSP}deux${NBSP}»`);

  const nnbspDoc = `«${NNBSP}un${NNBSP}» et «deux»`;
  assert.equal(fr.normalize(nnbspDoc), `«${NNBSP}un${NNBSP}» et «${NNBSP}deux${NNBSP}»`);

  // And it holds for the high punctuation, which votes in the same ballot.
  assert.equal(fr.normalize(`«${NBSP}un${NBSP}» quoi ?`), `«${NBSP}un${NBSP}» quoi${NBSP}?`);
});

test('mixing the two widths is reported and never repaired', () => {
  // Neither width is a defect and using both is. Reported rather than fixed
  // because which one to settle on is the author's call, and on a near-even
  // split harmonising would silently retype half the document.
  const mixed = `«${NBSP}un${NBSP}» et «${NNBSP}deux${NNBSP}» et «${NBSP}trois${NBSP}»`;
  const found = check(fr, mixed).filter((f) => f.rule === 'fr.mixed-no-break-space');
  assert.equal(found.length, 2, 'both minority occurrences are reported');
  assert.equal(found[0]!.severity, 'warning');
  assert.equal(found[0]!.fixable, false);
  // The minority is what gets reported, not the house width.
  for (const f of found) assert.equal(mixed[f.index], NNBSP);
  assert.equal(fr.normalize(mixed), mixed);
});

test('a document using one width consistently reports no mixing', () => {
  for (const text of [
    `«${NBSP}un${NBSP}» et «${NBSP}deux${NBSP}» ; voici`,
    `«${NNBSP}un${NNBSP}» et «${NNBSP}deux${NNBSP}» ; voici`,
    'aucune ponctuation francaise ici',
  ]) {
    assert.deepEqual(
      ids(text).filter((r) => r === 'fr.mixed-no-break-space'),
      [],
      `fired on ${JSON.stringify(text)}`,
    );
  }
});

test('a missing space before punctuation is reported and not repaired', () => {
  // The French half of the finding this package is built around.
  assert.ok(ids('Bonjour! Ca va?').includes('fr.missing-space-before-high-punctuation'));
  assert.equal(fr.normalize('Bonjour!'), 'Bonjour!');
});

test('the missing-space rule stays off code and URLs', () => {
  for (const text of [
    'https://example.com/a?b=1',
    'C:\\Windows',
    'use !important here',
    'query ?utf8=x',
    'a ? b : c',
    'de 12:30 a 14:00',
  ]) {
    assert.ok(
      !ids(text).includes('fr.missing-space-before-high-punctuation'),
      `fired on ${JSON.stringify(text)}`,
    );
  }
});

test('a straight double quote is a warning, not an error', () => {
  const found = check(fr, 'il a dit "bonjour"');
  const quote = found.find((f) => f.rule === 'fr.straight-double-quote');
  assert.ok(quote);
  assert.equal(quote.severity, 'warning');
  assert.equal(quote.fixable, false);
});

test('the pack stamps an era', () => {
  // 0.2.0 because the guillemet rules changed what they rewrite. A corpus
  // normalized under 0.1.0 had the inside of every quotation retyped and one
  // under 0.2.0 did not, so the stamp has to tell them apart.
  assert.equal(fr.id, 'fr@0.2.0');
  assert.equal(fr.lang, 'fr');
});

// ---------------------------------------------------------------------------
// Corpus-wide width
// ---------------------------------------------------------------------------

/** Two rows that are each correct on their own and inconsistent together. This
 * is the whole defect: nothing in `fr` compares two values, so `normalize`
 * leaves both alone and the corpus splits. */
const SPLIT: readonly string[] = [`«${NBSP}oui${NBSP}»`, `«${NNBSP}non${NNBSP}»`, `bien${NBSP}!`];

test('normalize leaves a split corpus split, which is why the survey exists', () => {
  for (const row of SPLIT) assert.equal(fr.normalize(row), row);
});

test('the survey folds the ballot across values', () => {
  const survey = surveyWidth(SPLIT);
  // Three U+00A0 (two guillemets and the one before `!`) against two U+202F.
  assert.equal(survey.full, 3);
  assert.equal(survey.narrow, 2);
  assert.equal(survey.verdict, NBSP);
  assert.equal(survey.minority, NNBSP);
  assert.equal(survey.minorityCount, 2);
});

test('the survey is the same ballot as the per-value one, not a second copy', () => {
  // Summing per-value tallies must equal tallying the concatenation, or the
  // corpus verdict and the per-value verdict are two implementations that will
  // drift the first time a rule changes.
  assert.deepEqual(surveyWidth(SPLIT), surveyWidth([SPLIT.join('\n')]));
});

test('a consistent corpus reports no minority', () => {
  const survey = surveyWidth([`«${NNBSP}oui${NNBSP}»`, `«${NNBSP}non${NNBSP}»`]);
  assert.equal(survey.minority, null);
  assert.equal(survey.minorityCount, 0);
});

test('an empty corpus takes the same default a value with no evidence takes', () => {
  const survey = surveyWidth([]);
  assert.equal(survey.verdict, NNBSP);
  assert.equal(survey.minority, null);
});

test('the colon is not on the ballot', () => {
  // It has a fixed width by citation, so it does not vote and imposing a width
  // does not move it.
  assert.equal(surveyWidth([`voici${NBSP}: ici`]).full, 0);
  assert.equal(withWidth(NNBSP).normalize(`voici${NBSP}: ici`), `voici${NBSP}: ici`);
  // Sharper, and the one that catches somebody harmonizing the colon to make
  // the output look uniform: an imposed U+202F still *writes* U+00A0 here. The
  // derived pack is not "one width everywhere", it is one width at the three
  // positions the ballot counts, and the colon is not one of them because the
  // Lexique fixes it.
  assert.equal(withWidth(NNBSP).normalize('voici : ici'), `voici${NBSP}: ici`);
});

test('imposing a width harmonizes rows the shipped rules will not touch', () => {
  // The reason `withWidth` rebuilds the patterns instead of pinning `choose`.
  // These rows are correct-in-the-other-width, the shipped patterns exclude
  // exactly that, and so a width imposed by pinning `choose` would be a silent
  // no-op on precisely the rows that split the corpus.
  const house = withWidth(NBSP);
  assert.equal(house.normalize(`«${NNBSP}non${NNBSP}»`), `«${NBSP}non${NBSP}»`);
  assert.equal(house.normalize(`bien${NNBSP}!`), `bien${NBSP}!`);
  // And the whole corpus comes out with nothing left to report.
  assert.equal(surveyWidth(SPLIT.map((row) => house.normalize(row))).minority, null);
});

test('survey then impose is the intended sequence, in both directions', () => {
  for (const width of [NBSP, NNBSP]) {
    const house = withWidth(width);
    const settled = SPLIT.map((row) => house.normalize(row));
    const survey = surveyWidth(settled);
    assert.equal(survey.minority, null);
    assert.equal(survey.verdict, width);
  }
});

test('an imposed width still repairs what the shipped rules repair', () => {
  const house = withWidth(NNBSP);
  assert.equal(house.normalize('«mot»'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(house.normalize('«  mot  »'), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(house.normalize(`«${THINSP}mot${THINSP}»`), `«${NNBSP}mot${NNBSP}»`);
  assert.equal(house.normalize("l'ete"), `l${RSQUO}ete`);
  // And still inserts nothing before a colon, so a URL survives.
  assert.equal(house.normalize('https://example.com'), 'https://example.com');
});

test('an imposed width is a different era stamp', () => {
  // A corpus normalized under `withWidth` has had correct text retyped into the
  // imposed width and one normalized under `fr` has not. A stamp that read
  // `fr@0.2.0` on both would say they were set the same way.
  assert.equal(withWidth(NBSP).id, 'fr@0.2.0+house-00A0');
  assert.equal(withWidth(NNBSP).id, 'fr@0.2.0+house-202F');
  assert.notEqual(withWidth(NBSP).id, fr.id);
  assert.notEqual(withWidth(NBSP).id, withWidth(NNBSP).id);
});

test('an imposed width drops the rule that says the width is undecided', () => {
  const house = withWidth(NBSP);
  assert.ok(!house.rules.some((r) => r.id === 'fr.mixed-no-break-space'));
  // Dropping it loses no coverage: the three conform rules cover the same three
  // ballot positions, and every one of them is now fixable.
  assert.deepEqual(
    check(house, SPLIT.join('\n')).filter((f) => !f.fixable),
    [],
  );
});

test('an imposed width is idempotent, per rule and per pack', () => {
  const texts = [
    ...SPLIT,
    '',
    '«»',
    `«${NBSP}`,
    `${NNBSP}»`,
    'Il a dit «  bonjour  » ; puis « au revoir »!',
    `Mixed ${NBSP} et ${NNBSP} et ${THINSP} ensemble.`,
  ];
  for (const width of [NBSP, NNBSP]) {
    const house = withWidth(width);
    for (const text of texts) {
      const once = house.normalize(text);
      assert.equal(house.normalize(once), once, `${house.id} on ${JSON.stringify(text)}`);
      for (const rule of house.rules) {
        if (!rule.fix) continue;
        const ruleOnce = rule.fix(text);
        assert.equal(rule.fix(ruleOnce), ruleOnce, `${rule.id} on ${JSON.stringify(text)}`);
        // And the rule reports exactly when it rewrites, as everywhere else.
        assert.equal(rule.find(text).length > 0, ruleOnce !== text, `${rule.id} disagrees`);
      }
    }
  }
});

test('a width the standard does not admit is refused', () => {
  // U+2009 is the trap: right width, breaks lines. A host that imposed it would
  // be writing a defect into every value it owns.
  assert.throws(() => withWidth(THINSP), /must be NO_BREAK/);
  assert.throws(() => withWidth(' '), /must be NO_BREAK/);
  assert.throws(() => withWidth(''), /must be NO_BREAK/);
});

test('an imposed pack still satisfies the harness protocol', () => {
  const house = withWidth(NBSP);
  assert.equal(typeof house.normalize, 'function');
  assert.equal(house.lang, 'fr');
  assert.equal(house.standard, fr.standard);
});
