# Security policy

## Supported versions

Pre-1.0. The latest published version is the only supported one.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository
(**Security** > **Report a vulnerability**). That keeps the report private until
there is a fix. Please do not open a public issue for a vulnerability.

Expect an acknowledgement within a week. This is a small library maintained by
one person, so a fix is a best effort rather than an SLA.

## What the attack surface actually is

Worth stating, because it is smaller than the word "linter" suggests:

- **No runtime dependencies**, in either the library or the CLI. There is no
  transitive tree to be compromised through.
- **No network, no child processes, no dynamic code.** The library is regular
  expressions over strings. The CLI reads files and stdin and writes stdout, and
  writes a file only when you pass `--write`.
- **The regular expressions are the surface that matters.** Every rule runs over
  attacker-controllable text, so a pattern that backtracks catastrophically is a
  denial of service in a host that checks user input. If you find one, that is a
  vulnerability in this package and worth reporting.

  `test/perf.test.ts` is what stands behind that paragraph rather than merely
  next to it: every style is held to linear time over long runs of each of the
  four spaces this package knows about, unbroken tokens, and very long URLs.
  Three rules failed it when it was written. The French guillemet rules were an
  alternation over `ANY_SPACE*BREAKABLE ANY_SPACE*`, and because `BREAKABLE` is a
  subset of `ANY_SPACE` a run of ordinary spaces could be split at every position
  in it: 15 seconds for a single padded 3,000-space line, which an indented block
  produces without anybody meaning to. The Spanish and German closing-quote rules
  were quadratic through an unanchored `ANY_SPACE+»`. All are fixed, and the
  shapes that broke them are in that test.
- No script in this repository makes a network request. The corpus fetcher that
  used to be the one exception was deleted with the corpus gates.

## Publishing

Releases are published from GitHub Actions with npm trusted publishing and build
provenance, so a tarball on npm can be traced to the workflow run and commit that
produced it. There are no long-lived npm tokens in this repository.
