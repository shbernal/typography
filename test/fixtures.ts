// The fixtures the corpora were replaced with.
//
// The corpora answered "does this rule misfire on text a professional already
// set correctly", over 5.8M characters somebody published and this repo could
// not read. The input this package is now for is text a model emitted, and the
// hazard there is not a subtly mis-set quotation. It is that half of the text is
// **syntax**: a generation comes back with a fenced block, a JSON payload, a URL,
// a Windows path and an identifier in it, and every rule in this package is about
// a character that carries punctuation in a sentence and syntax in a token.
//
// So these are weighted at machine text rather than at prose, and they are
// committed rather than downloaded: forty-odd samples that fit on a screen, that
// a reader can check by eye, and that exercise every rule in every shipped style.
// [`docs/provenance.md`](../docs/provenance.md) holds what the corpora
// established before they left.
//
// **Every invisible character here is a named constant.** U+0020, U+00A0, U+202F
// and U+2009 are indistinguishable in a source file, and so are U+2018 and
// U+2019 at this font size, so a fixture written with a literal one passes while
// asserting something nobody wrote.

import {
  LEFT_SINGLE_QUOTE as LSQ,
  NO_BREAK as NBSP,
  NARROW_NO_BREAK as NNBSP,
  RIGHT_SINGLE_QUOTE as RSQ,
  THIN,
} from '../src/pack.ts';

export interface Sample {
  /** Short, and it goes in every failure message. Name the hazard, not the
   * language: `fenced-javascript`, not `sample-7`. */
  readonly name: string;
  readonly text: string;
}

/**
 * Text that is syntax rather than prose, and that no style should rewrite.
 *
 * "Should" is doing work there: `test/hazards.test.ts` holds the rules that
 * currently do rewrite these to a written-down list, because two of them do and
 * the list is the honest form of that. Nothing in this group is a sentence in any
 * of the five languages, so a rule firing here is a rule reading syntax as prose.
 */
export const MACHINE: readonly Sample[] = [
  { name: 'fenced-javascript', text: '```js\nconst greeting = "it\'s here";\n```' },
  { name: 'fenced-python', text: "```python\nlabel = f'{name}: {value}'  # a ? b : c\n```" },
  { name: 'fenced-diff', text: '```diff\n-  const a = \'x\';\n+  const a = "y";\n```' },
  // A model asked for code emits typographic quotes into it about as often as it
  // emits them into prose, and the result is a fence this package must not
  // "correct" further.
  { name: 'fenced-smart-quotes', text: '```js\nconst s = \u201chello\u201d; // don\u2019t\n```' },
  { name: 'inline-code-span', text: 'Use `npm run build:watch` and `a ? b : c` inline.' },
  {
    name: 'json-payload',
    text: '{"name":"o\'brien","url":"https://x.dev/a?b=1&c=2","ratio":"1:2"}',
  },
  { name: 'json-pretty', text: '{\n  "title": "Le Monde",\n  "count": 3,\n  "ok": true\n}' },
  { name: 'url-query', text: 'https://example.com/search?q=un+deux&lang=fr#resultats' },
  { name: 'windows-path', text: 'C:\\Users\\Jean\\Documents\\rapport final.md' },
  { name: 'posix-path', text: '/usr/local/etc/app.conf et ~/.config/app/config.toml' },
  { name: 'identifiers', text: 'getUserById(), MAX_RETRIES, kebab-case-name, snake_case_name' },
  {
    name: 'html-attributes',
    text: '<a href="/x?y=1" title="c\'est">texte</a> <img src=\'a.png\'/>',
  },
  { name: 'jsx-props', text: "const El = () => <Box sx={{ p: 2 }} label={t('key')} />;" },
  { name: 'markdown-link', text: '[le guide](https://x.dev/guide?lang=fr "titre du guide")' },
  { name: 'markdown-table', text: '| Cle | Valeur |\n|---|---|\n| a:b | c?d |' },
  { name: 'yaml-frontmatter', text: "---\ntitle: 'Mon titre'\nurl: https://x.dev?a=1\n---" },
  { name: 'shell-pipeline', text: "curl -s 'https://x.dev/api?id=1' | jq '.items[0].name'" },
  {
    name: 'env-assignment',
    text: "API_KEY='abc' NODE_OPTIONS='--max-old-space-size=4096' pnpm test",
  },
  { name: 'css-rule', text: '.a::after { content: "\\201C"; margin: 0 0.5em; }' },
  { name: 'sql-query', text: "SELECT * FROM t WHERE name = 'O''Brien' AND id = 3;" },
  { name: 'regex-literal', text: "const re = /^\\d+:\\d+$/g; if (s.match(re)) return 'ok';" },
  { name: 'stack-frame', text: 'at Object.<anonymous> (/app/src/index.ts:12:34)' },
  { name: 'log-line', text: 'WARN 12:30:01 db: connection lost ; retry in 5s' },
  { name: 'data-uri', text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' },
  { name: 'iso-timestamp', text: '2026-08-16T09:30:00Z, duree 01:45:00' },
];

/**
 * Prose, correct and defective, in each of the five conventions.
 *
 * These exist to make the machine group mean something. A fixture set that
 * reaches no rule passes every property, which is the trap the corpora had and
 * the one `audit` warns about in its own doc comment, so `test/hazards.test.ts`
 * asserts that every rule in every shipped style fires somewhere in this group.
 */
export const PROSE: readonly Sample[] = [
  {
    name: 'fr-correct',
    text: `L${RSQ}ete arrive${NBSP}: voici «${NBSP}une citation${NBSP}»${NBSP}; puis un point${NBSP}!`,
  },
  { name: 'fr-defective', text: "L'ete arrive : voici « une citation » ; puis un point !" },
  { name: 'fr-no-space-at-all', text: 'Bonjour! Ca va? Attention:ici' },
  { name: 'fr-mixed-width', text: `«${NBSP}un${NBSP}» et «${NNBSP}deux${NNBSP}» ensuite` },
  // U+2009 is the right width and the wrong breaking behaviour, so a proof looks
  // correct and the line comes apart in a browser.
  { name: 'fr-thin-space', text: `il a dit «${THIN}bonjour${THIN}» hier` },
  { name: 'es-correct', text: '¿Como estas? ¡Claro! Dijo «hola» y despues «adios».' },
  { name: 'es-defective', text: '¿ Como estas ? Dijo « hola » ; pero como estas? Vaya!' },
  { name: 'de-DE-correct', text: 'Er sagte »Wort« und sie sagte „Wort“.' },
  { name: 'de-DE-defective', text: "Er sagte » Wort « und „ Wort“ und es geht's." },
  { name: 'de-CH-correct', text: 'Sie sagte «Wort» und ging.' },
  { name: 'de-CH-defective', text: "Sie sagte « Wort » und zahlte 100'000 Franken." },
  // English is the style whose defects are all one character, so its two
  // samples carry the three positions that character occupies plus the two
  // rules that report and do not repair. `en-defective` reaches every rule in
  // the style, which is what `hazards.test.ts` asks of the whole file rather
  // than of any one sample.
  {
    name: 'en-correct',
    text: `It${RSQ}s the ${RSQ}90s again: “well,” she said, and ${RSQ}tis fine.`,
  },
  {
    name: 'en-defective',
    text: `It's the ${LSQ}90s again ; ${LSQ}tis a "quote" and a well--known dash.`,
  },
  { name: 'nl-correct', text: `De auto${RSQ}s en ${RSQ}s morgens en de IJsland-reis.` },
  {
    name: 'nl-defective',
    text: `De auto's en 's morgens en Ijsland en een A4'tje en ${LSQ}een${RSQ} en \u201ctwee\u201d.`,
  },
];

/**
 * One convention's quotation inside another's prose.
 *
 * The class of hazard no corpus could ever have held, since each corpus was one
 * publisher writing one language correctly (`FOLLOW-UPS.md` 1c). It is the
 * ordinary case in generated text: a German paragraph quoting a French title, a
 * French one quoting a German paper, an English phrase anywhere.
 */
export const MIXED: readonly Sample[] = [
  { name: 'french-title-in-german', text: 'Er las « Le Monde » gestern Abend.' },
  { name: 'german-title-in-french', text: 'Il a lu »Die Zeit« hier soir.' },
  { name: 'swiss-quotation-in-german', text: 'Sie sagte «Wort» und ging.' },
  { name: 'english-quotation-in-german', text: 'Er sagte \u201chello\u201d und ging.' },
  { name: 'spanish-question-in-french', text: '¿Como estas? demande-t-il en riant.' },
  { name: 'dutch-quotation-in-french', text: `Il a dit ${LSQ}nee${RSQ} puis ${LSQ}ja${RSQ}.` },
];

/**
 * A whole small document, which is the shape the CLI is actually pointed at.
 *
 * The groups above isolate one hazard each; this one is the realistic input, and
 * it is here because the interesting failures are at the seams. A prose sentence
 * and a fenced block in one file are the same string as far as `normalize` is
 * concerned.
 */
export const DOCUMENTS: readonly Sample[] = [
  {
    name: 'fr-readme',
    text: [
      '# Guide',
      '',
      "L'installation prend une minute : lancez la commande suivante.",
      '',
      '```bash',
      "npm run build -- --lang fr # n'oubliez pas le double tiret",
      '```',
      '',
      'Voir [la documentation](https://x.dev/docs?lang=fr) pour la suite !',
    ].join('\n'),
  },
  {
    name: 'nl-release-note',
    text: [
      '## Versie 2.1',
      '',
      `De auto${RSQ}s worden nu ${LSQ}s ochtends gesynchroniseerd.`,
      '',
      '- `POST /api/v2/sync?force=1` vervangt de oude route',
      '- Config: `{ "retries": 3, "timeout": "1:30" }`',
    ].join('\n'),
  },
];

/** Everything, for the property tests. `''` and a bare space are in here because
 * an empty value is what a pipeline sends when a field is missing, and a rule
 * that throws on one fails a whole batch. */
export const FIXTURES: readonly Sample[] = [
  { name: 'empty', text: '' },
  { name: 'one-space', text: ' ' },
  { name: 'marks-only', text: `«»„“\u201a${LSQ}¿¡;:!?` },
  { name: 'crlf', text: 'A line\nwith a break\r\nand a CRLF one.' },
  ...MACHINE,
  ...PROSE,
  ...MIXED,
  ...DOCUMENTS,
];

/** Just the text, for a caller that wants what `audit` and `check` take. */
export function texts(samples: readonly Sample[] = FIXTURES): readonly string[] {
  return samples.map((sample) => sample.text);
}

// ---------------------------------------------------------------------------
// The battery
// ---------------------------------------------------------------------------

/** An ordinary space, named so that every entry in `SPACES` below reads as what
 * it is rather than as a run of indistinguishable characters. */
const SPACE = ' ';

/** Every space run the inner-space family has a parameter for, including the
 * ones that are two characters: a rule that matches a run has to take all of it
 * or it repairs half a run and leaves the rest for the next pass. */
const SPACES = [
  '',
  SPACE,
  NBSP,
  NNBSP,
  THIN,
  SPACE + SPACE,
  SPACE + NBSP,
  NBSP + NBSP,
  THIN + SPACE,
] as const;

/** Every mark any style has an opinion about, each tried on both sides, because
 * which of them opens a quotation is exactly what the five styles disagree on. */
const MARKS = ['«', '»', '„', '“', '”', LSQ, RSQ, '"', "'"] as const;

/** What sits outside the quotation. The letter and the digit are the guard's
 * whole subject, the newline is the one that finds a pattern anchored with `^`
 * by accident, and the empty string puts the mark at the edge of the value. */
const OUTER = ['', SPACE, 'x', '1', '.', '\n'] as const;

/**
 * The generated half of the fixtures: every mark against every space run against
 * every outer context, plus the punctuation and elision positions.
 *
 * 8,799 inputs, which is more than anybody would write by hand and less than a
 * corpus, and it covers the combinations rather than the sentences. It was built
 * during the rule refactor to answer one question the corpora could not: whether
 * moving a rule into a shared builder changed what it does. Run before and after
 * a change that claims to change nothing, the dump is byte-identical or the claim
 * is false. `scripts/battery.ts` prints it and `test/battery.test.ts` digests it.
 */
export function combinations(): readonly string[] {
  const inputs: string[] = [];
  for (const open of MARKS)
    for (const space of SPACES)
      for (const close of MARKS)
        for (const outer of OUTER) {
          inputs.push(`${outer}${open}${space}woord${space}${close}${outer}`);
          // The empty quotation, which is where an inserting rule that does not
          // match its own output stops converging.
          inputs.push(`${outer}${open}${space}${close}${outer}`);
        }
  for (const space of SPACES)
    for (const mark of [';', ':', '!', '?']) inputs.push(`mot${space}${mark} suite`);
  for (const space of SPACES) inputs.push(`¿${space}que? ¡${space}vaya!`);
  inputs.push(
    'Er sagte »Wort« und ging.',
    'Il dit « mot » puis.',
    `auto${RSQ}s en ${LSQ}s morgens`,
    "auto's en 's morgens",
  );
  // Two padded runs, for `test/perf.test.ts`'s subject seen from this side: a
  // pattern with more than one way to match a run of spaces takes seconds here.
  inputs.push(`aaa${SPACE.repeat(40)}«`, `«${SPACE.repeat(40)}`);
  return inputs;
}
