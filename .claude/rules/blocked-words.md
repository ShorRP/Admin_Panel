---
paths:
  - "src/blocked-words/**"
  - "src/app/(staff)/blocked-words/**"
  - "e2e/blocked-words*.test.ts"
---

# Blocked words

What `/blocked-words` lists, adds, removes and changes: the words of the panel's AutoMod rules, one rule per action (ADR 0002, #11, #325, #326), read back from Discord at each view, with the filter (#229), the count beside « Mots interdits » in the navigation (#226) and the other AutoMod rules, shown read-only. The tests of `src/blocked-words/`, `e2e/blocked-words.test.ts` and `e2e/blocked-words-touch.test.ts` name each case. What a view costs in calls to Discord, where the page departs from the mockup and the trials behind some choices are in `docs/blocked-words.md`: read it before adding a read of the AutoMod rules to a page.

## Rights

- `blocked-word-action.ts` lists the actions from the weakest to the strongest, with their right, the name of their rule, their timeout and their notice; #328's kick and ban add an entry there (#325). « Bloquer seulement » belongs to every staff member, a timeout of one hour or of one day to those who hold a role of `MODERATION_ROLE_IDS` (ADR 0005). `mayUse` says whether a staff member holds an action's right, `mayChange` whether they may give a word that has an action another one, which takes the right on a second action too (#326).
- `strongestHeld`, in `panel-rule.ts`, picks the strongest action among the rules that hold a word, and reading, refusing a duplicate and removing share it, so a word that a retouch in Discord put in several rules reads, is refused and is removed with its strongest action (#325).
- A rule that sanctions exempts `StaffMember.staffRoleId`, which `findStaffMember` fills from the `StaffRoles` it already receives, so that `src/blocked-words/` reads no environment and only `src/staff/` reads the staff's variables (#325).

## Write results

A blocked word's write adds this to the shape of a write's result in `CLAUDE.md`, **Write results**.

- Its message and its audit log reason name the action, `ajout de « foo », action « Exclusion 1 heure »`, and a failure hands back the `word` and the `action` as sent, `""` for a removal, which sends none (#325).
- `addBlockedWord` throws for a `StaffMember` whom the action's right refuses, before it reads or writes anything, as a sanction does. `removeBlockedWord` reads the right off the rules that hold the word, read back from Discord, the strongest among them, and removes the word from every rule that holds it (#325). It writes once to each, each reason naming that rule's own action, and its message names the tile's action (decided by the agent on 2026-11-02, on #325, for Gilles to review). A word that no rule holds any more is removed with no write and no right.
- Two words that differ by their case are two words to read and to remove, and the same word to add, since only a retouch in Discord can put both in the rules (decided by the agent on 2026-11-02, on #325, for Gilles to review).
- A change of action enters the word into the new action's rule, which the panel creates with that word, the staff role's exemption and the notice if it does not exist, then leaves every other rule of the panel that holds it, the old one and any copy that an interrupted change left, with one write each, so that the word is blocked at every moment (#326).
- Every write of a change carries the reason `« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »`: the entering write names the strongest action among the rules the word leaves, and each leaving write its own rule's, so that a word held by one rule gets the same reason twice (decided by the agent on 2026-11-02, on #326, for Gilles to review). The audit log reads the pair as one line (`.claude/rules/audit-log.md`).
- Discord unavailable before the first write returns `{ ok: false }` saying that the action has not changed. From the first write on, it says that the word may be in two rules, stays blocked, and to change its action again or remove it, which the next change or removal does: the word then reads with the strongest action of the rules that hold it (#325, #326).
- Choosing the action a word has, when no other rule holds it, succeeds and writes nothing; when a weaker rule still holds a copy of it, it removes that copy alone, in one write, and says the same, so that a change run again after an interrupted one cleans up (decided by the agent on 2026-11-02, on #326, for Gilles to review).
- A word moved to a rule that holds a word differing from it only by its case lands beside it, since the comparison stays exact; a later change or removal takes each as the word it is. A known limit, which `change-action-of-blocked-word.test.ts` pins (decided by the agent on 2026-11-02, on #326, for Gilles to review).

## Read failures

- `readBlockedWordCount` gives no count when reading the AutoMod rules throws a `DiscordError`, and the navigation then draws no badge, while any other error is thrown, so that Discord unavailable never replaces a page with `error.tsx` for a number (Gilles, 2026-10-29, on #226; `CLAUDE.md`, **Read failures**).
- The badge draws nothing either when the layout's staff check fails: the count waits for that check, which reads the member first, since the member's node then redirects or throws, so that no count shows before a redirect, and a check that fails on Discord reports its error through the member's node alone (decided by the agent on 2026-10-29, on #226, for Gilles to review).
- So a panel error in the count alerts no one: a revoked token fails in that staff check and alerts, and a permission lost on AutoMod, which only the rules' read needs, goes unreported until a staff member opens `/blocked-words`, whose own read of the rules then fails and alerts (inferred, #226; `.claude/rules/monitoring.md`, **Alerts**).

## Forms

- The field takes no counter and no lower-casing: the domain stays the one validator, and the word goes as typed (#221, #228).
- « Action » is a native `<select>` that offers only the actions the staff member may use, « Bloquer seulement » alone to one who holds no role of `MODERATION_ROLE_IDS`, and has that one chosen by default (#325). It is not Base UI's Select, as the timeout's radio buttons are not Base UI's (`.claude/rules/sanctions.md`, **Forms**), and React updates no `defaultValue` of a mounted `<select>`: `BlockedWordActionSelect` is keyed by the action sent, so that a refused word keeps its action.
- The labels « Exclusion 1 heure » and « Exclusion 1 jour » stand though `GLOSSARY.md` gives **Timeout** « _Avoid_: mute […], exclusion (alone) »: they name a duration, as « Exclu jusqu’au <date> » names an end and #231's « Exclusions » a type, so they read as a timeout, and `GLOSSARY.md` does not change (decided by the agent on 2026-11-02, on #325, for Gilles to review).
- The form depends on the staff member's roles, so the page puts it under its own `<Suspense>` with `AddBlockedWordFormSkeleton`, which holds no field, since a fallback form would lose what was typed (#325).
- While a write is pending, every cross and every pencil is `disabled` and the list's status region reads « Envoi en cours… », for a removal and a change of action alike (#326).
- A tile gives its word in `font-mono`, whole in its `title` and in the DOM, and a cross only where the staff member may use the word's action (`mayUse`), so that a word that times out shows none to one without a moderation role (#325). The tile is 48 px high on two lines, since the action's name beside the word and the cross would leave the word little of a 200 px tile (inferred; decided by the agent on 2026-11-02, on #325, for Gilles to review). The keywords of another rule are in `font-mono` too.
- The pencil shows only where `mayChange` holds, and opens a Dialog with no confirmation over it, whose choice and « Changer » belong to the tile's form through their `form` attribute, since Base UI portals the dialog out of the tile (`.claude/rules/sanctions.md`, **Confirmation**, #326).
- The filter is a GET `next/form` with `prefetch={false}`, one field and a « Filtrer » button (decided by the agent on 2026-10-29, on #229, for Gilles to review). Its parameter is `query`, which leaves « filter » to AutoMod, which filters the messages (ADR 0002) through the rule's `keyword_filter` (decided by the agent on 2026-10-29, on #229, for Gilles to review).
- `filterBlockedWords` keeps the words that contain the text, whatever its case and not whatever its accents, so that « éCL » finds « Éclair » and « eclair » does not, with the spaces around the text left out, and a blank or repeated `query` counts as absent (#229; `.claude/rules/audit-log.md` compares the same way).
- « Tout afficher », after the count, is a `TextLink` to `/blocked-words`, and the form is keyed by the query, since its field keeps what was typed across navigations and would otherwise keep the text after « Tout afficher » lands. A write keeps the query, since its `refresh()` renders the URL again, so a word added that does not pass it stays out of the list, though its toast says it landed.
- The page reads `searchParams` in the list's `<Suspense>`, so that its static shell stays, and filters the words for the list alone: the gauge counts every word (#229). With a query, a list that shows no word, an empty rule included, says « Aucun mot interdit ne contient « … » » and counts « 0 sur 0 » (decided by the agent on 2026-10-29, on #229, for Gilles to review).
- The header is a `PageHeader` with the overline « AutoMod · règles du panel », plural since the panel keeps one rule per action (#325), the `h1` « Mots interdits » and its sentence, over the rule with `leadingLine`, with the capacity gauge beside it where both fit and under its sentence where they do not (#228, #358).
- The capacity gauge counts `MAX_WORDS_PER_RULE` times the number of actions, 3 for every staff member whatever their roles (Gilles, 2026-11-02, on #325), with no call to Discord of its own (#228), and its count is in the headings' font. Its bar fills in strict proportion, empty for an empty rule (decided by the agent on 2026-10-29, on #228, for Gilles to review).
- The side column, the card « Exceptions » and the other AutoMod rules, is a `div`, and each of its sections takes its overline as its name, so that the sidebar stays the page's one `complementary` landmark, which end to end reads (decided by the agent on 2026-10-29, on #228, for Gilles to review).
- Each word sits in a `<ViewTransition>` keyed by the word, whose `update` is `slide-into-place` so that a word React names without moving it does not animate: the words that move are those after the one added or removed, since the form shows no message once a word lands (#227). The list keeps its `<ul>` while it is empty, hidden by `empty:hidden`, so that the first word added and the last removed animate (`.claude/rules/view-transitions.md`, #138, #166).

## Buttons

- The cross and the pencil are `ghost` icon buttons, since the cross undoes; the dialog's « Changer » is `default` and its « Annuler » `outline` (#221, #228, #326).
- Removing a word asks for no confirmation: adding it back undoes it, and the audit log keeps both. Nor does changing its action, which another change undoes (#326).

## Suspense fallbacks

- The gauge, the list and the other rules share one promise of the rules, each under its own `<Suspense>` with its skeleton; the gauge's is `aria-hidden` with no `role="status"`, since the list's skeleton already says that the blocked words are loading (#228).
- The other AutoMod rules and the count in the navigation are the fallbacks that are no skeleton, both being nothing: the rules come last in their column, so that nothing moves when they arrive (#228), and the count delays nothing, showing once Discord answers (#226).

## Navigation

- `BlockedWordCountBadge` shows the number of blocked words, whatever their action, 0 included, the length of the list that `readBlockedWords` gives, so that the badge and the page count the same words, in `font-mono` at 11 px and `muted-foreground` (#226), and nothing for no count (**Read failures**). The number is `aria-hidden`, and a `sr-only` text says it in words, « 12 mots », so that the link reads « Mots interdits 12 mots »; the text carries no leading comma, since the name's computation sets the badge apart from the name with a space (inferred; decided by the agent on 2026-10-29, on #226, for Gilles to review). It reads « 0 mot » or « 1 mot » in the singular, through the French plural rules that the list's count follows (decided by the agent on 2026-10-29, on #226, for Gilles to review).
- In the rail, below `lg`, the badge sits under its icon, centered, a pill on `sidebar` ringed in `border`, still at 11 px, so that the widest count the gauge allows grows sideways and covers nothing (decided by the agent on 2026-11-03, on #356, for Gilles to review; `docs/blocked-words.md`, **Measures**). It takes `in-data-[slot=sidebar]:max-lg:` classes, the `<aside>` carrying `data-slot="sidebar"`, since the same node also renders in the Sheet, where `max-lg:` alone would place it as well (decided by the agent on 2026-11-03, on #356, for Gilles to review).

## Responsive

`docs/responsive.md`, **`/blocked-words`**, specifies the page. A later change to it must not break (#358):

- The form's choice and its button stack under `sm`, each at the form's full width, and share a row from `sm`.
- Each skeleton of the page wears the classes of what it stands for, from the layout constant that it shares with its component (`add-blocked-word-form-layout.ts`, `blocked-word-capacity-layout.ts`, `blocked-word-list-layout.ts`), so that the content replaces it at the same size, the gauge's height excepted, which follows the heading's font.
- A tile keeps its 48 px around its two 44 px buttons.
- The rows of « Autres règles AutoMod » and their `<summary>` reach 44 px under `touch:` and keep the spacing a mouse gives them.
- What the staff type, such as a filter's text, wraps inside its column (`wrap-anywhere`).

`e2e/blocked-words-touch.test.ts` proves it at 360, 639, 640, 768 and 1,024 px, the last with a touch screen, and at 1,280 px with a mouse.

## Traps

- Discord's tokens don't say which application they belong to: `pnpm test:contract` run with another application's token answers `403 50013` on every AutoMod route and `404 10004` on `getMember`. `GET /users/@me` with the token names its application, « Shor Panel Dev » being `1563184114687803403` (#7; `docs/blocked-words.md`, **Trials**).
- AutoMod spares the owner of the Discord server and the members with Administrator or Manage Server (ADR 0002): try a blocked word from an account that holds none of them (`docs/blocked-words.md`, **Trials**).
