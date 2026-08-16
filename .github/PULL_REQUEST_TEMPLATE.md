## What this changes

<!-- One or two sentences. -->

## Checks

- [ ] `pnpm check` passes.
- [ ] Any new or changed rule cites the standard that decides it.
- [ ] A rule that reports something it cannot safely repair has `find` and no
      `fix`, rather than a guessed repair.

## If this touches a rule, a style or the checker

- [ ] `audit` run over samples that reach the changed rules, with idempotence,
      conformance and non-interference all clean.
- [ ] Anything measured, or any narrowing a reader would otherwise undo, written
      into the comment above the rule and into `docs/provenance.md` if a reader
      of the style needs it too.
- [ ] The stamp moved, which it does by itself when a rule moves. Say here what
      it was and what it is now.
