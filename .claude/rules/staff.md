---
paths:
  - "src/staff/actions.ts"
  - "src/staff/can-view-channel*"
  - "src/staff/env.test.ts"
  - "src/staff/host-cookie.ts"
  - "src/staff/login.ts"
  - "src/staff/login.test.ts"
  - "src/staff/redirect-without-session*"
  - "src/staff/require-staff-member.ts"
  - "src/staff/session.ts"
  - "src/staff/staff-member.*"
  - "src/app/login/route.ts"
  - "src/app/login/callback/**"
  - "src/proxy.ts"
  - "src/proxy.test.ts"
  - "e2e/login.test.ts"
---

# The staff: session, login and access

How a staff member logs in, keeps a session and is checked on every page and write (ADR 0005, #10, #51), and how the panel tells which channels a staff member views (#384). The tests of `src/staff/` and `src/proxy.test.ts`, and `e2e/login.test.ts`, name each case. The sources, the trials and the Discord pages behind a line are in `docs/staff.md`: read it before changing the cookie, the login, the matcher of `proxy.ts` or `canViewChannel`. The login pages are in `.claude/rules/login-pages.md`, the navigation in `.claude/rules/staff-navigation.md`, the theme toggle and the logo in `.claude/rules/staff-theme-toggle.md`.

## The session

- The session is a cookie that iron-session 9 seals, encrypted and signed, holding only the member's Discord ID (ADR 0005). No session lives on the server, since the panel stores nothing (ADR 0004). Auth.js and Better Auth are set aside: each brings its own OAuth flow, which would replace `DiscordOAuth` and the two Route Handlers (#51).
- It is named `__Host-session`, with `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`, in development too (`host-cookie.ts`, `session.ts`). `Lax` and not `Strict`, since the return from Discord to `/login/callback` and a link to the panel clicked in Discord are navigations that start on another site, which a `Strict` cookie skips. `__Host-` costs nothing, and would matter under a domain of the panel's own (`docs/staff.md`, **The session**, for why another Vercel project cannot touch the cookie).
- Its lifetime is 7 days from the login, written into the seal's `ttl` and the cookie's `Max-Age`, and never extended: extending it would mean writing the cookie from `proxy.ts` or from every Server Action, since a Server Component cannot set one. A session ends when it expires, through « Se déconnecter » or, for every member at once, when `SESSION_SECRET` changes. None can be revoked on its own: the staff check on every request is what cuts a member's access (ADR 0005), so a stolen cookie is worth at most 7 days, and only while its member holds the staff role. `redirect-without-session.test.ts` proves the 7 days and that they are never extended.
- Logging out is a Server Action, `logOut`, which only ends the session, then sends the member to `/login/logged-out`, a static page that says so, with « Se connecter avec Discord » (Gilles, 2026-10-26, on #10; #236).

## OAuth2

- `/login` draws 32 random bytes as the `state`, in base64url, keeps them in a `__Host-oauth-state` cookie with `HttpOnly`, `Secure`, `SameSite=Lax` and a `Max-Age` of 10 minutes, and sends `prompt=consent`: `none` would send a member who clicks « Se reconnecter » back as the same account (`docs/staff.md`, **OAuth2**, for what Discord documents of it).
- The callback compares the `state` in constant time, deletes its cookie whatever the outcome, and goes to `/login/failed` when it is missing or differs, so of two logins started in two tabs, only the later one can succeed, and only if it returns first. A login always lands on `/`, with no return path in the URL, so no redirect is open.
- PKCE with S256 stays, as tried against Discord (`docs/staff.md`, **OAuth2**, #10). So `/login` also draws 32 random bytes as the `code_verifier`, in base64url, sends their S256 challenge, and keeps them in the same cookie, after the `state` and a dot, for the callback's exchange. `state` stays all the same, as #51 decided, since RFC 9700 relies on PKCE against CSRF only once the server is known to support it.
- The member's token is not revoked after `/users/@me`: it never leaves the callback's memory, and revoking it would revoke every token of that authorization, for one more call and one more failure. `iss` goes unchecked: Discord advises the check for a client of several providers.
- The callback throws nothing: a member who is not staff goes to `/login/refused`, any other failure to `/login/failed` (`.claude/rules/nextjs.md`, **Error pages**). Its Route Handler passes `createDiscordApi` and `createDiscordOAuth` themselves, which `completeLogin` calls inside its `try`, so that a missing variable is a panel error it reports too (Gilles, 2026-10-26, on #10).

## CSRF

- Nothing beyond what Next.js and the `Lax` cookie give: no token, and no `serverActions.allowedOrigins`. A Server Action takes only POST, and its `Origin` must match `Host`. A POST without `Origin` passes with a warning, but a browser sends `Origin` on a POST, and a client that does not carries no session cookie (inferred; `docs/staff.md`, **CSRF**, for the sources). `/login` and `/login/callback` are GETs that write nothing to Discord, and `state` covers the login itself.

## The staff check

- What starts with `requireStaffMember`, and what a domain write takes, is the invariant of `CLAUDE.md`, **The staff check** (ADR 0005); what follows is how the check behaves.
- `requireStaffMember` never returns a failure: it redirects to `/login` without a readable session, and to `/login/refused` a member who is not on the Discord server or lacks the staff role. It uses `redirect` rather than `forbidden()`, which needs `experimental.authInterrupts` and gives a Route Handler an empty body (`docs/staff.md`, **The staff check**). The login callback, which has no session yet, runs the same check by Discord user ID and redirects itself (ADR 0005).
- The pages under `/records` start with `requireModerationAccess` instead, which runs `requireStaffMember`, then calls `notFound()` for a staff member who holds no role of `MODERATION_ROLE_IDS`, so that they see the not-found page rather than `/login/refused` (ADR 0005, #176). So does the Server Action that changes a sanction, whose domain functions also throw for a `StaffMember` who does not moderate (#179, #180), or, for a ban or its lifting, who does not ban: `StaffMember`'s `opensBans` says whether, beside moderating, they hold a role of `BAN_ROLE_IDS` (#181).
- Like the staff check's redirects, `notFound()` takes effect in the part of the page under `<Suspense>`, so the page's static shell shows first and the response keeps its `200` (`docs/staff.md`, **The staff check**). The pages of `/records` follow `.claude/rules/records.md`, **The staff check**, `/game-log` and `/bot-log` follow `.claude/rules/game-log.md` and `.claude/rules/bot-log.md`. The not-found page that the `notFound()` of a page of `(staff)` shows is the panel's own, in French (`.claude/rules/nextjs.md`, **Error pages**, which says where it renders and what a URL that no route matches shows).

## Channel visibility

- `canViewChannel(discord, staffMember, channelId)`, in `can-view-channel.ts`, says whether a staff member views a channel of the Discord server, as Discord does, from the roles the staff check read in the `StaffMember`, the Discord server's owner and roles, and the channel's permission overwrites, in the order of the pseudocode of https://docs.discord.com/developers/topics/permissions (#384; `docs/staff.md`, **Channel visibility**, says what was read). The owner views every channel; a staff member's base permissions are @everyone's role with the permissions of each role they hold, and with Administrator among them they view every channel; then the channel's overwrite for @everyone applies, its denies removed and its allows added, then the allows and denies of the staff member's roles, taken together, denies removed first, then the staff member's own overwrite, the same way, and the channel is viewed when View Channel is left. An overwrite is matched by its ID alone, as the pseudocode does.
- A timed-out staff member is computed like any other, since a timeout leaves View Channel. A category is a channel like any other: asked for its own ID, the function computes from its own overwrites.
- The function reads a channel's own overwrites and never its category's, because Discord does: permissions are calculated by Permission Syncing and not inherited, so a deny on a category reaches a channel only as the overwrites the channel holds itself, copied from it while it was synced, and a channel de-synced from a category that denies is viewed or hidden by its own overwrites, which `can-view-channel.test.ts` proves in both directions, so that the panel never shows a staff member more or less than Discord.
- It reads the Discord server and the channels once each, through `getGuild` and `listChannels`; `viewsChannel(guild, channel, staffMember)` is the same computation over what a caller has already read, which `canViewChannel` calls, so that a page that checks a list of channels reads both once and asks `viewsChannel` for each.
- A channel that `listChannels` does not give is not viewed, whoever asks, since Discord stops listing the channels the application cannot view (`.claude/rules/discord.md`, **The Discord seam**), so that a channel the application cannot view reads as hidden from the staff members Discord shows it to. What the application needs on a channel to read it is in `.claude/rules/discord.md`, **The application's permissions**.

## `proxy.ts`

- `proxy.ts` sends a request without a readable session to `/login`, on every route but `/login`, everything under it, `/privacy`, which anyone reads and which reads nothing from Discord (#186), and static files: the callback opens no session for a member without the staff role, who would otherwise loop from `/login/refused` back through Discord. It authorizes nothing: each page runs its own check.
- What it catches and reports is in `.claude/rules/monitoring.md`, **What is logged**.

## Tests

- `proxy.ts` is the one entry point with a Vitest test: `unstable_doesMiddlewareMatch` and `getRedirectUrl`, from `next/experimental/testing/server`, check that everything under `/login`, `/privacy` and static files get through, and that any other route without a readable session goes to `/login`, `/privacy-notes` and `/privacy/archive` included (`docs/staff.md`, **`proxy.ts`**, for the name that Next.js's docs give the first). `redirectWithoutSession`, which it calls, is tested on its own over an in-memory `Monitor`: an expired or foreign seal, and an error it reports.
- The check by Discord user ID is tested in Vitest against the fake, a staff role removed between two requests included. `requireStaffMember` itself is covered end to end, since it reads `cookies()`, which throws outside a request, and redirects (`docs/staff.md`, **The staff check**).
- A `StaffMember` in a test comes only from that check, called on a fake that gives the member the staff role: no test writes `as StaffMember`. A type test in `src/staff/`, `staff-member.type-test.ts`, checked by `pnpm typecheck` rather than by Vitest's typecheck mode, proves that an object written by hand with the same fields is not a `StaffMember`.
