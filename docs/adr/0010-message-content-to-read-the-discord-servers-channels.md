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
- The search reads the text of an embed, which holds the whole of the game log and of an archive, and serves the filters listed under **What the search does**; a filter it cannot serve is done in memory over the pages read.
- The application needs View Channel and Read Message History on the channels it reads, which Gilles grants on Shor.

## What the search does

Established by #383 on 2026-11-05, against Gilles' test Discord server, with « Shor Panel Dev » (the Message Content intent on, `flags` 557056, #382), for `GET /guilds/{guild.id}/messages/search` (https://docs.discord.com/developers/resources/message, **Search Guild Messages**, read 2026-11-05). The probes posted test messages in a text channel the application reads, with the application's token and, once, through a webhook that Gilles created and deleted, and deleted what they posted. The contract suite (`pnpm test:contract`) proves what it can.

**Facts**

- It reads the text of an embed: its title, its description, its author's name, a field's name and a field's value, its footer, and the content of the message. Each of those is a text of its own (a probe and the contract suite).
- A word is found whole, whatever its case, with its accents (« résolu » is not found by `resolu`), never cut short, either end of it. A hyphen splits words, a number or an ID is a word, an emoji alone is found (probes).
- Several words are found when they sit within 2 words of one another in one text, in any order, which is the documented `slop` of 2; two words one apart are not found with `slop` set to 0. They are never found across two texts of a message, nor across two messages: a content and an embed, the title and a field, a field's name and its value, two embeds (probes).
- The filters served: `channel_id`, `author_id`, `min_id` and `max_id`, `limit` from 1 to 25, `offset` from 0 to 9,975, `sort_order`, and also `author_type`, `has` and `sort_by` set to `relevance`, which the panel does not use. A `limit` of 26, an `offset` of 9,976 and a text of 1,025 characters are refused with a 400 of code 50035. A blank text filters nothing, a text with no word, `«»`, finds nothing (probes and the contract suite).
- `min_id` and `max_id` are strict bounds: `min_id` set to a message leaves that message out, as does `max_id` (the contract suite).
- `author_id` serves a webhook's ID. A message that Gilles' webhook « Transcription Hook Test » (1567897986048983050) posted in the archives channel was found by its content, by the text of its embed, by `author_id` set to the webhook's ID, with and without a channel, and by `author_type` set to `webhook`, and not by `author_type` set to `bot`; the author of the message found is that ID, as its `webhook_id` (a probe, 2026-11-05).
- `channel_id` set to a channel the application cannot view, or that does not exist, is refused with a 403 of code 50001; among several channels, the one the application cannot view is left out and the others are searched (probes).
- `total_results` counts every page. It counted three deleted messages for a few seconds after their deletion, which the docs warn of (probe).
- It nests each message found in an array of its own, and flags it `hit` (probes).
- Not served: an opener apart from a closer. An ID in an archive's « Ouvert par » or « Fermé par » field is a word of that field, so the ID of an account finds its archives as opener and as closer alike (a probe); the mentions filter, `mentions`, does not see a mention inside an embed (a probe). A text cannot be limited to one field, so a reason is found with the words of the other fields, the request kind and the IDs among them.
- Its index lags. A message posted was first found by a search 8 to 58 s later (six probes), and the words of a message came later still: 39 s after a post, a search found an ID of an archive's field and not the ID of its other field, nor the word « archive » of its title, all found at 103 s on the same fixture posted again, and every answer held for three rounds up to 304 s. The contract suite retries what it expects a search to find every 5 s for 4 minutes. So a text search can miss a message for about 100 s after its post, where reading the channel's history does not.
- A page can hold fewer messages than it should. In the contract suite's first full run (2026-11-05), minutes after the post, a search with `min_id` and `max_id` gave one message where two were expected, and the same search found both on the retry. The docs warn of it: « search may return slightly fewer results than the limit specified when messages have not been accessed for a long time », and « Clients should not rely on the length of the `messages` array to paginate results » (https://docs.discord.com/developers/resources/message, **Search Guild Messages**, read 2026-11-05). Every expectation of the contract suite about what a search finds is therefore retried, not only the first.
- Its rate limit is of the `shared` scope: `X-RateLimit-Limit` was 6, a burst of 4 to 7 searches passed, then one call about every 4 to 5 s. The 429s carried a `retry_after` of 0.3 to 4.4 s and `X-RateLimit-Scope: shared` or `user` (a probe of back-to-back searches, then one search a second, 2026-11-05).
- Its index was ready: the first search of the Discord server and of each channel tried answered 200 at once, and no search of the probes or of the contract suite answered 202.

**Inferences**

- The Discord server of Shor may answer 202 with a `retry_after` at its first search, if its index is not ready: the docs say so for an entity that is not indexed (« Index not yet available. Try again later », code 110000), and the test Discord server could not show it. `searchMessages` retries a 202 once, then fails as Discord unavailable (`CLAUDE.md`, **Retries**).
- With the Message Content intent off, Discord empties the content and the embeds of a message another author posted, unless the application wrote it or it mentions the application (https://docs.discord.com/developers/events/gateway, **Message Content Intent**, read 2026-11-05). Whether the search then still finds such a message by its text was not tried, since the intent is on for both applications; the fake finds it by no text (`CLAUDE.md`, **The fake**).
- A period is served only by the time of the message, which for an archive is the time the Bot posted it, when the ticket closed (ADR 0009), not the time the ticket opened. So a filter on the opening, on the opener alone, on the closer alone, on the kind of request or on the reason alone is made in memory over the pages read.

**Constraint for #385 and #387**

The search allows about one call every 4 to 5 s, once a burst of a few has passed, and answers a call over it with a 429 whose `retry_after` reached 4.4 s, where the client waits for a `retry_after` of 2 s or less (`CLAUDE.md`, **Retries**). A page that searches several times in one view, or two views within a few seconds, can fail on the second 429 as Discord unavailable. #385 and #387 count their searches per view against that rate, and know whether another page exists from `total_results` and the offset, not from the length of a page.
