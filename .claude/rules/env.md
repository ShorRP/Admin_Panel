---
paths:
  - "src/*/env.ts"
  - ".env.example"
  - "next.config.ts"
---

# The environment variables

How the panel reads its configuration (#51). Each variable's name and meaning are in the README, its shape in the `env.ts` that parses it and in `env.test.ts`, and the facts about Vercel's dashboard in `docs/delivery.md`, **Environments**.

## Configuration

- Each folder validates its own variables with zod, in a module without `server-only` that exports a function parsing the environment it is given, so that a test or a workflow passes it the variables it holds: `src/discord/env.ts` has one per client, `parseDiscordApiEnv` and `parseDiscordOAuthEnv`, since `contract.yml` holds only `DiscordApi`'s variables (#59), then `parseTestProxyEnv`, for `E2E_TEST_PROXY`, the switch that lets the HTTP adapter answer for Discord end to end (#63), and `parseContractEnv`, for the contract suite's two accounts.
- The folder's factories call it on `process.env` when they first run, in development as in production, and a failed parse is then a panel error (`CLAUDE.md`, **Errors**).
- When `VERCEL` is set, `next.config.ts` also calls every folder's at build, so that a missing or invalid variable fails the build and Vercel keeps the previous production deployment: "Your production domains don't serve a deployment until a production deployment succeeds" (https://vercel.com/docs/deployments/environments). Next.js loads `.env*` before `next.config.ts`, and Vercel gives a project's variables to its build.
- Elsewhere the build checks nothing, since `pnpm typecheck` loads `next.config.ts` too (`.claude/rules/nextjs.md`): a fresh clone or a worktree, without `.env.local`, still typechecks and builds, and `ci.yml` needs no placeholder values. `E2E_TEST_PROXY`, which `next.config.ts` parses on every load, may be absent.
- A failed parse's message names the variable, never its value: zod 4 leaves the input out of its issues (https://zod.dev/error-customization), and the panel turns on no `reportInput` and adds no error map that would put it back. Each `env.test.ts` proves it.

## Variables

- Each folder alone reads its own:
  - `src/discord/`: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and `DISCORD_REDIRECT_URI` for `DiscordOAuth`, `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` for `DiscordApi`, and `CONTRACT_MEMBER_ID` and `CONTRACT_ABSENT_USER_ID` for the contract suite alone (`.claude/rules/discord.md`, **The contract suite**).
  - `src/staff/`: `STAFF_ROLE_ID`, `MODERATION_ROLE_IDS`, `BAN_ROLE_IDS` and `SESSION_SECRET`.
  - `src/ticket-archives/`: `TICKET_ARCHIVES_CHANNEL_ID` and `TICKET_CATEGORY_ID` (`.claude/rules/support-tickets.md`, **Configuration**).
  - `src/game-log/`: `GAME_LOG_CHANNEL_ID` and `GAME_LOG_WEBHOOK_ID` (`.claude/rules/game-log.md`, **Configuration and access**).
  - `src/bot-log/`: `BOT_LOG_CHANNEL_ID` (`.claude/rules/bot-log.md`, **Configuration and access**).
  - `src/monitoring/`: `ALERT_WEBHOOK_URL`, and Vercel's `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` (`.claude/rules/monitoring.md`, **`src/monitoring/`**).
  - `next.config.ts`: `E2E_TEST_PROXY`, and the `NODE_ENV` that Next.js sets (`.claude/rules/nextjs.md`, **Headers**).
- The variables of the ticket archives, the game log and the Bot log are optional, an empty one counting as unset, so that a copy of `.env.example` leaves them off and a build on Vercel never fails for want of them; a value that is no snowflake still fails the build there. The others are non-empty.
- `STAFF_ROLE_ID` names one role, the only one that makes a member staff on Shor's Discord server (#13).
- `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` are system variables, which Vercel sets once the project exposes them (#9), so they are absent outside Vercel and stay out of `.env.example`.
- `E2E_TEST_PROXY` is absent or `1`, and only Playwright's `webServer` sets it, so it stays out of `.env.example`, where an empty value copied from it would break; the build refuses it when `VERCEL` is set, which Vercel does at build and at runtime once the project exposes its system variables (https://vercel.com/docs/environment-variables/system-environment-variables; `.claude/rules/e2e.md`, **The server and the fake Discord**).
- `.env.example` lists every variable, empty, but those two kinds, and the README documents each one in the change that adds the code that reads it, since `.env.example` holds no comment (#63).

## Secrets

- Only `NEXT_PUBLIC_` variables reach the browser, and the panel has none (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`).
- Next.js resolves `server-only` itself (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`), but Vitest does not, and the package's default entry throws, only its `react-server` condition leading to an empty module (`npm view server-only exports`). So `server-only` is a dependency, and `vitest.config.mts` aliases it to that empty module.
- React's taint APIs stay off, being experimental (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`).

## Gotcha

- A variable that only Production requires, such as `ALERT_WEBHOOK_URL`, fails nothing on a pull request, since its preview builds without it, then fails every production build once merged, while the site stays on its last good deployment and `Check` stays green (#276). So after changing a variable in Vercel's dashboard, read the `Vercel` status of `main`'s next commit, or redeploy, since a variable reaches a deployment only at its build (inferred from a redeploy that passed).
