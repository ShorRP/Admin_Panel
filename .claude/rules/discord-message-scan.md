---
paths:
  - "src/discord/scan-messages.ts"
  - "src/discord/scan-messages.test.ts"
  - "src/discord/period-bounds.ts"
  - "src/discord/period-bounds.test.ts"
  - "src/discord/message-search-limits.ts"
---

# Scanning a channel's messages

How the game log and the Bot log read what one author posted in a channel through Discord's search (#394, #395, #396), as part of `src/discord/` (`.claude/rules/discord.md`). `docs/discord.md`, **Scanning a channel's messages**, says what a view costs and where the scan stops. The rule is a file of its own, scoped to these files, since `discord.md` has no room left under its 15,000 bytes (decided by the agent on 2026-11-13, on #452, for Gilles to review).

- `scanMessages` makes at most `MAX_SEARCHES` (4) searches of `SEARCH_PAGE_SIZE` (25) messages of the channel and the author, newest first, serving one term as `content` when the caller has one, and keeps the messages that the caller's `keep` accepts until it holds 25. It returns `{ entries, older, cut }`: a search that comes back short ends the scan with `older` null; a full page leads on from the last message kept; 4 searches that leave fewer are `cut` and lead on from the last message read, which `LogCutNote` and `cutEmptySentence` of `src/ui/log-cut.tsx` say on the page. The 4 is the support tickets' window (`.claude/rules/support-tickets.md`, **The filters**), against the search's rate limit (ADR 0010).
- Pages go by cursor, not by offset: `older` is the ID that the next view sends back as `before`, which becomes `max_id`, so that no page meets the search's offset limit of 9,975 and a message posted between two views pushes no line from one page to the next. « Plus anciens » shows from a full or a cut page, never from `total_results`: the contract suite shows `total_results` counting every page of a search with no bound and never under a `min_id` or a `max_id`, so that an older page whose total counts only what lies under its `max_id` is not proven (decided by the agent on 2026-11-06, on #394, for Gilles to review, after the review of #394).
- `searchBounds` takes the nearer of the cursor and the end of the period as `max_id`, and gives nothing, so that no search is made, when the period ends before it starts or when no ID can lie between the two bounds, which spares a search whose answer for a reversed range was not tried. `periodBounds` turns a period's two dates into the `min_id` and the `max_id` that the search takes, and takes dates, not days, so that `src/discord/` imports nothing from `src/ui/`, which holds the Paris days (`parisPeriodOf`, `src/ui/paris-day-bounds.ts`) (decided by the agent on 2026-11-06, on #394, for Gilles to review, after the review of #394).
- `MAX_SEARCHED_TEXT_LENGTH`, 1,024, is the length of a text that Discord's search takes (ADR 0010): the filters of the logs and of the support tickets' archives bound what they serve by it.
