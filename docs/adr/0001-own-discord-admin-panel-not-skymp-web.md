---
status: accepted
---

# The Admin Panel is its own Discord-administration app, not Shor's copy of skymp-heavy-rp's web panel

Shor is very probably built on [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp), whose `apps/web` is already a staff panel (whitelist review, audit, characters, economy) and also the players' identity backbone: launcher login and the SkyMP master session check (`apps/web/server.js:707`). We build a separate panel that only administers the Discord server, with its own stack and hosting, instead of taking over `apps/web`: the staff asked for Discord administration, and owning `apps/web` would make this project responsible for who a player is in the game. Decided by Gilles on 2026-10-23.

## Considered Options

- **Take over `apps/web` as Shor's panel**, as ShorBot did with `apps/bot-discord`, and add Discord administration to it. One panel and one login for the staff, and the bot contract already wired, but it inherits game-critical identity code, the MariaDB shared with the gamemode, untyped Portuguese JavaScript and the AGPL.
- **Rewrite `apps/web` in a new stack.** Too large, and it risks breaking launcher login and in-game identity.

## Consequences

- While `apps/web` runs for the game, the staff may have two panels and two logins, and two sources of staff authority: Discord roles here, the `staff_roles` table there.
- Folding this panel into `apps/web` later stays cheap as long as state lives in Discord where it can (ADRs 0002 and 0004), the Discord-administration logic stays independent of the web framework, and any audit row we store ourselves keeps the shape of `apps/web`'s `audit_logs` (action, actor, target, details, date), with the actor identified by Discord ID.
