---
status: accepted
---

# Blocked words live in Discord AutoMod, not in our storage

The Admin Panel manages blocked words as the keywords of one AutoMod rule it creates on the Discord server, through Discord's REST API, and reads that rule back from Discord on every view: Discord does the filtering and holds the list. This needs no change to the bot and no storage of our own, at the cost of AutoMod's limits and of granting Manage Server to the panel's own Discord application, kept apart from the bot's so neither project can break the other. Decided by Gilles on 2026-10-23.

AutoMod limits, from https://docs.discord.com/developers/resources/auto-moderation on 2026-10-23: 6 keyword rules per server; per rule, 1,000 keywords of up to 60 characters, 10 regex patterns of up to 260 characters and 100 allow-list entries; actions are block the message, alert a channel, or time out the member (up to 4 weeks, which also needs Moderate Members).

The panel recognizes its rule by its name, « Mots interdits du panel », among the keyword rules, and creates it, blocking the message, with the first blocked word added, never while reading. Each write re-reads the rule and changes its keywords alone, so an alert in a channel, or anything else the staff add to the rule in Discord, stays. Renamed in Discord, the rule stops being the panel's: it shows read-only, and the next blocked word added creates another, while a keyword rule given that name by hand becomes the panel's. Recognizing the rule by its creator, the panel's own application, would take a call to Discord that `DiscordApi` lacks, and would still need the name, since the contract suite creates its rules with that same application (`src/discord/discord-api-contract.ts`). Decided by Gilles on 2026-10-26, on #11.

## Considered Options

- **A new endpoint on the bot** that the panel calls: changes loanspac's bot and requires exposing it from the VPS.
- **The bot filters messages itself** from a list we store: needs the Message Content privileged intent and filtering code in the bot.
- **Sharing the bot's Discord application and token**: the token would live in two places, and resetting it would take down both the bot and the panel.

## Consequences

- A change made directly in Discord's AutoMod settings shows up in the panel but not in our audit log; Discord's own audit log records it.
- AutoMod rules the staff create by hand in Discord are shown read-only.
- Blocked words never apply to the server's owner, nor to members with Administrator or Manage Server: AutoMod spares them, as Discord's FAQ says, "Users with Admin and Manage Server permissions are always exempt from filter rules" (https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ, read 2026-10-26). On Gilles' test Discord server, which he owns, the panel's rule let his own message holding « machin » through, and blocked it from an account without those permissions (Gilles, 2026-10-27).
