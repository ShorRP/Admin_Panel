# Bot log

The reference behind `.claude/rules/bot-log.md`: where the variable points and what a view of `/bot-log` calls beside its searches. The rule says what to do; this file says what it costs. ADR 0009 holds the format of the Bot's lines, ADR 0010 what the search does, and `docs/discord.md`, **Scanning a channel's messages**, what a view costs in searches and where the scan stops.

## Configuration

The value of the variable, as the README documents it (`.claude/rules/bot-log.md`, **Configuration and access**).

- `BOT_LOG_CHANNEL_ID`: « 🔧・log-admin » `1550837163464327289` on Shor, and « log-admin » `1568022878765719651` on Gilles' test Discord server (ADR 0009, #390).

## Calls per view

- Beside its searches, a page makes one `getApplicationUser`, a `getGuild` and a `listChannels` (`.claude/rules/staff.md`, **Channel visibility**), one `getMember` for each distinct account its lines name, up to about 75 for 25 lines of three accounts, and a `getUser` for each that has left, which are other routes (inferred not to count against the search's limit).
