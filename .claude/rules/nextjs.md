---
paths:
  - "next.config.ts"
  - "tsconfig.json"
  - "src/app/**"
---

# Gotchas of Next.js's dev server and typegen

- `next typegen`, and so `pnpm typecheck`, loads `next.config.ts` in the build phase (`node_modules/next/dist/cli/next-typegen.js:83`): whatever `next.config.ts` checks at build also runs at every typecheck.
- `next dev` writes every request with its query string, the login callback's `code` and `state` included, as `GET /login/callback?code=…&state=…&iss=… 307` (first login with « Shor Panel Dev », 2026-10-26), which **What is never logged** excludes; the code is spent by then. Whether Vercel's request logs keep them too, the first login on a preview tells (**Previews**): #9 closed without one.
- `next dev` writes route types under `.next/dev/types/`, which `tsconfig.json` includes and `next typegen` leaves alone, so a route deleted since the last `next dev` fails `pnpm typecheck` with TS2307 on `.next/dev/types/validator.ts`: on 2026-10-26, a throwaway `src/app/probe-alert/` of the day before did. Deleting `.next/dev/types/` fixes it, and the next `next dev` writes it again.
- `next dev` writes an `AGENTS.md` for the coding agent it detects unless `next.config.ts` sets `agentRules: false` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/agentRules.md`). The docs it would point to, which match the installed Next.js, are in `node_modules/next/dist/docs/`.
