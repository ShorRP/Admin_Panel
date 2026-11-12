# Support tickets

The reference behind `.claude/rules/support-tickets.md`: what each view of `/support-tickets` and of a record costs in calls to Discord, what the staff see at the limits of Discord's search, and where the two variables point. The rule says what to do; this file says what it costs and where the limits are. ADR 0009 holds the contract with the Bot, and ADR 0010 what the search does, measured on the test Discord server, its probes included.

## Calls per view

- The list of archives makes one search, one more when the page asked for lies past the last page of a served reading, and up to 4 for a windowed one. The counts of the kinds make 4 more searches when the page is not filtered and 3 under a kind, whose count is the total the list already holds, and none for a window, which counts in memory. So a page costs 5 searches of the burst when it is not filtered, 4 under a kind and from 1 to 4 for a window, each one more past the last page of a served reading (#386).
- A name typed for the opener or the closer costs 2 calls to the routes of the members and of the bans, and 1 more for each further 1,000 accounts, beside the searches (#386).
- Beside its searches, a page of archives makes a `getApplicationUser`, one `getMember` for each distinct opener and closer of the page, up to 50, and a `getUser` for each who has left: other routes, inferred not to count against the search's limit (#385).
- A record makes a `getApplicationUser` of its own, with no request-scoped `cache()` to share it, then one search for an account cited in 25 archives or fewer and up to 4 for one cited in more, which a staff member who closed many tickets meets (inferred, since the number of archives on Shor is not known), and for each distinct closer of the account's archives a `getMember` and, when that member has left, a `getUser`, in parallel (#387).
- The tickets in progress cost, for N tickets that the staff member views and D other authors, a `getGuild` and a `listChannels`, N `listMessages`, one for each channel and so each in a bucket of its own, and N + D `getMember`, with a `getUser` for an opener who has left, at most 5 at a time (`mapWithConcurrency`). That is about 110 calls for the 50 channels that ShorBot lets a category hold (ADR 0009), none of them through the search's limit. Discord's global limit, 50 requests a second, was not approached by any trial (inferred, #388).

## Why a record reads 100 archives

The record reads the 100 newest archives that cite the account, 4 searches of 25, where #387 asks for all of its tickets. The search allows about one call every 4 to 5 s once a burst of a few has passed, and 10 searches back to back were 7 answers and 3 429s of 1.2 s or less (ADR 0010, `probe-383-5.mjs`), so 4 searches fit the burst of a rested start. A record that read every page the search reaches, 400 at 25 an offset up to 9,975, would take about 30 minutes at that rate (400 × 4.5 s) and meet a 429 over the 2 s the client waits for long before.

## What the staff see

- When the archives channel holds more than the 10,000 messages the search reaches, the older ones show on no page until a filter that finds fewer reaches them, a kind, a period or an account (#385, #386).
- The total and the ranks count messages, not archives: `total_results` counts every message the application posted in the channel, and a message that follows no contract, a text or an embed under another title, is left out of its page and not out of the count, so that « 1–25 sur 312 » may sit over 24 archives. The archives channel holds only what the Bot posts (ADR 0009), so none is expected (inferred).
- Discord's index lags: a message was found 8 to 58 s after its post and a page may hold fewer messages than it should (ADR 0010, `probe-383-3.mjs` to `probe-383-9.mjs`), so an archive closed seconds ago may be missing for a while, and one that appears between two views pushes the archives after it one place down, so that the last archive of a page may show again at the top of the next (inferred). The next view shows it, and the page says nothing of it (#385).
- A period on the closing is the time of the message, which the Bot posts seconds after the ticket closes, so an archive closed in the last seconds of a day may sit on the other side of it from its « Fermé le » (inferred).
- A typed apostrophe of ASCII is not known to join the letters around it, as U+2019 does (ADR 0010; inferred, not tried).
- `e2e/support-tickets.test.ts` proves the error page and its « Réessayer » on a 429 of 4.4 s that the fake throws once, not what the real client does with one, which no test measured on this page. That « Réessayer » works a few seconds later on a record is not tried either (ADR 0010).

## Configuration

The values of the two variables, as the README documents them (`.claude/rules/support-tickets.md`, **Configuration**).

- `TICKET_ARCHIVES_CHANNEL_ID`: « 📃・transcriptions », `1562505523490848881`, on Shor. The test Discord server has had one since 2026-11-05, « transcriptions », `1567881753266229298`, in a ticket category, `1567881446415278191`, which Gilles created and which « Shor Panel Dev » views (#382, closing comment of 2026-11-05).
- `TICKET_CATEGORY_ID`: « ・TICKETS PRIVÉS ・ », `1559574907426439229` on Shor and `1567881446415278191` on Gilles' test Discord server. ShorBot names it `TICKET_CATEGORY_ID`, and the archives channel's `TICKET_ARCHIVES_CHANNEL_ID` (`shorbot/config.py:20` and `:21` at 9915eb7).
