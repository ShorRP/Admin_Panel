---
status: accepted
---

# The staff role is re-checked with the panel's application token on every page and every write, and every write requires a StaffMember

Every page and every domain write first reads the member from Discord with the panel's application token, `GET /guilds/{guild.id}/members/{user.id}`, through `requireStaffMember` in `src/staff/`, which the login callback also runs before it opens a session. It returns a `StaffMember`, a branded type holding the member's Discord ID and current name, and every domain write requires one and builds its `X-Audit-Log-Reason` from it (ADR 0004), so a write that skips the check fails to compile, short of a deliberate cast. The member's own OAuth2 token serves once, for `/users/@me` with the `identify` scope, and the session keeps only the member's Discord ID. Decided by Gilles on 2026-10-23, while grilling #47: it drops the `guilds.members.read` scope #10 had chosen, and extends #10's re-check from writes to reads.

The check itself is a function of `src/staff/` that takes a Discord user ID and returns a `StaffMember`, or `null` for a member who is not on the Discord server or lacks the staff role. `requireStaffMember` reads the session, calls it, and redirects instead of returning a failure: to `/login` without a readable session, to `/login/refused` when it gets `null`. The login callback has no session yet, so it calls the function on the ID it has just read from `/users/@me` and redirects itself: to `/login/refused` on `null`, to `/login/failed` when Discord fails. The login pages under `/login` and the error pages run no check: they show nothing read from Discord. Clarified by Gilles on 2026-10-23, while grilling #49.

Facts behind it, read on 2026-10-23:

- A Server Action is "reachable via a direct POST request, not just through your application's UI", and "a page-level authentication check does not extend to the Server Actions defined within it" (`node_modules/next/dist/docs/01-app/02-guides/data-security.md:281` and `:339`, Next.js 16.4.2).
- Get Guild Member names no permission or intent; of the member endpoints, only List Guild Members requires the `GUILD_MEMBERS` privileged intent (https://docs.discord.com/developers/resources/guild).

## Considered Options

- **The member's OAuth2 token, kept in the session**, with the `guilds.members.read` scope and `GET /users/@me/guilds/{guild.id}/member`. The session would carry an access token that lives 7 days in Discord's example (`expires_in: 604800`, https://docs.discord.com/developers/topics/oauth2) and its refresh token, both to protect and to renew.
- **A re-check before writes only**, as #10 first decided. A member who lost the staff role would keep reading the blocked words and the audit log until their session ends.
- **A `staffAction` wrapper, an ESLint rule, or a test over every `actions.ts`.** Each can be forgotten: an action written without it still compiles.

## Consequences

- Every page view and every write costs one more call to Discord, to read the member.
- Logging out only ends the session, so it skips the check: a member who lost the staff role can still log out.
- `proxy.ts` only sends a visitor without a readable session to `/login`; it authorizes nothing.
