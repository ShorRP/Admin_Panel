---
paths:
  - "src/link-rule/**"
  - "src/app/(staff)/blocked-links/**"
  - "e2e/blocked-links*.test.ts"
---

# Blocked links

What `/blocked-links` reads and writes: the link rule, the one AutoMod rule that blocks a link, read back from Discord at each view and switched on and off as a whole (ADR 0011, #479, #481). The tests of `src/link-rule/`, `e2e/blocked-links.test.ts` and `e2e/blocked-links-layout.test.ts` name each case. The page's layout at each width is in `docs/responsive.md`, **`/blocked-links`**; the trials behind the rule's shape are in ADR 0011.

## Names

- The section is « Liens », its URL `/blocked-links` and this rule's name come from the ticket, and its code sits in `src/link-rule/`, the folder of the glossary's **Link rule**, since `CLAUDE.md` names a section's folder after a term of `GLOSSARY.md` and « blocked link » is none (decided by the agent on 2026-11-17, on #481, for Gilles to review).
- Every staff member opens it and switches the rule: `requireStaffMember` and no role list (#481).

## The rule

- `linkRuleOf` finds the rule by its exact name, « Liens bloqués du panel », among the keyword rules; one that differs by a letter, a case or a trailing space is not the panel's, and « Activer » creates the panel's beside it (ADR 0002, #481). Two rules of that name read as the first.
- `newLinkRule` holds what ADR 0011 decides: the two regexes, the four `allow_list` entries of each of the eight default domains (`allowed-domains.ts`), the staff role exempted, the action « Bloquer seulement » with its notice. It sends no `keyword_filter`. A new setting of the rule changes that function and its test (`switch-link-rule.test.ts`).
- `allowedDomainsOf` reads a domain when the four entries are all in the list, and leaves every other entry to « Autres exceptions », in the rule's order, so that an entry added in Discord shows and stays through every write (ADR 0011).
- `linkRuleActionOf` reads the action from the rule's actions with `SEND_ALERT_MESSAGE` left out, so that #486's alert changes nothing of what the page says: « Bloquer seulement », a timeout of 3,600 or 86,400 seconds beside the block, or none, shown as « Réglée dans Discord » (#481).
- `/blocked-words` does not count the link rule, whose name none of its rules' names equals (`beside-blocked-words.test.ts`): its « Autres règles AutoMod » lists it by its name with no keyword, under « Elles se modifient dans Discord », which is not true of this one (a known limit, #481).

## Reads

- The page reads the rules once, with `readLinkRule`, through one promise that each section awaits under its own `<Suspense>` with its skeleton, as `/blocked-words` shares its rules'. Roles are read with it, since the staff role is always listed, and channels only when the rule exempts one, so that a failing read of the channels cannot fail a page that needs none (#481).
- A rule that does not exist reads as « absent » with what « Activer » creates: the default domains, the staff role, « Bloquer seulement ». The card says that the rule does not exist and that no link is blocked, so that nothing reads as in force (decided by the agent on 2026-11-17, on #481, for Gilles to review).
- A role or a channel that Discord no longer lists shows as « Rôle supprimé » and « Salon introuvable »: `listChannels` leaves out the channels the application cannot view (`.claude/rules/discord.md`, **The Discord seam**), and a channel is not told apart from a deleted one (inferred, #481).
- A read failure is thrown, with no catch, and `error.tsx` takes it (`CLAUDE.md`, **Read failures**).

## Writes

- `switchLinkRule` reads the rules, then creates the rule or sends `{ enabled }` and nothing else, so that what the staff changed in Discord, a role, a channel, a domain, an action, stays (`switch-link-rule.test.ts`). The form's `enabled` is the state asked for.
- A switch to the state the rule already has succeeds and writes nothing, as a change of action to the action a word has does (`.claude/rules/blocked-words.md`, **Write results**): two staff members who press together do not fail each other (decided by the agent on 2026-11-17, on #481, for Gilles to review). Cutting a rule that does not exist succeeds too.
- The reason is the panel's: `auditLogReason(staffMember, …)` over « création et activation de la règle des liens », « activation de la règle des liens » or « coupure de la règle des liens » (`link-rule-reason.ts`), so that the audit log attributes it to the staff member (`src/audit-log/audit-log-reason.ts`, ADR 0004).
- With 6 keyword rules, the creation is refused in the panel's own message (`no-room-refusal.ts`), which names the rule and says to delete one in Discord; the 6 and the keyword test are `MAX_KEYWORD_RULES` and `isKeywordRule` of `src/blocked-words/`, imported rather than moved (decided by the agent on 2026-11-17, on #481, for Gilles to review).
- A refusal and Discord unavailable are `{ ok: false, message }`, with no field, since the switch sends none a staff member types; anything else is thrown, a missing permission included.

## Where the next sections join

- One component per section, each rendering from its props, one `*FromDiscord` wrapper of the page that awaits `readLinkRule`, one skeleton, and a write of its own in its own module with its own Server Action in `actions.ts`, so that #482 to #486 each add theirs and touch the others no further than `read-link-rule.ts` and the page (#481).
- `WriteResult` of `write-result.ts` carries no field yet: the first section that sends a typed one, #482's domain, gives it the field and its failures hand it back as typed (`CLAUDE.md`, **Write results**).
- `LinkRuleSettings` is what a section reads. A section that needs something more of the rule, such as #486's alert channel, adds it there, with `linkRuleActionOf` leaving that action out already.

## Traps

- AutoMod spares the owner of the Discord server and the members with Administrator or Manage Server: try a link from an account that holds none of them (ADR 0011, `.claude/rules/blocked-words.md`, **Traps**).
- The panel's `/audit-log` lists the link rule's writes under « Liens », each reason as it is while it follows the panel's format (`src/link-rule/link-rule-reason.ts`), and as « Règle modifiée dans Discord » when it does not (`.claude/rules/audit-log.md`, **The link rule's lines**, #505).
- The fake Discord holds no limit of `regex_patterns` and `allow_list`, which no write of #481 can reach: the first write that adds an entry adds them, with the contract test that holds them to Discord's (`docs/discord.md`, **The fake**).
