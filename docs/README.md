# Documentation

`README.md` at the repo root says what this package is for and who should use
it. These pages are the rest: the design, the API, where the defaults came from,
and what you need before changing a rule.

| Page | Read it when |
|---|---|
| [design.md](design.md) | You want to know why a rule is the primitive, why `check` and `fix` are different rule sets, why there are three rule constructors, and why a style's stamp is derived rather than declared |
| [api.md](api.md) | You are calling the library or the CLI |
| [provenance.md](provenance.md) | You want to know where a style's defaults came from, or why a rule is narrower than it looks |
| [development.md](development.md) | You are changing a rule, adding a rule or a style, or cutting a release |

One file outside this directory carries more than its name suggests:
[`AGENTS.md`](../AGENTS.md) is the session-start briefing for coding agents, and
is the short form of `development.md`.
