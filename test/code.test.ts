// Code inside a value, which no rule reads.
//
// `src/pack.ts` takes fenced blocks and inline code spans out of a value before
// any rule sees it and puts them back afterwards. `hazards.test.ts` holds the
// fixtures to that as a ratchet; this file is the edges of the scanner itself,
// where Markdown decides what is code and a guess in either direction costs
// something: too little, and `n'oubliez` in a bash fence is retyped; too much,
// and a stray backtick switches the rest of a document off.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { check } from '../src/check.ts';
import { RIGHT_SINGLE_QUOTE as RSQ } from '../src/pack.ts';
import { en } from '../src/styles/en.ts';
import { fr } from '../src/styles/fr.ts';

const ids = (text: string) => check(fr, text).map((f) => f.rule);

test('a fenced block is left alone and the prose around it is not', () => {
  const text = "L'eau.\n\n```bash\necho 'it's' # n'oubliez pas\n```\n\nC'est fait.";
  assert.equal(
    fr.normalize(text),
    `L${RSQ}eau.\n\n\`\`\`bash\necho 'it's' # n'oubliez pas\n\`\`\`\n\nC${RSQ}est fait.`,
  );
});

test('a fence closes on its own character, at least as long, on a line of its own', () => {
  // A tilde fence, and a backtick line inside it that is not its closer.
  assert.equal(fr.normalize("~~~\n```\nit's\n~~~\nit's"), `~~~\n\`\`\`\nit's\n~~~\nit${RSQ}s`);
  // A shorter run does not close a longer fence, and a run with text after it
  // is not a closer at all.
  assert.equal(
    fr.normalize("````\nit's\n```\nit's\n``` x\n````\nit's"),
    `\`\`\`\`\nit's\n\`\`\`\nit's\n\`\`\` x\n\`\`\`\`\nit${RSQ}s`,
  );
});

test('an unclosed fence runs to the end of the value, as it renders', () => {
  assert.equal(fr.normalize("it's\n```\nit's\nit's"), `it${RSQ}s\n\`\`\`\nit's\nit's`);
});

test('a fence with CRLF line endings is still a fence', () => {
  assert.equal(fr.normalize("```\r\nit's\r\n```\r\nit's"), `\`\`\`\r\nit's\r\n\`\`\`\r\nit${RSQ}s`);
});

test('an inline span is left alone, including a ternary French would re-space', () => {
  const text = 'Utilisez `a ? b : c` ici.';
  assert.equal(fr.normalize(text), text);
  assert.deepEqual(ids(text), []);
});

test('a span closes on a run of exactly its own length', () => {
  // The double-backtick span holds a single backtick, which is how Markdown
  // writes one, and the apostrophe inside it is code.
  assert.equal(en.normalize("``it's ` here`` and it's"), `\`\`it's \` here\`\` and it${RSQ}s`);
});

test('a backtick with no partner is a literal and switches nothing off', () => {
  assert.equal(en.normalize("a ` here and it's"), `a \` here and it${RSQ}s`);
});

test('a span does not reach across a blank line for a partner', () => {
  assert.equal(en.normalize("one ` here\n\nit's ` there"), `one \` here\n\nit${RSQ}s \` there`);
});

test('a finding after code points at the text the caller passed', () => {
  const text = "`x` et ```y``` puis l'eau";
  const [finding] = check(fr, text).filter((f) => f.rule === 'apostrophe');
  assert.ok(finding);
  assert.equal(text[finding.index], "'");
  assert.equal(finding.length, 1);
  assert.equal(finding.column, text.indexOf("'") + 1);
});

test('a value that already holds the first sentinel is masked with another', () => {
  // U+FDD0 is a noncharacter and no text should carry one. One that does must
  // not have its code put back in the wrong place.
  const odd = String.fromCharCode(0xfdd0);
  const text = `${odd} \`it's\` it's ${odd}`;
  assert.equal(en.normalize(text), `${odd} \`it's\` it${RSQ}s ${odd}`);
});

test('the scan stays linear on backtick runs with no partner', () => {
  // Every length from 1 to 400 once, which is what makes a naive "look for the
  // next run of my length" quadratic: each run scans to the end and finds
  // nothing. The pointer per length is what keeps it to one pass.
  const runs = Array.from({ length: 400 }, (_, i) => '`'.repeat(i + 1)).join(" it's ");
  const start = performance.now();
  check(fr, runs);
  fr.normalize(runs);
  assert.ok(performance.now() - start < 1_000, 'unpartnered runs took over a second');
});

test('the scan stays linear on many spans with findings between them', () => {
  const text = "`x` l'eau ".repeat(5_000);
  const start = performance.now();
  const findings = check(fr, text).filter((f) => f.rule === 'apostrophe');
  assert.equal(findings.length, 5_000);
  assert.ok(performance.now() - start < 2_000, 'many spans took over two seconds');
});
