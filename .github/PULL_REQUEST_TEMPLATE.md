## What this changes

<!-- One or two sentences. -->

## Checks

- [ ] `pnpm check` passes.
- [ ] Any new or changed rule cites the standard that decides it.
- [ ] A rule that reports something it cannot safely repair has `find` and no
      `fix`, rather than a guessed repair.

## Gates

Only if this touches a rule, a pack or the checker:

- [ ] `node scripts/gate-findings.ts` run, and `gates/README.md` updated with any
      count that moved and why.
- [ ] `node scripts/gate-fr-reproduction.ts` still reproduces, or the diff is
      explained here.
- [ ] The pack version moved if a rule changed, since a pack id is stamped onto
      corpora as the era they were set in.

<!-- If you cannot run the gates, say so. The corpora are not in this repo, and
     an unrun gate stated plainly is fine. An unrun gate left unmentioned is not. -->
