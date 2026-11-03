# Responsive

The patterns, the per-page specification and the review checklist behind the **Responsive** section of `CLAUDE.md`. The mockups that show them, every page at 360, 390, 768, 1,024 and 1,280 px in light and in dark, were made with Claude Design outside the repository, as the Hydromel mockup was (#221, #223); the repository keeps no capture of them. Where this file and a ticket differ, the ticket wins.

Like the **Architecture** of `CLAUDE.md`, this file was written before the code. #355 delivered the `touch:` variant, the lint rule, the viewport and `e2e/responsive.test.ts`, #357 the shared controls and #356 the navigation; the tickets of #354 deliver the rest, each making its part true (#358 to #362 the pages), so that a section below describes the target until its ticket lands.

## Options

Three points had two options each in the mockups. Gilles chose on 2026-11-03:

| Point                    | Chosen                                                   | Set aside                                              | Why                                                                                            |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1. Navigation under `md` | 1a: the bar, sticky, and its Sheet holding every section | 1b: the sections as tabs fixed to the bottom           | the number of sections and sub-sections to come is unknown, and three tabs would not hold them |
| 2. A dialog under `sm`   | 2b: docked to the bottom, full width                     | 2a: centered, as today                                 | in reach of the thumb, and the two buttons keep one row                                        |
| 3. A record under `sm`   | 3a: details, sanctions, history, the DOM's order         | 3b: the same, with « Sanctionner » fixed to the bottom | the account is read before it is sanctioned, with no extra element                             |

## Breakpoints

| Name | From     | Typical screen                | What changes                                                                                            |
| ---- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| base | 0        | phones, 360 to 639 px         | bar and its menu, forms stacked, main actions full width, filters folded, dialogs docked, compact pages |
| `sm` | 640 px   | large phones in landscape     | rows of lists take their desktop grid, filter Sheets open from the right, 384 px wide                   |
| `md` | 768 px   | tablets in portrait           | the 64 px rail, the filters inline again, fields at `text-sm`                                           |
| `lg` | 1,024 px | tablets in landscape, laptops | the 252 px sidebar of #224                                                                              |
| `xl` | 1,280 px | desktops                      | today's interface, unchanged                                                                            |

`touch:` holds under 1,024 px and under `(pointer: coarse)`, whatever the width, so a tablet in landscape and a desktop window narrower than 1,024 px both get the touch sizes (`src/ui/globals.css`, #355):

```css
@custom-variant touch {
  @media (width < 64rem) {
    @slot;
  }
  @media (pointer: coarse) {
    @slot;
  }
}
```

The page column keeps its margin, `clamp(1.25rem,4vw,3.5rem)`, and its `pb-24`; its top margin takes `pt-6` under `md` and `pt-11` from `md`, since the bar already sits above it, and each side is raised to the screen's safe-area inset when that is wider, the left one under `md` alone (#356); the rail and the sidebar are that inset wider, and pad their left by it (decided by the agent on 2026-11-03, on #356, for Gilles to review).

## Shared controls, in `src/ui/`

Delivered by #357. The copied components carry the touch sizes beside their own, so that no caller repeats them (**Copied code** of `CLAUDE.md`).

| Component       | Before #357                                                                  | Added by #357                                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`        | `h-8`, `size-8`, `h-7`, `h-9`                                                | `touch:h-11` on every text size, `touch:size-11` on every icon size                                                                                                                                                                                                                                                                      |
| `Input`         | `h-8`, `text-base md:text-sm`                                                | `touch:h-11`                                                                                                                                                                                                                                                                                                                             |
| `NativeSelect`  | `h-8`, `text-sm`                                                             | `touch:h-11` (`data-[size=sm]:touch:h-11` for its small size), `text-base md:text-sm`; a caller's `[&>select]:h-*` beats `touch:h-11`, so `BlockedWordActionSelect` adds `[&>select]:touch:h-11`                                                                                                                                         |
| `TabsTrigger`   | `h-[calc(100%-1px)]`                                                         | `touch:min-h-11` (a record's tabs already wrap their text)                                                                                                                                                                                                                                                                               |
| `ThemeToggle`   | `h-7`, `w-7` icon only                                                       | `touch:h-11`, and `touch:w-11` icon only                                                                                                                                                                                                                                                                                                 |
| `DialogContent` | centered, `sm:max-w-sm`                                                      | under `sm`: `max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-0 max-sm:rounded-b-none max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]`, no zoom, sliding up only with motion (`max-sm:motion-safe:data-open:slide-in-from-bottom`); its close button `touch:top-0 touch:right-0`                 |
| `SheetContent`  | `w-3/4 sm:max-w-sm`                                                          | `side="bottom"` gets `max-h-[88svh]` and a scrolling body, `SheetBody` (`min-h-0 flex-1 overflow-y-auto px-4`), between the header and the footer, so that the close button and the footer stay in view; its close button `touch:top-1 touch:right-1`; `SheetFooter` pads its bottom by `env(safe-area-inset-bottom)`, whatever the side |
| `ToastViewport` | `inset-x-4 bottom-4`                                                         | `max-sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]`                                                                                                                                                                                                                                                                                 |
| `ToastClose`    | `icon-sm`                                                                    | 44 px through `Button`'s `icon-sm`, with `touch:-my-2 touch:-mr-2`, its negative margin keeping the toast's height and the glyph's place                                                                                                                                                                                                 |
| `PageHeading`   | `text-[2.375rem]`                                                            | `text-[2rem] sm:text-[2.375rem]`                                                                                                                                                                                                                                                                                                         |
| `Overline`      | `text-[0.65625rem]`, `text-[0.625rem]` in the sidebar and a record's details | `text-[0.6875rem]`, 11 px, everywhere, the callers' smaller sizes removed, and the sidebar's brand label « Panel du staff », 9.5 px, with them                                                                                                                                                                                           |
| `AccountLink`   | content-sized                                                                | `touch:flex touch:min-h-11 touch:items-center`, on its link and on the `div` it draws with no address (`touch:flex` centers the content of a `block` caller, the identity of the sidebar and of the bar)                                                                                                                                 |
| `TextLink`      | content-sized                                                                | standing alone, which is its default, `touch:inline-flex touch:min-h-11 touch:items-center`; inside a sentence, `inSentence` keeps it content-sized                                                                                                                                                                                      |

The confirmation footers, `SanctionConfirmation` and `BlockedWordActionChange`, went from `flex justify-end gap-2` to `grid grid-cols-2 gap-2 sm:flex sm:justify-end`. From `sm`, the dialog stays centered, at the copied `DialogContent`'s `sm:max-w-sm`, or at the `sm:max-w-110` that the panel's two dialogs, the sanctions' confirmation and the blocked words' change of action, pass it.

## Navigation

Delivered by #356. `StaffHeader` keeps one `<aside>` for the rail and the sidebar, `md:w-16 lg:w-63` plus the left safe-area inset, and one `<header>` for the bar, `md:hidden`. The rail is the sidebar's markup under `max-lg:` classes, not a second render, so that every link is in the DOM once, under one accessible name in the three forms.

- **Rail, `md` to `lg`.** The panel's link shows the logo alone, its name in `sr-only` (`nameVisibility` of `panelNameVariants`). The ornament rule becomes a 32 px line with the diamond in the middle, a `RailOrnament` of its own, since no prop of `OrnamentRule` gives that form (decided by the agent on 2026-11-03, on #356, for Gilles to review). The group titles go `max-lg:sr-only`, and a 24 px rule in `border` separates the two groups. A section link becomes `max-lg:size-11 max-lg:justify-center max-lg:px-0`, its name `max-lg:sr-only` and repeated in `title`; the current one keeps `sidebar-accent`, its icon in `primary` and the 2 px bar against the left edge, at `-left-2.5`. `BlockedWordCountBadge` sits under its icon, centered, `bottom-0.5 left-1/2 -translate-x-1/2`, a pill on `sidebar` ringed in `border`, in 11 px monospace, where this file pinned it at `top-0.75 right-0.25`: a pill anchored at the top right grew to the left, over the icon, from three digits, and « 3 000 » fills 41 of the link's 44 px, so under the icon it grows sideways and covers nothing (decided by the agent on 2026-11-03, on #356, for Gilles to review). It takes `in-data-[slot=sidebar]:max-lg:` classes: the `<aside>` carries `data-slot="sidebar"`, since the same node also renders in the Sheet, where `max-lg:` alone would place it too (decided by the agent on 2026-11-03, on #356, for Gilles to review). The foot stacks the theme toggle in a column (`rail`, `max-lg:flex-col`, each choice `max-lg:w-11`), the member's avatar, which keeps the link to their own record and takes their name in `sr-only` in place of `hidden`, the log-out icon button and « Confidentialité » as a `Lock` icon button (`rail` on `PrivacyPolicyLink`) whose name stays « Confidentialité ». The `title` of `StaffMemberIdentity`, name and role, and the `title` of the section links and of « Confidentialité » sit at every width, since one markup serves the rail and the sidebar, so that a visible name gets a redundant description from `lg`; the link of the member is named by the account's name alone, from its own text, and never from the `title` (decided by the agent on 2026-11-03, on #356, for Gilles to review). The `<aside>` scrolls (`overflow-y-auto`) and its list of sections takes its own height (`max-lg:overflow-visible`), so that on a screen too short for the rail, a phone in landscape, the foot stays reachable (decided by the agent on 2026-11-03, on #356, for Gilles to review). The `max-lg:` overrides of the rail are an exception to the mobile-first rule of the checklist: the `<aside>` is `hidden` below `md`, so they apply to the rail alone and spare the sidebar a second set of `lg:` classes.
- **Sidebar, from `lg`.** Unchanged, but for `touch:h-11` on its section links and `touch:min-h-11` on « Confidentialité » and on the member's link, which a tablet in landscape reaches with a finger; its theme toggle takes `touch:h-11` from `ThemeToggle` (#357).
- **Bar, under `md`.** `sticky top-0 z-40`, so that the menu stays in reach on a long page, `3.5rem` high plus the top safe-area inset it pads, its sides `max(1rem, …)` of the left and right insets. The document takes a `scroll-padding-top` of that height under `md` (`html:has([data-slot="bar"])` in `src/ui/globals.css`), so that a link focused just under the bar scrolls in below it and not behind it (WCAG 2.4.11, Focus Not Obscured (Minimum)); the safe-area flow reads that it equals the bar's height. Its Sheet keeps every section, under its group titles, then the theme, the member, « Se déconnecter » and « Confidentialité », as before (#224), so that a new section or a sub-section joins it with no change to the bar. They sit in the Sheet's `SheetBody`, which scrolls under the header on a short screen, the footer's `mt-auto` keeping it at the bottom otherwise (decided by the agent on 2026-11-03, on #356, for Gilles to review). Its logo (`min-h-11 min-w-11`, pulled back by `-ml-2` so that the mark stays where it was), its avatar (`min-w-11`, and `AccountLink`'s 44 px height since #357) and its menu button (`Button`'s `touch:size-11`, #357) are 44 px, and so are the Sheet's section links, `h-11`.

## Pages

### `/blocked-words`

- The header wraps: the capacity gauge goes under the sentence and takes the full width under `sm`.
- `AddBlockedWordForm`: under `sm`, « Action » takes the full width and « Ajouter » too, under it; from `sm`, today's row.
- The list header: « La liste » and its count, `whitespace-nowrap`, then the filter form, `w-full sm:w-82`, as today.
- The tiles keep `repeat(auto-fill,minmax(12.5rem,1fr))`, one column under about 420 px of room. A tile stays 48 px tall; its pencil and its cross are `icon-sm` `Button`s, which take `touch:size-11` since #357, so that only `pr-1` becoming `pr-0.5` under `touch` is left to do.
- The side column goes under the list below a container of 780 px, as today; the rows of « Autres règles AutoMod » take `touch:min-h-11`, their `<summary>` too.

### `/audit-log`

- The type pills stay visible and wrap; under `touch` they take `h-11`.
- From `md`, `AuditLogFilterForm` stays inline. Under `md`, it folds behind an outline button, full width, « Auteur et compte », with the number of filters set in a `primary` pill; the button opens a Sheet from the bottom holding a GET form of its own, the two fields, the type chosen and the search text of the URL as hidden fields, « Réinitialiser » and « Filtrer », while the inline form keeps its two fields, hidden under `md` (**Forms and filters** of `CLAUDE.md`), and the filters set show under the button as chips, « Auteur : Sigrid », each a `Link` to `auditLogHref` without that filter, with a cross and the name « Retirer le filtre Auteur : Sigrid ».
- The rows keep the two grids of #319; the staff member's `AccountLink` is 44 px high under `touch` since #357.
- The pagination's links take the full width under `sm`, side by side when both show.

### `/records`

- The search field keeps its 44 px.
- From `md`, the six choices and « Chercher » stay inline, `basis-44`. Under `md`, « Filtres » and « Chercher » share a row in two columns; « Filtres » opens a Sheet, from the bottom under `sm` and from the right from `sm`, holding a GET form of its own to `/records`: the six `NativeSelect`s, the search text of the URL in a hidden `query`, « Réinitialiser » and « Appliquer », its submit. The page's form keeps its six choices, hidden under `md`, so that a search sent from it keeps the filters set; a `form="account-search"` on the Sheet's choices would send each one twice (**Forms and filters** of `CLAUDE.md`). The choices that differ from their first show under the search as chips, « État : Membres », each a `Link` to `accountListHref` without that filter.
- The rows: `touch:min-h-14`, the badges under the name under `sm`, as today.
- `AccountPagination` under `sm`: `pageNumbersOf(page, pages, { siblings: 1, compact: true })` gives the first, the current one and its neighbours and the last with « … » between, and the two links become `size-11` arrows whose text goes `sr-only`; the numbers, which are `TextLink`s standing alone, take `touch:min-h-11` since #357, and `touch:min-w-11` is left to do.

### `/records/{userId}`

- The breadcrumb's link takes `touch:min-h-11`.
- The header: under `sm`, the avatar takes 56 px and the name 32 px.
- `RecordColumns` keeps its container query at 50.75 rem.
- `RecordDetails`: under `sm`, each entry stacks, the term in 12.5 px above its value, through `grid-cols-1` and a `sm:grid-cols-subgrid` row.
- `RecordSanctions`: the tabs are 44 px high under `touch` since #357, their own `min-h-7.5` staying beneath; the durations take `touch:h-11`; the radios of « Messages à supprimer » become, under `touch`, a grid of two columns under `sm` and `repeat(auto-fill,minmax(10.625rem,1fr))` from `sm`, each label `min-h-11`; `NotifyCheckbox`'s label takes `touch:min-h-11`; the main buttons already take the full width.

### Login pages, the privacy policy and the error pages

- `PublicPageFrame` keeps `max-w-2xl px-4 sm:px-12`; its theme toggle takes the touch size on each button from `ThemeToggle` (#357), and its footer's links `touch:min-h-11`.
- `LoginNotice`: under `sm`, the title takes 38 px and the actions stack at full width.
- `ErrorNotice`: under `sm`, the action takes the full width; the reference keeps `font-mono` and takes `wrap-anywhere`.
- The privacy policy's `<code>` takes `wrap-anywhere`.

## Known limits

- **`viewport-fit=cover` and the safe areas.** The root layout's `viewport` sets `viewportFit: "cover"` since #355, so that the page extends under a phone's notch and home indicator. #356 pads the bar at the top, left and right, the rail and the sidebar at the left, by their width, and at the bottom, by their foot, and the page's column at its sides, which `e2e/responsive.test.ts` proves by overriding the insets through the Chrome DevTools Protocol's `Emulation.setSafeAreaInsetsOverride`, as Playwright's insets are 0 otherwise. The rail and the sidebar do not pad their top, where a landscape phone's inset is 0 and a tablet's status bar sits under the column's `pt-11` (inferred, not tried on a device). #357 pads the docked dialog, the footer of a Sheet and the toasts' viewport with `env(safe-area-inset-bottom)`, none of which a test proves yet. With a mouse every inset is 0, so no desktop page changes (inferred, #355).
- **A search typed and not sent** is lost when a filter Sheet's form is sent, since the Sheet's form carries the URL's search text, not the field's (Gilles, 2026-11-03).

## Checklist

Review runs it on every change to the interface.

1. At 360 px, nothing scrolls sideways, the Sheet and the dialogs included.
2. At 360, 768 and 1,024 px, every control is at least 44 by 44 px, but a link inside a sentence.
3. Under `md`, no field or select is under 16 px.
4. Every unprefixed class is the phone's; a prefix only adds what a wider screen changes.
5. No fixed width above 20 rem and no grid of more than two columns without a breakpoint or a container variant, and no height in `vh` (`pnpm lint`).
6. Every flex or grid child that holds text has `min-w-0`, every long word `wrap-anywhere` or `truncate` with `title`.
7. What sticks to an edge pads itself with `env(safe-area-inset-*)`.
8. A filter under `md` folds behind a button, and its chips are links.
9. The ticket says what the change shows at 360, 768 and 1,024 px, and `e2e/responsive.test.ts` lists any new page.
