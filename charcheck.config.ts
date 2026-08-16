// Banned characters, checked three ways from this one file: `pnpm lint:chars`,
// the `pre-commit` and `commit-msg` jobs in `lefthook.yml`, and
// `test/chars.test.ts`, so the rules hold for anyone who runs only `pnpm test`.
// One config rather than a scanner plus a hook plus a test with three copies of
// the character list, which is the defect this repo has caught five times.
//
// Every banned character is built from its code point. A literal here would be
// a finding in the file that bans it, and the space family is indistinguishable
// in a source file anyway, which is the whole reason the second rule exists.

import { defineConfig } from 'charcheck/config';

const cp = (codePoint: number): string => String.fromCodePoint(codePoint);

/** U+2014. Banned in source, in docs and in the strings the styles render. */
const EM_DASH = cp(0x2014);

// The characters this project's own rules are about, which is exactly why they
// must never be pasted into a test or a doc: a fixture written with a literal
// U+202F asserts something no reader of the file can see, and it passes. Build
// them from `NO_BREAK` and friends in `src/pack.ts` instead, and where a module
// has to name one, write the escape. `src/pack.ts` defines all three that way,
// which is text this rule does not match and is meant not to match.
const INVISIBLES = [
  cp(0x00a0), // no-break space
  cp(0x202f), // narrow no-break space
  cp(0x2009), // thin space
  cp(0x00ad), // soft hyphen
  cp(0x200b), // zero width space
  cp(0x200c), // zero width non-joiner
  cp(0x200d), // zero width joiner
  cp(0x2060), // word joiner
  cp(0x200e), // left-to-right mark
  cp(0x200f), // right-to-left mark
];

/** Written by a tool, so a finding in one is not a finding about this repo. */
const GENERATED = ['dist/**', 'pnpm-lock.yaml'];

// Every text file in the tree, which is what the scanner this replaced walked.
// The two dotted patterns are not redundant: a dotted directory is only entered
// when a pattern names it, so the workflows and the plugin manifests would
// otherwise go unchecked, silently and while still reporting a pass.
const TEXT_FILES = [
  '**/*.{ts,md,json,mjs,cjs,txt,yml,yaml}',
  '.github/**/*.{yml,yaml,md}',
  '.claude-plugin/**/*.json',
];

// `scope` is left at `raw` on both file rules, which is stricter than this
// project needs for prose alone and deliberate: a fenced example and a code
// comment are places these characters have been pasted before, and this
// package's subject is that they are invisible wherever they sit. A file that
// genuinely has to carry one takes a `charcheck-disable-line` comment, which
// says so in the diff.
export default defineConfig({
  rules: [
    {
      id: 'no-em-dash',
      chars: [EM_DASH],
      message: 'No em dashes. Use a comma, a colon, or reword.',
      include: TEXT_FILES,
    },
    {
      // The surface the scanner this replaced could not reach at all.
      id: 'no-em-dash-in-commit-msg',
      chars: [EM_DASH],
      message: 'No em dashes. Use a comma, a colon, or reword.',
      include: ['<commit-msg>'],
    },
    {
      id: 'no-invisible-characters',
      chars: INVISIBLES,
      message: 'Invisible character. Use NO_BREAK and friends from src/pack.ts.',
      include: TEXT_FILES,
    },
  ],
  ignore: GENERATED,
});
