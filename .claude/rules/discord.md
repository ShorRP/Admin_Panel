---
paths:
  - "src/discord/**"
  - "src/blocked-words/**"
  - "vitest.contract.config.mts"
---

# Gotchas of Discord and the contract suite

- Discord's tokens don't say which application they belong to. On 2026-10-25, `pnpm test:contract` run with « Shor Panel »'s token instead of « Shor Panel Dev »'s answered `403 50013 Missing Permissions` on every AutoMod route and `404 10004 Unknown Guild` on `getMember`, since « Shor Panel » is on no Discord server until #8. `GET /users/@me` with the token names its application: « Shor Panel Dev » is `1563184114687803403` (#7).
- Gilles owns his test Discord server, and AutoMod spares the owner and the members with Administrator or Manage Server (ADR 0002), so a blocked word sent from his account goes through, with nothing to say the rule works. Try one from an account that holds neither, as « machin » was (Gilles, 2026-10-27).
- A worktree has no `.env.local`, which git ignores, so `pnpm test:contract` there fails before calling Discord (**Feedback loops**). `node --env-file=<main checkout>/.env.local node_modules/vitest/vitest.mjs run --config vitest.contract.config.mts` runs it on the main checkout's values, with no copy of the file: the suite passed that way on 2026-10-29 (#96).
