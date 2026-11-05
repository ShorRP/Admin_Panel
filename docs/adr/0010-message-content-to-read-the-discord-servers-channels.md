---
status: accepted
---

# The panel reads the Discord server's channels with the Message Content intent, and keeps no copy

The Admin Panel shows the game log, the support tickets in progress and every ticket archive, all read from Discord's channels through its REST API, and filters them through Discord's guild message search rather than a store of its own, as ADR 0004 and ADR 0009 already keep the audit log and the archives in Discord. The game log is posted by another author, a webhook of the game server (inferred from its author, « ShorAPP », which holds no role on Shor, `discord-audit-shor.txt` of ShorBot, 2026-11-04), and a support ticket's messages by the members and the staff, so the panel needs the Message Content intent of the Discord application it shares with the Bot (ADR 0008), without which Discord empties the content and the embeds of a message another author posted; the search requires it too (https://docs.discord.com/developers/change-log, 2026-03-19, as ADR 0009 reads it). Decided by Gilles on 2026-11-05, while grilling the logs' pages and the support tickets' page.

The intent is turned on in the Developer Portal for « Shor Panel » and « Shor Panel Dev ». The panel uses it through REST alone: the Bot does not ask for it when it connects to the gateway, so ShorBot's ADR 0004 holds and the Bot still reads no message's text.

The game log's format, the title `<category> · <action>`, its fields and its footer `Shor · <hash>`, is a contract between the game server and the panel, as the archive's embed is between the Bot and the panel (ADR 0009). Anyone who holds the webhook's URL can post a line in its format, so the panel keeps only the messages whose author is that webhook's ID, which its configuration holds beside the channel's, as it keeps only the Bot log's messages whose author is the application.

## Considered Options

- **A store fed by the panel or by the Bot** (Neon, #174, #175): a second copy of what Discord keeps, with its retention and its personal data, for a filter Discord's search gives.
- **Reading the channels' history page by page and filtering in memory**, as a record reads its archives (ADR 0009): bounded by the pages read, 1,000 messages for an archive, where a log channel grows by the hour.

## Consequences

- `docs/personal-data.md` and `/privacy` say what the panel now reads without keeping: the game log's characters, game accounts and places, and the support tickets' conversations in progress.
- Whether the search reads the text of an embed, which holds the whole of the game log and of an archive, is not established: the first ticket of the work tries it against the test Discord server, and a filter it cannot serve is done in memory over the pages read.
- The application needs View Channel and Read Message History on the channels it reads, which Gilles grants on Shor.
