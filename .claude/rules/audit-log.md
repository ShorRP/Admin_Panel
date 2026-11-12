---
paths:
  - "src/audit-log/**"
  - "src/app/(staff)/audit-log/**"
  - "e2e/audit-log.test.ts"
---

# Audit log

`/audit-log`, under « Journaux » in the navigation for every staff member, reads Discord's own audit log at each view and shows who changed the panel's blocked-word rules, who timed out, kicked or banned an account or lifted its timeout or ban, and which account AutoMod timed out, 50 changes a page, within the 45 days Discord keeps (ADR 0004, #12, #231, #327). `docs/audit-log.md` holds the cost in calls, the departures from the mockup, the measures and the trials. The page is built on the log components of `src/ui/` that the game log and the Bot log share (#392).

## Reading

- A type reads only its own kinds of entry (`EVENTS_OF_TYPE`). An account chosen leaves out the rule kinds, since no change of a rule targets an account, and keeps the automatic timeouts, whose entry names one (`read-audit-log.test.ts`, #321, #327).
- All filters work in memory, on what Discord gives, since no parameter of the audit log filters by author, account or text, so they count toward the page's 50 changes and the read stops only once it holds enough of what they keep (`docs/audit-log.md`, **Calls per view**).
- An entry counts as made through the panel only if its `user_id` is the application's and its reason is `Name (ID) : change` (`attributionOf`, ADR 0004, #210). A failed read of `getApplicationUser`, which that check needs, is thrown, since an application left unknown would have every change read as made in Discord.
- `readAuditLog` reads each change's author and account once, as `FoundChange`'s `author` and `account`, each an ID and a name: the account's `global_name` then `username`, so that a text is no start of the `username` of an account that has a `global_name`. « Membre inconnu » and « Compte inconnu » stand in for a name Discord lacks: no text finds them, and an ID finds the change all the same (#321).

## The page

- The box is 1,080 px and centered, its header `max-w-160` (decided by the agent on 2026-10-29, on #230, for Gilles to review).
- « Revenir aux plus récents » and « Plus anciens » show only where they lead somewhere (decided by the agent on 2026-10-29, on #230, for Gilles to review).
- Each page groups its own 50 changes by day of Paris, so a day cut between two pages heads both, and a day shows no count of its changes, which would be wrong for it (`read-audit-log.test.ts`, #230).
- `noChangeMessage` keeps « Aucun changement plus ancien. » first, whatever the filters, then the period's sentences (**Beyond what Discord keeps**), then one sentence for an author, an account, a text or a period, with or without a type (decided by the agent on 2026-11-02, on #321, for Gilles to review).

## Rows

- A row keeps its cells in the DOM's order, time, tile, what changed, author, so that a screen reader reads them so. Under `sm` the author shares the tile's and the time's first line, its avatar after the name, and what changed goes under it across the whole width, 10 px lower (`LOG_ROW_*` of `src/ui/log-layout.ts`, `share one axis` of `e2e/audit-log.test.ts`) (decided by the agent on 2026-11-02, on #319, for Gilles to review).
- `CHANGE_ICONS` gives each kind its icon, and `automatic-timeout` keeps a key of its own, though it draws what a staff timeout draws, so that it can change (decided by the agent on 2026-11-02, on #327, for Gilles to review).
- The account of a sanction and the author link to a record only for a staff member who moderates: `recordHrefForModerator` of `src/records/` gives the href, a `TextLink` of `src/ui/` draws the account and an `AccountLink` the author (decided by the agent on 2026-11-02, on #320, for Gilles to review).
- The author's link keeps the cell's classes and the name's `title`, and the name takes an underline and `foreground` on hover and on focus, since nothing else tells the link from the text beside it (decided by the agent on 2026-11-02, on #320, for Gilles to review). An entry with no `user_id` has no author link, and its author stays text.
- An automatic timeout says « Compte : <name> · Règle : « <rule's name> » » in place of a reason, never Discord's English reason, or the account alone when the entry holds no rule name; it has no end, since the entry holds none (decided by the agent on 2026-11-02, on #327, for Gilles to review).
- Its author is « AutoMod », with no avatar, not even initials, and no link: `readAuditLog` gives its change a `memberId` and an `avatarUrl` that are both `null`, since the entry's `user_id` is the member timed out, never the author. The author filter takes it as `{ id: null, name: "AutoMod" }`, so that a text « AutoMod » retains it, whatever its case, and an ID or a mention never does, while the account filter retains it by the excluded account (decided by the agent on 2026-11-02, on #327, for Gilles to review).

## A change of action

- A blocked word given another action writes two entries with the same reason (`.claude/rules/blocked-words.md`, **Write results**), and the page reads them as one line, titled with that reason, « foo » passe de « Bloquer seulement » à « Exclusion 1 jour » (#326).
- `joinActionChanges` pairs each entry that leaves a rule with the latest entry that enters one, from the same author, with the same reason and at most 60 s before it (`JOINING_WINDOW_MS`). It joins before the page chooses its 50 lines, and the joined line keeps the ID of the entering entry, the older, which the cursor leaves out with the leaving one, so that the older page repeats nothing and skips nothing (`read-audit-log-action-changes.test.ts`). An automatic timeout joins nothing (#327).
- An entering entry with no leaving one, as when Discord is unavailable between the two writes, reads as the word's addition to its new action, « Ajout de « foo », action « Exclusion 1 jour » » (Gilles, 2026-11-02, on #326), and a leaving entry with no entering one, as for the change that cleans up an interrupted one a minute or more later, as the word's removal from the old one, « Retrait de « foo », action « Bloquer seulement » »; its reading, the 60 s and the entering entry's ID are decided by the agent on 2026-11-02, on #326, for Gilles to review.
- Known limit: two changes whose writes interleave, with the second's line the 50th of a page, leave the older page reading the first's entering entry alone, as an addition, and its leaving entry on no page (`read-audit-log-action-changes.test.ts`); it takes two staff members writing within the time one change takes between its two writes, and it is left as it is (decided by the agent on 2026-11-02, on #326, for Gilles to review).

## The filters

- The URL carries `type`, `author`, `account`, `text`, `from` and `to`, in English since a URL counts as a file name, read by `auditLogFiltersOf`; the type is `blocked-words`, `timeouts`, `kicks` or `bans` (decided by the agent on 2026-10-29, on #231, for Gilles to review). A parameter that is invalid, empty, blank or repeated counts as absent, so that a submit leaves the fields it holds empty in the address. The filters combine in AND.
- `ChangeType` names the type in the code, apart from the `kind` of one change; it names no concept of the domain, so it has no entry in `GLOSSARY.md`. « Exclusions » is #231's own label, though `GLOSSARY.md` avoids « exclusion » alone: the page shows only timeouts and their lifting (decided by the agent on 2026-10-29, on #231, for Gilles to review, with no change to `GLOSSARY.md`).
- `AuditLogTypeFilter` draws the pills with `FilterPills`, which hover on `accent` as a section of the navigation does, and « Réinitialiser » beside them when a filter is set, a link to `/audit-log` through `TextLink`, and under an empty page again (decided by the agent on 2026-10-29, on #231, for Gilles to review).
- `AuditLogFilterForm` is one GET form of `FilterForm` that sends the five fields of `AUDIT_LOG_FILTER_FIELDS` and « Filtrer »; the type rides in a hidden field, and it carries no `before`, so that sending it leads back to the newest changes. The labels, the placeholders and the button are the agent's (decided by the agent on 2026-11-02, on #321, for Gilles to review). The form is keyed by its six values, so that its fields empty once « Réinitialiser » lands (`docs/audit-log.md`, **Trials**).
- A text is the start of a name, whatever its case; an ID or a mention is an exact match, read by `accountIdOf` of `src/records/account-id.ts`, the one parser that this filter and the list of `/records` import (#321, #322, #324).
- Under `md` the five fields fold behind « Filtres » (`AuditLogFilterFold`, over `FilterFold` of `src/ui/`), which counts them and not the type, since its pills stay in view. A chip is named by `sr-only` text and no `aria-label`, since the flows find the field by `getByLabel("Auteur")` and an `aria-label` would match the chip too. The Sheet keeps Base UI's default focus, its popup on a touch and its first field on a mouse or a keyboard, since `initialFocus` cannot cross from a Server Component and a mouse or a keyboard has no virtual keyboard to spare (decided by the agent on 2026-11-03, on #359, for Gilles to review). `docs/responsive.md`, **`/audit-log`**, holds the fold's specification and its marks.

### The period and the text (#393)

- A text holds 512 characters at most, the length of a reason (ADR 0004). A period reads from the newest entry in every case: the cursor and the stop do not use its bounds, which would spare Discord some pages and was left out, #393 asking for the filtering in memory (decided by the agent on 2026-11-06, on #393, for Gilles to review).
- A period runs from the first midnight of its first day of Paris to the last midnight of its last, both days included (`periodMatcher`). The two entries of a change of action are kept with 60 s of tolerance beyond its edges, `JOINING_WINDOW_MS`, before they are joined, and the joined line is then checked against the period itself, so that a change whose writes fall on either side of Paris midnight shows once, whole, under the day of its first write, where the half inside the period would otherwise show alone (`read-audit-log-action-changes.test.ts`) (decided by the agent on 2026-11-06, on #393, for Gilles to review).
- A text is contained in what a row shows as its reason or its word (`shownTextsOf`), whatever its case, through `toLocaleLowerCase`, and not whatever its accents, as the blocked words' filter and the search of accounts compare (#229, #324). Any Unicode space, the no-break spaces of « « foo » » included, reads as an ordinary space on both sides. A change a member made to the panel's rule in Discord shows no word and no reason, so no text finds it, and the text searches neither the names of the author and of the account nor the title of a line (decided by the agent on 2026-11-06, on #393, for Gilles to review).
- The text filters in two stages: `retainerOf` keeps, before the join, both entries of a change of action or none, and `lineRetainerOf` keeps, after it, the lines whose own text, as shown, holds the text. Known limit: a text that only « Ajout de » or « Retrait de » finds keeps both entries of every change of action at the first stage, so that a read with more than 50 changes of action in the 45 days can stop before the older lines that show (inferred, not tried).
- « Auteur », « Compte », « Texte », « Du » and « Au » take the basis of 11 rem of `FILTER_FIELD_CLASSES`, which the support tickets, the game log and the Bot log share; the fold's button and Sheet are « Filtres », as `/records` and `/support-tickets` name theirs; and the day, text and field helpers are in `src/ui/`, for the other logs (decided by the agent on 2026-11-06, on #393, for Gilles to review).

#### Beyond what Discord keeps

- `periodReachOf` says where a period stands against the 45 days, from the clock at the read, which the tests freeze: `starts-before-retention` adds a sentence above the changes, while `outside-retention` and `reversed`, which wins, take the empty page's place and read nothing from Discord (`readsNothing`). The three sentences are in `audit-log.tsx`; their wording is the agent's (decided by the agent on 2026-11-06, on #393, for Gilles to review).

## Avatars and read failures

- A change's author avatar comes from one `getMember` per distinct member of the page, for the ID the reason names when the change was made through the panel and the entry's `user_id` when it was made in Discord, since the audit log's `users` hold only the global avatar (#141, #210).
- A member no longer on the Discord server shows the initials, and so does one whose lookup throws a `DiscordError`, since an avatar is decorative; any other error is thrown (`avatarUrlOf`). So a panel error there alerts no one, against `.claude/rules/monitoring.md`, **Alerts**: the page's staff check reads its own member first, through the same `getMember` and the same token (`src/app/(staff)/audit-log/page.tsx:33`), so a revoked token or a lost permission fails there and alerts, and only a failure tied to one member's ID, such as an ID that names no account, goes unreported (inferred; Gilles, 2026-10-28, on #141).

## The skeleton

- `AuditLogSkeleton` takes the real row's grid classes, so that its time, tile, title and author sit as the real ones do at every width (decided by the agent on 2026-11-02, on #319, for Gilles to review; `docs/audit-log.md`, **Measures**), and its form takes a bar for each of the five fields in the form's classes, or, under `md`, the bar of the button that folds them.

## No prefetch and end to end

- No link and no form of the page prefetches, since a prefetch can reach `/login` right after a logout (`.claude/rules/next-link-prefetch.md`): `LogPagination`, `FilterPills`, `FilterChips`, `FilterForm`, `FilterSheetForm`, `AccountLink` and `TextLink` set `prefetch={false}`, and a logout flow fails when one does not (`docs/audit-log.md`, **Trials**).
- Those flows run `logOutWithScriptsHeld` (`e2e/log-out-with-scripts-held.ts`), which reads that the links are still visible when the first script is released: that proves the window the red needs, not that the router tried to prefetch in it, which `prefetchedPaths` tells (decided by the agent on 2026-10-30, on #168, for Gilles to review).
- `e2e/audit-log.test.ts` is the page's flow, since only end to end checks a page at 360 px (Gilles, 2026-10-27, on #12). `e2e/responsive.test.ts` crosses the page with a text and a period set, the day computed from today, so that it does not drift into the period that starts before the 45 days.
