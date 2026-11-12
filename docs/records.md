# Records

The reference behind `.claude/rules/records.md` and `.claude/rules/account-list.md`: what a view of the list and of a record costs in calls to Discord, where the pages depart from the mockup, and the measures and trials behind some choices. The rules say what to do; this file says how it was known.

The mockup's lines are quoted as `M:<line>`, from the captures of `docs/design/hydromel/`. The `node_modules` citations are those of Next.js 16.4.2: an update of a package re-reads the citations that name it (**Docs that name a version** of `CLAUDE.md`).

## Calls per view

- A view of `/records` reads every member of the Discord server, 1,000 a call, one call after another from the highest ID of the previous page, and every banned account the same way, and the Discord server's roles in one call, the three in parallel after the staff check's `getMember` (`src/records/read-all-accounts.ts:7`, `:23-37`; `src/records/list-accounts.ts:55-59`): one call each for the members and the bans under 1,000, and one more each for every further 1,000 (#322, #323, #324). The search, the filters and the sort run on what those calls gave (`list-accounts.ts:60-70`), so that a search by name costs no call of its own.
- The staff check and the roles are read once, through two promises that the form's `<Suspense>` and the list's share, as the layout shares the member's (`src/app/(staff)/records/page.tsx:23-24`, `:69-78`). `listAccounts` returns before it awaits the roles for an ID or a mention (`list-accounts.ts:50-54`), but the page has started the roles' call for the form, which shows until that redirect, so every view reads the roles once, an ID or a mention included (#324).
- Above 10,000 accounts, reading them all at each view is to be reviewed (#317).
- A record reads a member with `getMember` and `listRoles` (`src/records/read-record.ts:57`, `:109`); a banned account with `getMember`, `getBan` and the audit log's `MEMBER_BAN_ADD` entries, page by page, 100 at a time and one after another, newest first as `auditLogPages` relies on, until the first that targets the account, then one `getApplicationUser` (`read-record.ts:68`, `:120-153`), so it reads every page within Discord's 45 days only when that entry has left the audit log; an account absent from the Discord server with `getMember`, `getBan` and `getUser` (`read-record.ts:79`).
- The history reads the same `MEMBER_BAN_ADD` entries and `getApplicationUser` again (`src/sanctions/read-sanction-history.ts:47`), since `readSanctionRefusals` is not read for a banned account (`src/sanctions/sanction-options.ts:38-39`). So a record of a banned account reads them twice at each view, once for the author and once for the history, with no request-scoped `cache()` to share them, as for `getMember`, until Discord answers with a 429 (#285). The history's own calls are in `docs/sanctions.md`, **The history**, a record's ticket archives in `docs/support-tickets.md`, **Calls per view**.

## Where the pages depart from the mockup

- The search field keeps its label « Compte », which the mockup drops (#232, #324).
- `StandingBadge` writes the date of « Exclu jusqu’au <date> » with its year, where the mockup leaves it out (#232). « Absent du serveur » takes `muted-foreground`, where the mockup's dot takes `--fg3` (M:804), which #221's table maps to `muted-foreground` (#233).
- The header of `/records` holds `max-w-160` and its form and results `max-w-190`, the mockup's 640 and 760 px, against the left edge of the box of 1,080 px (`src/app/(staff)/records/page.tsx:35`, `:43`, #232).

## Measures

- The term column of a record's details is 110 to 190 px, as the mockup's, but 40% of the card at most, so that a value keeps about 150 px at 360 px, where the mockup's 190 px would leave it 72. The measure was taken at 360 px, where the pairs now stack (#361), so it shapes the column from 640 px, which was not re-measured (#233, #361).
- While the history's row was the `1fr` one, a sanctions card taller than the details and the history stretched that row and left the tickets 243 px under the history, where the gap between the other cards is 36 px, `gap-y-9` (`e2e/ticket-archives.test.ts`, throwaway build, 2026-11-05, #197). The third row of `RecordColumns`, `grid-rows-[auto_auto_1fr]` with the sanctions on `row-span-3`, closes it.
- The box of 1,080 px, the sidebar's 252 px and the page's margin of 3.5rem on each side make about 1,444 px, below which the column never outgrows the box (inferred from those sums, #234).
- A record's avatar is 68 px, so 136 device pixels on a screen of twice the density: the 128 of `RECORD_AVATAR_SIZE` enlarges it by 1.06 where 64 gave 2.13, and 256 is the smallest size that never enlarges it. The 56 px avatar of #361 draws 112 device pixels at that density, which 128 never enlarges, and 168 at three times the density that many phones have, which it enlarges by 1.31 (inferred; #246 asks for 128, and the size a record's avatar is drawn at is out of its scope). Discord's docs say "Image size can be any power of two between 16 and 4096" (https://docs.discord.com/developers/reference, **Image Formatting**, read 2026-11-02; the page shows no date of modification), which both sizes are within.
- The longest chip of the list, « Âge du compte Discord : Moins de 30 jours », fits a 360 px screen (a Playwright screenshot, 2026-11-03, #360).
- A row of the list is inferred to be 61 px high at least without its `touch:min-h-14`, a name over `@username` between two paddings of 12 px, so that the minimum only guards it (`e2e/account-list.test.ts` reads every row at 360 and 768 px).

## Trials

- The flows of `e2e/records.test.ts` pose no avatar (`grep -i avatar e2e/records.test.ts`, 2026-11-02), so only `src/records/read-record.test.ts` proves the URL of a record's avatar, at 128 px.
- `next/form` writes every control it holds into the URL (`node_modules/next/dist/client/form-shared.js:77-90`), so a submit of the page's form sends the six choices, the first of which has the empty value.
- A fallback form lost what was typed in 1 end-to-end run of 60, which is why `AccountSearchFormSkeleton` holds no field (2026-10-28, #324).
- The flow that logs out from page 5 of the list failed on three throwaway builds, 4 runs of 4 each, each time on `prefetchedPaths`, which held `/records` and `/login`, and on an `ERR_SSL_PROTOCOL_ERROR` console line: without `prefetch={false}` on the previous and next links, without it in `TextLink`, which the page numbers use, and without both (`pnpm test:e2e e2e/account-list.test.ts -g "logs out" --repeat-each 4`, 2026-11-02).
- `e2e/account-filters.test.ts` lists the properties that the Sheet's transitions run when it opens, at 639 px from the bottom and at 700 px from the right: `opacity` alone under reduced motion and `opacity` and `translate` with motion. `translate` came under reduced motion at 700 px on a throwaway build without `motion-reduce:translate-x-0!` (`pnpm test:e2e e2e/account-filters.test.ts -g "slides in only with motion"`, 2026-11-03).
