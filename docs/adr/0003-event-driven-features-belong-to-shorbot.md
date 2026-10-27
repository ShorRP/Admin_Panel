---
status: accepted
---

# The Admin Panel never connects to Discord's gateway; event-driven features belong to ShorBot

The Admin Panel only calls Discord's REST API. Any feature that must react to Discord events, such as automatic sanctions, message logs or reaction roles, is built in ShorBot, loanspac's bot, behind an HTTP API agreed with loanspac before either side writes code for it. Shor keeps a single bot connected to the gateway. Decided by Gilles on 2026-10-23.

The panel's own Discord application (ADR 0002) does put a bot user on the Discord server, but that user never connects to the gateway: it only makes REST calls, when a staff member uses the panel. The docs call it the panel's application, never a bot. Clarified by Gilles on 2026-10-23, while grilling #7.

The panel's application may also answer interactions, which Discord sends over HTTP to the Interactions Endpoint URL set in the Developer Portal: the buttons, select menus and modals of the messages the panel posts, and slash commands that do what a page of the panel does. Discord wants "an initial response within 3 seconds", and "Interaction tokens are valid for 15 minutes" for the rest (https://docs.discord.com/developers/interactions/receiving-and-responding, read 2026-10-27). That opens no gateway connection, so ShorBot stays the one bot on it, and the two ways "are mutually exclusive" for an application (same page). Anything else Discord does still reaches only the gateway, since its webhook events carry no event of a Discord server, such as a member joining or a message sent (https://docs.discord.com/developers/events/webhook-events, read 2026-10-27): a role given on a reaction is ShorBot's, a role menu of buttons on a message the panel posted is the panel's. Support tickets, which ShorBot's expected features open from a select menu, stay ShorBot's. Decided by Gilles on 2026-10-27, while grilling the features that follow the MVP.

## Considered Options

- **The panel's own Discord application runs a gateway bot of its own on the VPS.** Independent from loanspac, but two bots doing neighbouring jobs, and it needs sudo and Node on a shared VPS this project does not administer. The VPS stopped being a reason once Gilles administered it, and the decision holds on the first one (Gilles, 2026-10-27).
- **The panel connects to the gateway with ShorBot's token.** Two sessions for one bot, which risks handling each event twice.

## Consequences

- The first such feature brings a link from the panel to ShorBot, which exposes none: ShorBot was restarted on discord.py, and at `ef620dc` (2026-10-27) its `main.py` holds `/help` and `/ping` and no HTTP API (https://github.com/ShorRP/ShorBot/blob/ef620dc/main.py). Where that API listens and how it knows the panel are agreed with loanspac then.
- What the panel can do with plain REST calls, such as AutoMod rules, roles or channels, stays in the panel.
