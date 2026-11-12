---
paths:
  - "src/ticket-archives/**"
  - "src/support-tickets/**"
  - "src/app/(staff)/support-tickets/**"
  - "e2e/support-ticket*.test.ts"
  - "e2e/ticket-archives.test.ts"
---

# Support tickets

What `/support-tickets` shows, the support tickets still open (#388) and the archives of the closed ones, which the Bot posts in the archives channel and the panel reads there (ADR 0009, #385, #386), and what a record shows under its history, the archives of the tickets its account opened (#197, #387). The tests of `src/ticket-archives/`, `src/support-tickets/` and `e2e/support-ticket*.test.ts` name each case. What a view costs in calls to Discord, what the staff see at the limits of the search and the values of the configuration are in `docs/support-tickets.md`: read it before adding a search to a page or to a record.

## The support tickets' page

- `/support-tickets` is open to the whole staff, as the archives channel is (#385). A name is a link to the account's record for a staff member who moderates, `recordHrefForModerator`, and text for another, each on a line of its own, since a link inside a sentence is exempt from the 44 px that #385 asks (`CLAUDE.md`, **Responsive**).
- Each skeleton wears the layout constants of what it stands for, in `support-ticket-archives-layout.ts`, `ticket-archive-layout.ts` and `open-support-tickets-layout.ts`, so that the content replaces it with the same layout (#385, #388; `docs/responsive.md`, **`/support-tickets`**).

### The tickets in progress (#388)

- A channel is a ticket when it is a text channel of `TICKET_CATEGORY_ID`, named `{emoji}・{name}` after one of ShorBot's four request kinds, with exactly one member overwrite that allows View Channel, the opener's. That format is a contract with ShorBot (ADR 0009, ShorBot's ADR 0008): `request-kind.ts` and `ticket-opener.ts` change with its side, in two PRs that name each other.
- A staff member sees a ticket only if they view its channel on Discord, `viewsChannel` (#384), so that the panel never shows more than Discord does.
- Tickets run oldest first, since the oldest has waited longest (decided by the agent on 2026-11-05, on #388, for Gilles to review).
- A ticket reads its last 100 messages and says « 100+ » when the page is full, which includes a ticket of exactly 100 messages, since Discord returns 100 messages at most a call and 100 cannot be told from 101 without a second call for each full ticket (decided by the agent on 2026-11-05, on #388, for Gilles to review).
- A category left out of the configuration says that it is not configured, and a category with no ticket that the staff member views says « Aucun ticket n’est en cours. », which tells nothing of the tickets they do not view (decided by the agent on 2026-11-05, on #388, for Gilles to review).

## The reader

- An archive is a message of the application that follows `ticketArchiveOf`'s contract, the embed of ADR 0009. `searchTicketArchives`, which every read of archives goes through, checks the author again beside `author_id`, so that a message a member forged stays out even if the search let it through (`search-ticket-archives.test.ts`).
- `request-kinds.ts` mirrors ShorBot's four `REQUEST_KINDS` with their emoji and label, a contract that joins ADR 0009 (ShorRP/ShorBot#91), and `src/support-tickets/request-kind.ts` mirrors them for a channel's name.

## The filters (#386)

- Discord's search serves one text per view, since it finds the words of one text of a message and never those of two (ADR 0010), while an archive's account ID, reason and kind sit in three fields. So `readTicketArchivePage` reads a page served or windowed (decided by the agent on 2026-11-05, on #386, for Gilles to review, since #386 names the filters and not what Discord serves of them).
- Served, with no opener, closer, reason or period on the opening, Discord pages and counts: the kind is the search's text, its emoji, a word of the search for each of the four kinds (ADR 0010), and the period on the closing is the message's time, as `min_id` and `max_id`. The total is Discord's, so it counts an archive of another kind that cites the emoji in its reason, which the page leaves out (`read-served-page.test.ts`).

### Windowed

- With an opener, a closer, a reason or a period on the opening, Discord's text can serve only one filter, so `readWindowPage` reads the first 100 messages Discord finds (`WINDOW_SIZE`) and checks every filter in memory, exactly. The text Discord is given is the first of the opener's ID, the closer's ID and the reason's longest term, never the kind's emoji, so that the window holds every kind and the pills count them all under the other filters (decided by the agent on 2026-11-05, on #386, for Gilles to review).
- A reason is searched by one term, since Discord skips two words at most between those of one text (ADR 0010), and checked by every word, whole, whatever the case and the accents, an apostrophe, U+2019, joining the letters around it, as `src/discord/search-words.ts` and the fake follow (decided by the agent on 2026-11-05, on #386, for Gilles to review).
- A period on the opening reads from `from` on, oldest first, since a ticket closes after it opened, and with `to` alone the 100 oldest archives (inferred, since Discord offers no bound on the opening; decided by the agent on 2026-11-05, on #386, for Gilles to review).

### Accounts and counts

- A name typed as opener or closer is resolved by `resolveAccounts` against the Discord server's members and banned accounts: one account is the account, none or several give no archive and say so. An ID or a mention is the account, member or not, while an account that left the Discord server without a ban has no name to look up and is found by its ID (decided by the agent on 2026-11-05, on #386, for Gilles to review).
- The counts of the kinds are read after the list and never with it, and the pills show without numbers, no skeleton, until they come, since the counts spend the same search burst as the list: a refusal of theirs then costs the numbers and not the page (ADR 0010; `e2e/support-ticket-filters.test.ts`; decided by the agent on 2026-11-05, on #386, for Gilles to review).

## What the staff see past the limits

Discord refuses an `offset` past 9,975 (ADR 0010), so a served page reaches the 10,000 newest messages, 400 pages at most, and a window the first 100, and the page says what it did not read, a page past the last being read as the first (decided by the agent on 2026-11-05, on #385, for Gilles to review). The page says nothing of the index's lag (`docs/support-tickets.md`, **What the staff see**).

## The search's rate limit

Discord rate limits the search tightly (ADR 0010; the figures are in `docs/support-tickets.md`, **Why a record reads 100 archives**), and the client waits only for a 429 of 2 s or less (`.claude/rules/discord.md`, **Errors and retries**). A page that meets a longer one fails as Discord unavailable: nothing catches it, `error.tsx` replaces the page with « Réessayer », and no alert goes out (`.claude/rules/monitoring.md`). So a search added to a page or to a record spends the burst of every view: count it in `docs/support-tickets.md`, **Calls per view**.

## A record's ticket archives (#197, #387)

- A record searches the archives channel at each view, when the configuration names one: the application's messages whose text holds the account's ID, 25 a search, one search after another, up to `MAX_CITING_ARCHIVES_READ` messages (100). It keeps no copy of any of it, not even a cache (ADR 0009). `TicketArchiveList` draws the card after the history, and `RecordColumns` of `src/records/` places it.
- The ID is a word of an archive's « Ouvert par » field, of its « Fermé par » field and of its reason if a closer quotes it, and Discord's search cannot tell the fields apart (ADR 0010), so it finds a superset: `readTicketArchives` keeps the archives whose opener is the account, and shows one archive once if the search shifted between two pages (`read-ticket-archives.test.ts`).
- An account cited in more than 100 archives, in practice a staff member who closed many tickets, shows only the tickets it opened among the 100 newest that cite it, and the card says that its older tickets may not show. The 100 is the agent's, against the ticket's « tous les tickets du compte », since the search's rate limit leaves room for no more searches in a burst (ADR 0010; `docs/support-tickets.md`, **Why a record reads 100 archives**) (decided by the agent on 2026-11-05, on #387, for Gilles to review).
- An account cited in more than 100 archives none of which it opened says « Aucun ticket de support de ce compte parmi les archives lues. » where « Aucun ticket de support archivé pour ce compte. » would say that it opened none, which the read cannot know (decided by the agent on 2026-11-05, on #387, for Gilles to review).

## Read failures

Every read of this folder is thrown on failure and `error.tsx` replaces the page (`CLAUDE.md`, **Read failures**), but for these.

- The count of each request kind in the pills is exempt: `readKindCounts` gives none when a search throws a `DiscordError` that says Discord is unavailable, a 429 over the 2 s included, and the pills show without numbers while the list stays. Any other error is thrown, a `DiscordError` that is a panel error included, so that it alerts (#386; `read-kind-counts.test.ts`, `.claude/rules/monitoring.md`).
- A record's archives are not exempt: a failure of the search or of a closer's name replaces the whole record, its sanctions with it, so that a permission the application lacks on the archives channel, a 403 of code 50001, fails every record and alerts until it is granted (decided by the agent on 2026-11-05, on #197, for Gilles to review). A 429 over the 2 s does the same with no alert: a record whose search is rate limited shows no card, since #387 asks that the card not change (decided by the agent on 2026-11-05, on #387, for Gilles to review).
- The tickets in progress are not exempt but for a ticket whose channel is gone when its messages are read, because it closed in the seconds between the two reads (Unknown Channel, code 10003): it is left out, and any other failure, a 403 of code 50001 for want of View Channel on one ticket's channel included, replaces the whole page, the archives with it (#388; the exemption decided by the agent on 2026-11-05, on #388, for Gilles to review).

## Configuration

- `TICKET_ARCHIVES_CHANNEL_ID`, the channel where the Bot posts the archives, is an optional snowflake that `src/ticket-archives/env.ts` reads (`.claude/rules/env.md`, **Variables**): left out, a record says that its archives are not configured. Production needs it set in Vercel's dashboard, which only Gilles does, and a variable reaches a deployment at its build (`.claude/rules/env.md`) (decided by the agent on 2026-11-05, on #197, for Gilles to review).
- `TICKET_CATEGORY_ID`, the category where the Bot creates each ticket's channel, follows the same rules, and `/support-tickets` says that the tickets category is not configured when it is left out (#388). Both are named as ShorBot names them, where the code says « tickets category » and « archives channel », the terms of `GLOSSARY.md` (decided by the agent on 2026-11-05, on #388, for Gilles to review). The IDs on Shor and on the test Discord server are in `docs/support-tickets.md` and the README.

## Tests

`archiveMessage` poses an archive in a test, and `archive-message.test.ts` holds its embed to the one ShorBot builds (`archive_embed`, `shorbot/support_tickets.py`): change both when the contract changes (ADR 0009). `supportTicketChannel` poses a ticket's channel with the overwrites ShorBot writes, and `channelIdAt` dates its ID (#388). Both stay in test files (`CLAUDE.md`, **Feedback loops**).
