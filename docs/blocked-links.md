# Blocked links

The reference behind `.claude/rules/blocked-links.md`: what the exempt channels of the link rule are, what was measured on Discord for them and what stays open. The rule says what to do; this file says how it was known. #484 wrote the exempt channels; ADR 0011 holds the rest of the link rule's trials.

## Exempt channels

### Facts

- Discord documents an AutoMod rule's `exempt_channels` as "the channel ids that should not be affected by the rule (Maximum of 50)". The page names no channel type, no category and no thread, and describes the `MESSAGE_SEND` event as "when a member sends or edits a message in the guild" (https://docs.discord.com/developers/resources/auto-moderation, read 2026-11-17).
- On the test Discord server, a throwaway probe against `POST /guilds/{guild.id}/auto-moderation/rules`, whose rule it deleted, got a 400 of code 50035 with the error code `INVALID_AUTO_MODERATION_CHANNEL_IN_EXEMPTIONS`, "An exempt channel id specified no longer exists", for 1, 2 and 50 channel IDs that do not exist, a 400 with `SET_TYPE_ALREADY_CONTAINS_VALUE` for the same ID sent 2, 50, 51 and 100 times, and a 200 for one channel that exists (2026-11-17, #484, seen). So `exempt_channels` is a set of channels that exist, and 50 or 51 cannot be sent without 50 channels.
- The test Discord server listed 16 channels that day: 5 categories, 6 text channels and 5 voice channels (`GET /guilds/{guild.id}/channels`, 2026-11-17, #484, seen). Trying the 51st would mean creating 34 channels there at least, a lasting change that #484 did not make, so the contract suite holds no test of the 50.
- `listChannels` gives no thread, a thread not being in `GET /guilds/{guild.id}/channels` (inferred from the endpoint's name; `.claude/rules/discord.md`, **The Discord seam**), and leaves out the channels the application cannot view (#384).

### Decisions

(decided by the agent on 2026-11-17, on #484, for Gilles to review)

- **Which channels the staff can exempt.** A text channel, an announcement channel, which is a text channel's variant, and a category: #484 says « un salon textuel, ou une catégorie », so this is its smallest reading. Voice, stage, forum, media and directory channels are left out, and `isExemptableChannel` and `UNEXEMPTABLE_CHANNEL_REFUSAL` are what widening it changes. A voice or a stage channel has a text chat whose messages AutoMod scans, and a forum's or a media channel's posts are threads: whether exempting the channel exempts them is not documented, and no trial tried it, so the panel does not promise it.
- **A category counts as an exempt channel**, as the glossary's term is a channel of the Discord server and a category is one for Discord. It is written `Jeux (catégorie)` and a channel `#galerie`, in the chips, the choice, the messages and the audit log's reasons, so that the two read apart wherever they show.
- **The choice groups the channels by category** in an `<optgroup>`, with the category itself first, then its channels, and the channels with no category before the groups, each level in French alphabetical order (`Intl.Collator("fr")`). `GuildChannel` carries no `position`, so Discord's own order is not followed. Adding `position` to the seam would lift that, with a line more in the contract suite.
- **The page always reads the channels**, since the choice needs them, where #481 read them only when the rule exempted one: a failing read is thrown like the roles' (`CLAUDE.md`, **Read failures**).
- **The 50 is held by the fake and by the panel's check.** The fake refuses more than 50 `exempt_channels` as Discord documents (`src/discord/fake-discord.ts`, `fake-discord.test.ts`), and `addExemptChannel` refuses the 51st in its own message first, so that Discord's 400 stays a panel error.
- **The fake does not refuse a channel that does not exist**, as Discord did: its `listChannels` leaves no channel out, so a test that stands for a channel the application cannot view leaves it out of the state, and a fake that refused the unknown would refuse that test's rule. Discord is inferred to accept a channel that exists and that the application cannot view, which no trial tried.

### Open

- What Discord answers to a 51st exempt channel: not measured.
- Whether Discord keeps in a rule the ID of a channel that was deleted, and then refuses with the 400 above any write that sends it again: not tried. A removal sends the list without it, so the cross of a « Salon introuvable » chip is the way out, but an add or a removal of another channel beside it could meet that 400, which would be a panel error (inferred).
- Whether exempting a category exempts the channels it holds, and a text channel its threads: the ticket decides the first, and neither is documented or tried (inferred).
