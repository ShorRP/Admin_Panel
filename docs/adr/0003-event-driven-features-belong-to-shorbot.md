---
status: accepted
---

# The Admin Panel never connects to Discord's gateway; event-driven features belong to ShorBot

The Admin Panel only calls Discord's REST API. Any feature that must react to Discord events, such as automatic sanctions, message logs or reaction roles, is built in ShorBot, loanspac's bot, behind an HTTP API agreed with loanspac before either side writes code for it. Shor keeps a single bot connected to the gateway. Decided by Gilles on 2026-10-23.

The panel's own Discord application (ADR 0002) does put a bot user on the Discord server, but that user never connects to the gateway: it only makes REST calls, when a staff member uses the panel. The docs call it the panel's application, never a bot. Clarified by Gilles on 2026-10-23, while grilling #7.

## Considered Options

- **The panel's own Discord application runs a gateway bot of its own on the VPS.** Independent from loanspac, but two bots doing neighbouring jobs, and it needs sudo and Node on a shared VPS this project does not administer.
- **The panel connects to the gateway with ShorBot's token.** Two sessions for one bot, which risks handling each event twice.

## Consequences

- The first such feature brings the link from Vercel to the VPS: a domain, a Caddy block in front of ShorBot's internal API (bound to `127.0.0.1:3002`), the `X-Internal-Secret` header it already checks, and the VPS admins' agreement.
- What the panel can do with plain REST calls, such as AutoMod rules, roles or channels, stays in the panel.
