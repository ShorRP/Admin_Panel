# Game log

The reference behind `.claude/rules/game-log.md`: where the two variables point, what a view of `/game-log` calls beside its searches, and the one doubt about Discord's index that no probe settled. The rule says what to do; this file says what it calls and what is not known. ADR 0010 holds what the search does and how the game server's lines are laid out, and `docs/discord.md`, **Scanning a channel's messages**, what a view costs in searches and where the scan stops.

## Configuration

The values of the two variables, as the README documents them (`.claude/rules/game-log.md`, **Configuration and access**).

- `GAME_LOG_CHANNEL_ID` and `GAME_LOG_WEBHOOK_ID`: « 🔧・log-jeux » `1552824453153423520` and the webhook « Shor » `1552824522292330506` on Shor; « log-jeux » `1568022814483685377` and its test webhook `1568023050346307647` on Gilles' test Discord server (#390, Gilles, 2026-11-05).

## Calls per view

- Beside its searches, the page makes the staff check's `getMember` and the `getGuild` and `listChannels` of `canViewChannel`, and the read asks no member, no user and no other route (the layout's own reads of the channels are in `docs/staff.md`, **The navigation**).

## The colon and the dot

The read never serves the action, the cell or the plugin as the term that Discord's search is asked for: the game server writes `administration:heal` and `3c:Skyrim.esm · …`, and the search's index may keep a word joined by a colon or a dot in one piece, as a standard tokenizer does and as it joins the letters around an apostrophe U+2019 (ADR 0010), in which case « heal » or « Skyrim » is no word of the index and a search for it would hide lines that the page keeps.

- **Inferred, unproven**: no probe has put a colon or a dot between letters in a message of the test Discord server and searched one side of it. A read of Discord's search on the test Discord server by Gilles, or a contract test that posts a message holding `administration:heal` and searches `heal`, would settle it; if Discord splits there, the three can join the terms.
- The same doubt holds for a text or a character typed as part of such a word, which the Bot log's text shares (`.claude/rules/bot-log.md`, **Reading**), the game log's text going to Discord as well.

## Tests

- The logout flow of `e2e/game-log.test.ts` sets a viewport 6,000 px high so that the pagination and the form are both in view, since a page of 25 lines is taller than 3,600 px.
