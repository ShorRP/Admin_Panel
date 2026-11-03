---
status: accepted
---

# The panel and the Bot share one Discord application

The Admin Panel and ShorBot, the Bot (`GLOSSARY.md`), use one Discord application: « Shor Panel », to be renamed « Shor », on Shor's Discord server, and « Shor Panel Dev » on Gilles' test Discord server. The panel keeps calling Discord's REST API alone, from Vercel; the Bot connects to the gateway with the same token, from the VPS. So Shor's Discord server holds one bot account for both. Decided by Gilles on 2026-11-03, while grilling his takeover of loanspac's features, which he develops on ShorBot's branch `dev-gilles`; ShorBot's ADR 0006 records it on the Bot's side.

This supersedes two passages of ADR 0003: the panel's own Discord application that "does put a bot user on the Discord server", distinct from the Bot's, and the panel's application that "may also answer interactions" through an Interactions Endpoint URL. ADR 0003's line between the two programs holds: the panel never connects to the gateway, and what reacts to Discord's events is the Bot's.

## Considered Options

- **Two applications, the panel's and the Bot's**, as ADR 0003 drew them: two bot accounts on Shor, each token holding only its own program's permissions. The panel's role sits low, at position 13 of 38 on 2026-10-29, so that a leak of its token touches neither the staff nor the bots above it (`CLAUDE.md`, **The application's permissions**).
- **The panel runs the Bot itself.** Vercel's functions hold no lasting connection, and the gateway needs one.

## Consequences

- **Permissions add up.** The one token holds the panel's permissions beside the Bot's, Manage Roles, Manage Channels and Move Members among them, and its role moves above the Membre role, which the Bot gives. Both are granted at the switch below, not before. A leaked token, from Vercel or from the VPS, gives all of them at once, and the VPS is a machine that other accounts reach.
- **Interactions belong to the Bot.** Discord sends an application's interactions either over the gateway or to an Interactions Endpoint URL, and the two "are mutually exclusive" (ADR 0003). The application keeps the gateway, so the panel sets no Interactions Endpoint: every interaction, the staff's slash commands of #150 included, is the Bot's, while #150's public pages stay the panel's.
- **The Bot gets a development environment**: « Shor Panel Dev » and the test Discord server, where ShorBot's ADR 0002 had it run in production only.
- **The switch.** Until the Bot's rewrite reaches the VPS, the code loanspac left keeps running with the token of loanspac's application. The first deploy of the rewrite switches to « Shor Panel », whose role then gets the Bot's permissions, and loanspac's application leaves Shor (ShorRP/ShorBot#18).
- **The rename to « Shor »** is a step in the Developer Portal that only Gilles can take. The docs that name « Shor Panel », the privacy policy among them, follow it in the change after it.
