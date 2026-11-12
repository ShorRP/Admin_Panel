# Blocked words

The reference behind `.claude/rules/blocked-words.md`: what a view and a write cost in calls to Discord, where the page departs from the mockup, and the trials behind some choices. The rule says what to do; this file says how it was known. #11 wrote the page, #226 the count in the navigation, #229 the filter, #325 the actions, #326 the change of action and #358 the touch sizes.

## Calls per view

- The page reads the AutoMod rules once, with one `listAutoModerationRules`, through a promise that the `<Suspense>` of the gauge, of the list and of the other rules share, as the layout shares the member's (`src/app/(staff)/blocked-words/page.tsx:30`, `:74-77`, `:89-117`). The filter reads no further call: it runs on the words read (`:106-111`).
- The count beside « Mots interdits » adds one read of the rules at each full load of a staff page and after each write, whose `refresh()` renders the layout again, and none on a navigation between sections (`src/app/(staff)/layout.tsx:66-77`; `e2e/blocked-words.test.ts:374`, the badge following an add and a removal). So a full load of `/blocked-words` reads the rules twice, once for the layout and once for the page, with no request-scoped `cache()` to share them, as for `getMember` (**Navigation** of `CLAUDE.md`), and a write by another staff member leaves the count stale until the next full load (Gilles, 2026-10-29, on #226).
- The count waits for the layout's staff check before it reads the rules (`src/blocked-words/read-blocked-word-count.ts:12-16`), so it adds no `getMember` of its own.
- A write calls `requireStaffMember` first (`src/blocked-words/actions.ts:16`, `:29`), then reads the rules once. Adding writes once, a create or a modify (`add-blocked-word.ts:38-60`); removing writes once for each rule that holds the word (`remove-blocked-word.ts:34-54`); changing an action writes the entering rule once, then once for each rule that the word leaves (`change-action-of-blocked-word.ts:71`, `:108-135`).

## Where the page departs from the mockup

The mockup's lines are quoted as `M:<line>`: they are lines of `Panel Shor.dc.html`, which sits outside the repository (`docs/design/hydromel/README.md:29`), and the captures of `docs/design/hydromel/` show its pages.

- The filter has a « Filtrer » button, where the mockup filters at each keystroke and has none (M:213-216, #229).
- An empty list says « Aucun mot interdit pour l’instant. » in place of the count, where the mockup counts « 0 mots interdits » (M:910, #228). With a filter, an empty rule says « Aucun mot interdit ne contient « … » » and counts « 0 sur 0 », where the mockup keeps « Aucun mot interdit pour l’instant. » (M:912, #229).
- The filter leaves out the spaces around the text, as the mockup does (M:839).
- The gauge's bar is empty for an empty rule, where the mockup never draws it under 1 % (M:903, #228).
- The overline of « Autres règles AutoMod » names its section where an `h2` named it before #228, as the mockup draws it, and the box of 1,080 px is centered, as the mockup's (M:174).
- The type of the count beside « Mots interdits » is the mockup's (M:96-97, #226).

## Measures

- The count's `muted-foreground` on the current section's `sidebar-accent` holds 5.31:1 in light and 6.55:1 in dark (the measure of `src/ui/globals.test.ts`, run on a scratch copy, 2026-10-29, #226).
- In the rail, « 3 000 », the most that the gauge allows, is 41 px wide in a link of 44. Pinned to the top right of the icon, as `docs/responsive.md` first had it, the pill grew to the left, over the icon, as the count grew, from three digits; under the icon it grows sideways and covers nothing. `e2e/responsive.test.ts:604-632` sets the text to « 3 000 » and reads the pill's box under the icon, inside the link, with the rail scrolling no wider (#356).
- Before the navigation was delivered, every control of the page's `<main>` passed the 44 px check at 360, 390, 768 and 1,024 px, and the only small targets left were the bar's logo link and identity link at 360 and 390 px and the sidebar's links at 768 and 1,024 px (`pnpm test:e2e e2e/responsive.test.ts -g "blocked-words gives"` with the entry's `fixme` off, 2026-11-03, #358).

## Trials

- Without the `key` that follows the action sent, the action choice went back to « Bloquer seulement » after a refusal, which fails `e2e/blocked-words.test.ts` (2026-11-02, #325).
- Without the `key` that follows the query, the filter's field kept « xyz » across « Tout afficher » (`e2e/blocked-words.test.ts`, 2026-10-29, #229).
- A refused word's message, which pushes the list down, moves it with no animation, since that write leaves the list alone, so that React names no word (a throwaway Playwright test, 2026-10-28; the reason is inferred from React's code, #138).
- The `refresh()` that ends a write lands in the transition of `useActionState`, which starts the view transition, so nothing is shared between the form's leaf and the list's (`e2e/blocked-words.test.ts`, #138).
- The tile of a word whose action changes keeps its place and its key, the word, and only the name of its action changes, which `slide-into-place` is inferred to show without animation (inferred, not tried, #326).
- `pnpm test:contract` run with « Shor Panel »'s token instead of « Shor Panel Dev »'s failed as `.claude/rules/blocked-words.md`, **Traps**, says, since « Shor Panel » was then on no Discord server (2026-10-25, #7).
- On Gilles' test Discord server, which he owns, the panel's rule let his own message holding « machin » through, with nothing to say that the rule worked, and blocked it from an account without Administrator and Manage Server (Gilles, 2026-10-27; ADR 0002, **Consequences**).
