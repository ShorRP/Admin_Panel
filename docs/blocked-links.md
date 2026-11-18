# Blocked links

The reference behind `.claude/rules/blocked-links.md`: what the allowed domains' forms, the exempt roles, the exempt channels, the action and the alert channel of the link rule are, what was measured on Discord for them and what stays open. The rule says what to do; this file says how it was known. #483 wrote the exempt roles, #484 the exempt channels, #485 the action and #486 the alert channel; ADR 0011 holds the rest of the link rule's trials.

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

- A PATCH of `actions` on the link rule's regex rule, which Discord accepts: not tried. The contract suite patches `actions` of a keyword rule, which Discord accepted with an alert added, dropped and put back (2026-11-18, #486, seen), so a change of `actions` on the regex rule is inferred to work the same.
- Whether AutoMod's timeout spares the members whom a timeout by the panel cannot reach, the owner, a member with Administrator or a higher role (`docs/discord.md:27`): not documented, not tried.

## Alert channel

### Facts

- Discord documents `SEND_ALERT_MESSAGE` as "logs user content to a specified channel", its `channel_id` metadata as "channel to which user content should be logged", an "existing channel", and states no maximum number of actions, no permission on the alert channel and no rule on an empty `actions`. Creating and modifying a rule asks `MANAGE_GUILD`, which "Shor Panel" holds on Shor and on the test Discord server (https://docs.discord.com/developers/resources/auto-moderation, read 2026-11-18 through a fetch tool's summary, #486; `docs/discord.md`, **The application's permissions**). So the alert asks no new permission of the application, as far as the page says.
- The contract suite creates a keyword rule that blocks and alerts the first text channel of the test Discord server with "Shor Panel Dev", reads it back as created, drops the alert with a change of `actions` alone and puts it back: 45 tests of 45 by hand, on 2026-11-18, the one new test being this (#486, seen). Discord asked no permission beyond the role's, Manage Server above all. What the application holds on that channel itself, View Channel and Send Messages, is not isolated, since the channel tried is the first of the list (inferred).
- A text channel that the application cannot view is out of `listChannels` from 2026-11-16 (`.claude/rules/discord.md`, **The Discord seam**), so the choice offers only channels the application views.

### Decisions

(decided by the agent on 2026-11-18, on #486, for Gilles to review)

- **The partition of `actions`.** `linkRuleActionOf` ignores every alert and `withAction` keeps every action but the block and the timeout; `alertOf` reads the one alert and `withAlert` touches nothing but it: the two sections write the same array and keep each other's actions, whatever the order, which `change-alert-channel.test.ts` cycles through the page's own reads. An alert that stands before, between or after the block and the timeout is replaced and removed where it sits, and a new one is appended after the others.
- **What is set in Discord.** An alert the panel could not write back whole reads as `set-in-discord`: two alerts, one with no `channel_id`, and a lone alert, which is the rule's only action. The lone alert is the case where `linkRuleActionOf` reads the action as none too, and where removing the alert would leave the rule with no action, which Discord's page does not say Discord accepts. The section then shows « Réglé dans Discord » with `ALERT_SET_IN_DISCORD` and no form, and a forced write is refused with that sentence and the channel as typed, with nothing written. `linkRuleActionOf` filters every alert, so a second alert does not make the action foreign.
- **One form.** A native choice whose first option, « Aucun salon d’alerte », removes the alert, and « Changer », since the ticket speaks of « le choix et son bouton ». A channel the rule alerts that the choice does not offer, one that Discord no longer lists, shown as « Salon introuvable (ID) », or a voice channel set in Discord, shown as `#name`, is the choice's first option after « Aucun salon d’alerte » and is chosen, so that « Changer » never removes an alert that nobody asked to remove. Choosing it again succeeds with no write, as does choosing the channel the rule alerts, or none when it alerts none.
- **Which channels.** A text channel or an announcement channel, the channels where AutoMod posts a message; a category cannot receive an alert. Voice, stage, forum and media channels are left out as #484 left them out of the exempt channels, and `isAlertChannel` is what widening it changes. The choice groups them by category as #484's does, with no category among the options.
- **Open to every staff member.** An alert needs no moderation role, as `TIMEOUT` does: `requireStaffMember` alone guards the write.
- **The reasons** are `choix du salon d’alerte « #alertes »` and `retrait du salon d’alerte « #alertes »`, naming the channel, the one removed for a removal, so that the audit log lists them as link lines, generic (`.claude/rules/audit-log.md`, **The link rule's lines**). A channel that Discord no longer lists is named by its ID.
- **With the rule missing** the form stays and refuses in the other sections' message (`noRuleRefusal`), with the channel as typed.
- **The glossary term.** **Alert channel** is new in `GLOSSARY.md`: the text channel or announcement channel where AutoMod copies each message the link rule blocks, which the staff choose or leave out.
- **The personal data.** `docs/personal-data.md` and `/privacy` say that the alert copies a member's message into a staff channel, which stays there until a staff member deletes it (Gilles, 2026-11-16, while grilling #480, for the copy itself).

### Open

- **The channel's privacy is not checked.** The choice offers every text and announcement channel that the application views, a public one included, so that a staff member could copy blocked messages into a channel that every member reads. The section says what AutoMod does, not who reads the channel, and no ticket asks the panel to say it.
- What the alert shows, the member and the channel beside the message, is inferred from Discord's own alerts, which nothing of the panel reads; `/privacy` is written to the wider reading.
- What Discord answers to an alert for a channel that does not exist or that the application cannot view, to an empty `actions`, and whether the application needs View Channel and Send Messages on the alert channel: not tried. The fake accepts any alert channel and any `actions`, since it copies what Discord was seen to do.
- That AutoMod posts the alert whatever the member's role, the owner and Administrators excepted, as it blocks (ADR 0011): not tried, since no account of the test server was posted from.

## Allowed domains

Moved here from `.claude/rules/blocked-links.md`, **Forms** and **Writes**, with their marks, when #486 needed the room.

### Forms

- « Domaines permis » holds two client leaves, `StatefulAddAllowedDomainForm` and `StatefulAllowedDomainList`, each with its own `useActionState`, so that a refused add shows its message under the field, with the domain as typed, and a refused removal under the list; the section is a Server Component that takes both as props (`.claude/rules/components.md`, **Forms**, #482).
- The field has `autoCapitalize="none"` and `spellCheck={false}`, and the hint under it says what the rule blocks even for an allowed domain: a link in `http://`, a subdomain other than `www.`, to add apart, and a link glued to punctuation (ADR 0011).
- A domain stays a chip in `font-mono` with a `ghost` icon cross, named « Retirer « d » » in `sr-only`: 44 by 44 px under `touch:`, 28 by 28 with a mouse. Removing asks for no confirmation, since adding the domain back undoes it, and the chips have no `<ViewTransition>`, so the list draws no `<ul>` while it is empty (decided by the agent on 2026-11-17, on #482, for Gilles to review, since the ticket asks for none). While the rule does not exist, the domains that « Activer » would start with show with no cross, since a removal could only be refused (`removable` of `AllowedDomainList`, false for the status `absent`); the form keeps refusing, with the message that says to activate the rule first.

### The domain typed

- `submittedDomain` trims what the staff typed and lowers it, then refuses, in this order, an empty text, a scheme, a path, a query or a fragment, a leading `www.` in any case, a text that is no domain, and a domain longer than `MAX_DOMAIN_LENGTH`. A domain is ASCII labels of letters, digits and hyphens, two at least, ending in letters, so that an IP address and an accented name are refused; its 46 characters are the 60 of an allow list entry less the 14 of `https://www.` and `/*`, the longest of the four entries. Every refusal returns the domain as typed (#482; decided by the agent on 2026-11-17, on #482, for Gilles to review, for the IP address and the accents, which the ticket does not name).
