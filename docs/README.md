# Documentation

`README.md` at the repo root says what this package is for and who should use
it. These pages are the rest: the design, the API, the evidence behind the
numbers, and what you need before changing a rule.

| Page | Read it when |
|---|---|
| [design.md](design.md) | You want to know why `check` and `fix` are different rule sets, why there are three rule constructors, and why a pack id carries a version |
| [api.md](api.md) | You are calling the library or the CLI |
| [corpus-consistency.md](corpus-consistency.md) | You are normalizing many values, field by field, and need them consistent with each other |
| [evidence.md](evidence.md) | You want to know what the findings numbers in the README are worth |
| [development.md](development.md) | You are changing a rule, adding a language, or cutting a release |

Two files outside this directory carry more than their names suggest:

- [`gates/README.md`](../gates/README.md) owns the release gates and is honest
  about where the evidence is thin. Read it before touching a rule.
- [`AGENTS.md`](../AGENTS.md) is the session-start briefing for coding agents.
  It is the short form of `development.md`.
