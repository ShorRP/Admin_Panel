# Blocked links

The reference behind `.claude/rules/blocked-links.md`: what the exempt roles, the exempt channels and the action of the link rule are, what was measured on Discord for them and what stays open. The rule says what to do; this file says how it was known. #483 wrote the exempt roles, #484 the exempt channels and #485 the action; ADR 0011 holds the rest of the link rule's trials.

## Exempt channels

### Facts

- Discord documents an AutoMod rule's `exempt_channels` as "the channel ids that should not be affected by the rule (Maximum of 50)". The page names no channel type, no category and no thread, and describes the `MESSAGE_SEND` event as "when a member sends or edits a message in the guild" (https://docs.discord.com/developers/resources/auto-moderation, read 2026-11-17).
- On the test Discord server, a throwaway probe against `POST /guilds/{guild.id}/auto-moderation/rules`, whose rule it deleted, got a 400 of code 50035 with the error code `INVALID_AUTO_MODERATION_CHANNEL_IN_EXEMPTIONS`, "An exempt channel id specified no longer exists", for 1, 2 and 50 channel IDs that do not exist, a 400 with `SET_TYPE_ALREADY_CONTAINS_VALUE` for the same ID sent 2, 50, 51 and 100 times, and a 200 for one channel that exists (2026-11-17, #484, seen). So `exempt_channels` is a set of channels that exist, and 50 or 51 cannot be sent without 50 channels.
- The test Discord server listed 16 channels that day: 5 categories, 6 text channels and 5 voice channels (`GET /guilds/{guild.id}/channels`, 2026-11-17, #484, seen). Trying the 51st would mean creating 34 channels there at least, a lasting change that #484 did not make, so the contract suite holds no test of the 50.
- `listChannels` gives no thread, a thread not being in `GET /guilds/{guild.id}/channels` (inferred from the endpoint's name; `.claude/rules/discord.md`, **The Discord seam**), and leaves out the channels the application cannot view (#384).

### Decisions

(decided by the agent on 2026-11-17, on #484, for Gilles to review)

- **Which channels the staff can exempt.** A text channel, an announcement channel and a category: #484 says « un salon textuel, ou une catégorie », so this is its smallest reading, an announcement channel being a text channel of another type (`APINewsChannel` is an `APIGuildTextChannel`, `node_modules/discord-api-types/payloads/v10/channel.d.ts:133`). Voice, stage, forum, media and directory channels are left out, and `isExemptableChannel` and `UNEXEMPTABLE_CHANNEL_REFUSAL` are what widening it changes. A voice and a stage channel are text-based (`channel.d.ts:58`), so that AutoMod probably scans their text chat (inferred), and a forum's and a media channel's posts are threads (`channel.d.ts:311`): whether exempting the channel exempts them is not documented, and no trial tried it, so the panel does not promise it.
- **A category counts as an exempt channel**, since Discord lists a category among the channels of the Discord server (`GET /guilds/{guild.id}/channels`, 5 of the test server's 16, 2026-11-17, seen). So the `GLOSSARY.md` entry **Exempt channel** changed, from « A channel of the Discord server where the link rule lets any member post any link » to « A text channel, an announcement channel or a category of the Discord server where the link rule lets any member post any link », so that the term names what the panel offers (decided by the agent on 2026-11-17, on #484, for Gilles to review). It is written `Jeux (catégorie)` and a channel `#galerie`, in the chips, the choice, the messages and the audit log's reasons, so that the two read apart wherever they show.
- **The choice groups the channels by category** in an `<optgroup>`, with the category itself first, then its channels, and the channels with no category before the groups, each level in French alphabetical order (`Intl.Collator("fr")`). `GuildChannel` carries no `position`, so Discord's own order is not followed. Adding `position` to the seam would lift that, with a line more in the contract suite.
- **The page always reads the channels**, since the choice needs them, where #481 read them only when the rule exempted one: a failing read is thrown like the roles' (`CLAUDE.md`, **Read failures**).
- **The 50 is held by the fake and by the panel's check.** The fake refuses more than 50 `exempt_channels` as Discord documents (`src/discord/fake-discord.ts`, `fake-discord.test.ts`), and `addExemptChannel` refuses the 51st in its own message first, so that Discord's 400 stays a panel error.
- **The fake does not refuse a channel that does not exist**, as Discord did: its `listChannels` leaves no channel out, so a test that stands for a channel the application cannot view leaves it out of the state, and a fake that refused the unknown would refuse that test's rule. Discord is inferred to accept a channel that exists and that the application cannot view, which no trial tried.

### Open

- What Discord answers to a 51st exempt channel: not measured.
- Whether Discord keeps in a rule the ID of a channel that was deleted, and then refuses with the 400 above any write that sends it again: not tried. A removal sends the list without it, so the cross of a « Salon introuvable » chip is the way out, but an add or a removal of another channel beside it could meet that 400, which would be a panel error (inferred).
- Whether exempting a category exempts the channels it holds, and a text channel its threads: the ticket decides the first, and neither is documented or tried (inferred).

## Exempt roles

### Forms

Moved here from `.claude/rules/blocked-links.md`, **Forms**, with their marks, when #485 needed the room.

- « Rôles exemptés » holds `StatefulAddExemptRoleForm` and `StatefulExemptRoleList`, each with its own `useActionState`, and its section takes both as props. The choice is a `NativeSelect` named `role`, whose value is the role's ID, with a first choice « Choisir un rôle » and the roles by hierarchy (`rolesByHierarchy`) that the rule does not exempt, `readLinkRule`'s `exemptableRoles`, without @everyone and the roles an integration manages; The staff role has no cross and the section says so (`staffRoleId` of the settings); the other chips, a role Discord no longer lists included, have the same cross as a domain, that of a role Discord no longer lists named « Retirer « Rôle supprimé » (ID) » so that two of them differ for assistive technologies (#483). With no role left to choose, the choice reads « Aucun autre rôle » and is disabled with its button (decided by the agent on 2026-11-17, on #483, for Gilles to review).
- The form is its own `@container`: its choice and its button stack under 28 rem (`@md:`, 448 px) and share a row from it, which the single column reaches from a viewport of 488 px, while the side column, 280 px, stacks them at every width (`CHOICE_FIELD_ROW_CLASSES`, `docs/responsive.md`). While the rule does not exist the form stays and refuses, as the domains' does (decided by the agent on 2026-11-17, on #483, for Gilles to review).

## Action

### Facts

- Discord documents, for a rule's actions, `BLOCK_MESSAGE` with a `custom_message`, "additional explanation that will be shown to members whenever their message is blocked", of a "maximum of 150 characters", `SEND_ALERT_MESSAGE`, which "logs user content to a specified channel", and `TIMEOUT`, of "a maximum of 2419200 seconds (4 weeks)". "A `TIMEOUT` action can only be set up for `KEYWORD` and `MENTION_SPAM` rules", which the link rule is, and "The `MODERATE_MEMBERS` permission is required to use the `TIMEOUT` action type". The page states no maximum number of actions on a rule (https://docs.discord.com/developers/resources/auto-moderation, read 2026-11-18 through a fetch tool's summary, #485).
- The panel's application holds Timeout Members already (`docs/discord.md:70`), so that a timeout of the link rule asks for no new permission, as the blocked words' do (ADR 0002).
- The notice of an exclusion is 121 characters for an hour and 119 for a day, the block sentence taking 73 (`String.prototype.length`, 2026-11-18, #485), under the documented 150.
- The contract suite creates a keyword rule that blocks with a notice and times out, reads it back, and checks the edges of the limits above (`src/discord/discord-api-contract.ts`, **AutoMod** of `docs/discord.md`).

### Decisions

(decided by the agent on 2026-11-18, on #485, for Gilles to review)

- **The three actions are a table**, `FIELDS` of `link-rule-action.ts`: label, right, timeout and notice. `newLinkRule` takes its block from it, so that the rule's first notice and « Bloquer seulement » are one text. The table is the link rule's own and imports nothing of `src/blocked-words/`, whose actions are a rule each, where this one rule holds one action at a time.
- **A write sends `actions` alone** (`withAction`): the new block, with the action's notice, and its timeout come first, then every action that is neither a block nor a timeout, in the order Discord held it, so that `SEND_ALERT_MESSAGE` and whatever else #486 or Discord put there leaves a change unchanged (`change-link-rule-action.test.ts` puts the alert before, between and after, through five changes).
- **A rule whose action is not one of the three is not changed.** `linkRuleActionOf` reads it as none: a block with another timeout, a timeout with no block, a block with an action that is neither a timeout nor an alert beside it. The section keeps « Réglée dans Discord », as #481 wrote it, and a forced write is refused in French with the action as typed, since writing would drop what the staff set in Discord, a notice, a duration or an action, that the page cannot show.
- **The notice follows the action when the action changes**, as the ticket says, and a change to the action the rule already has writes nothing and succeeds, so a notice that the staff reworded in Discord stays until the action changes, as two staff members who press together do not fail each other (`.claude/rules/blocked-links.md`, **Writes**).
- **The right** is checked twice, as blocked words' is: the chosen action before anything is read, so that a forced form throws even with the rule missing, then the action the rule has, on the rules read back, so that no one without a moderation role leaves an exclusion. `changeableActionOf` gives no change to such a staff member, « Bloquer seulement » being the only action theirs, so the section shows the action with no field and no button and says that an exclusion asks for a moderation role. It gives none for an action set in Discord either, and the section's sentence for that case, `ACTION_SET_IN_DISCORD`, is the refusal's message too, so that the two read alike.
- **With the rule missing** the form stays for a moderator and refuses, in the message of the other sections (`noRuleRefusal`), with the action as typed: creating the rule stays « Activer »'s.
- **The reason** is `changement de l’action de la règle des liens, de « Bloquer seulement » à « Exclusion 1 heure »`, in the panel's format, so that the audit log attributes it and names both actions; it lists as a link line, generic (`.claude/rules/audit-log.md`, **The link rule's lines**).
- **A rule that is cut keeps its action changeable**: the write touches `actions` alone, so that `enabled` stays as it was.

### Open

- A PATCH of `actions` on the link rule's regex rule, which Discord accepts: not tried on the test Discord server, `src/discord/` being unchanged and the contract suite not run for #485. The contract's rule is made with keywords and its edge checks are refusals.
- Whether AutoMod's timeout spares the members whom a timeout by the panel cannot reach, the owner, a member with Administrator or a higher role (`docs/discord.md:27`): not documented, not tried.
