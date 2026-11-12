---
paths:
  - "src/discord/**"
  - "src/blocked-words/**"
  - "vitest.contract.config.mts"
---

# Gotchas of Discord and the contract suite

- Discord's tokens don't say which application they belong to, and another application's token fails every AutoMod route of `pnpm test:contract`: `.claude/rules/blocked-words.md`, **Traps**.
- A worktree has no `.env.local`, which git ignores, so `pnpm test:contract` there fails before calling Discord (**Feedback loops**). `node --env-file=<main checkout>/.env.local node_modules/vitest/vitest.mjs run --config vitest.contract.config.mts` runs it on the main checkout's values, with no copy of the file: the suite passed that way on 2026-10-29 (#96).
