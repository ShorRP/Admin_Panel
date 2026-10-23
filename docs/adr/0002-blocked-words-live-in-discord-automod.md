---
status: accepted
---

# Blocked words live in Discord AutoMod, not in our storage

The Admin Panel manages blocked words as the keywords of one AutoMod rule it creates on the Discord server, through Discord's REST API, and reads that rule back from Discord on every view: Discord does the filtering and holds the list. This needs no change to the bot and no storage of our own, at the cost of AutoMod's limits and of granting Manage Server to the panel's own Discord application, kept apart from the bot's so neither project can break the other. Decided by Gilles on 2026-10-23.

AutoMod limits, from https://docs.discord.com/developers/resources/auto-moderation on 2026-10-23: 6 keyword rules per server; per rule, 1,000 keywords of up to 60 characters, 10 regex patterns of up to 260 characters and 100 allow-list entries; actions are block the message, alert a channel, or time out the member (up to 4 weeks, which also needs Moderate Members).

## Considered Options

- **A new endpoint on the bot** that the panel calls: changes loanspac's bot and requires exposing it from the VPS.
- **The bot filters messages itself** from a list we store: needs the Message Content privileged intent and filtering code in the bot.
- **Sharing the bot's Discord application and token**: the token would live in two places, and resetting it would take down both the bot and the panel.

## Consequences

- A change made directly in Discord's AutoMod settings shows up in the panel but not in our audit log; Discord's own audit log records it.
- AutoMod rules the staff create by hand in Discord are shown read-only.
