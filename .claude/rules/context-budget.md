---
paths:
  - "context-budget.json"
  - "scripts/check-context-budget.mjs"
  - "test/check-context-budget.test.mjs"
  - "CLAUDE.md"
  - ".claude/rules/**"
---

# The context budget check (#427, #435)

`pnpm check:context-budget` runs in CI and in `verify`, so that the context Claude Code loads at launch cannot outgrow `context-budget.json`. It measures git-tracked files in UTF-8 bytes and lines, CRLF as LF, frontmatter included.

- Always loaded, 20,000 bytes and 200 lines: `CLAUDE.md`, `.claude/CLAUDE.md`, each rule whose `paths:` is not a non-empty list of non-blank strings (absent, empty, malformed or unreadable frontmatter all count), and each tracked file that any measured file imports with `@path`, outside code, up to four hops, so that an import cannot dodge the budget.
- Scoped, 15,000 bytes each: the other rules and each `CLAUDE.md` of a subfolder.
- The ratchet: a size may not pass its ceiling, or the budget where it has none. A ceiling is stale once its size is under it, and the check fails until `pnpm check:context-budget --write` lowers it, or removes it back under the budget. `--write` never raises or adds one: a file over the budget with no ceiling must shrink.
- A change that shrinks a file lowers its ceiling in the same commit. A ceiling goes up only on Gilles's decision, written in the commit. After a merge conflict in `context-budget.json`, keep either side and run `--write`.
- An import counts only when its target is tracked, so that CI and a checkout agree, and `--write` also drops the ceiling of a file that is gone or no longer scoped (decided by the agent on 2026-11-12, on #435, for Gilles to review).
- The budget copies the `contextBudget` of agent-workflow's `defaults.json`, which the plugin's hook warns by: change both together.
