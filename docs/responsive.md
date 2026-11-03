# Responsive

The patterns, the per-page specification and the review checklist behind the **Responsive** section of `CLAUDE.md`. The mockups that show them, every page at 360, 390, 768, 1,024 and 1,280 px in light and in dark, were made with Claude Design outside the repository, as the Hydromel mockup was (#221, #223); the repository keeps no capture of them. Where this file and a ticket differ, the ticket wins.

Like the **Architecture** of `CLAUDE.md`, this file was written before the code. #355 delivered the `touch:` variant, the lint rule, the viewport and `e2e/responsive.test.ts`, and #357 the shared controls; the tickets of #354 deliver the rest, each making its part true (#356 the navigation, #358 to #362 the pages), so that a section below describes the target until its ticket lands.

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

The page column keeps its margin, `px-[clamp(1.25rem,4vw,3.5rem)]`, and its `pb-24`; its top margin takes `pt-6` under `md` and `pt-11` from `md`, since the bar already sits above it.

## Shared controls, in `src/ui/`

Delivered by #357. The copied components carry the touch sizes beside their own, so that no caller repeats them (**Copied code** of `CLAUDE.md`).

| Component       | Before #357                                                                  | Added by #357                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`        | `h-8`, `size-8`, `h-7`, `h-9`                                                | `touch:h-11` on every text size, `touch:size-11` on every icon size                                                                                                                                                                                                                                                      |
| `Input`         | `h-8`, `text-base md:text-sm`                                                | `touch:h-11`                                                                                                                                                                                                                                                                                                             |
| `NativeSelect`  | `h-8`, `text-sm`                                                             | `touch:h-11` (`data-[size=sm]:touch:h-11` for its small size), `text-base md:text-sm`; a caller's `[&>select]:h-*` beats `touch:h-11`, so `BlockedWordActionSelect` adds `[&>select]:touch:h-11`                                                                                                                         |
| `TabsTrigger`   | `h-[calc(100%-1px)]`                                                         | `touch:min-h-11` (a record's tabs already wrap their text)                                                                                                                                                                                                                                                               |
| `ThemeToggle`   | `h-7`, `w-7` icon only                                                       | `touch:h-11`, and `touch:w-11` icon only                                                                                                                                                                                                                                                                                 |
| `DialogContent` | centered, `sm:max-w-sm`                                                      | under `sm`: `max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-0 max-sm:rounded-b-none max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]`, no zoom, sliding up only with motion (`max-sm:motion-safe:data-open:slide-in-from-bottom`); its close button `touch:top-0 touch:right-0` |
| `SheetContent`  | `w-3/4 sm:max-w-sm`                                                          | `side="bottom"` gets `max-h-[88svh]` and `overflow-y-auto`, so that the sheet scrolls as a whole; its close button `touch:top-1 touch:right-1`; `SheetFooter` pads its bottom by `env(safe-area-inset-bottom)`, whatever the side                                                                                        |
| `ToastViewport` | `inset-x-4 bottom-4`                                                         | `max-sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]`                                                                                                                                                                                                                                                                 |
| `ToastClose`    | `icon-sm`                                                                    | 44 px through `Button`'s `icon-sm`, with `touch:-my-2 touch:-mr-2`, its negative margin keeping the toast's height and the glyph's place                                                                                                                                                                                 |
| `PageHeading`   | `text-[2.375rem]`                                                            | `text-[2rem] sm:text-[2.375rem]`                                                                                                                                                                                                                                                                                         |
| `Overline`      | `text-[0.65625rem]`, `text-[0.625rem]` in the sidebar and a record's details | `text-[0.6875rem]`, 11 px, everywhere, the callers' smaller sizes removed, and the sidebar's brand label « Panel du staff », 9.5 px, with them                                                                                                                                                                           |
| `AccountLink`   | content-sized                                                                | `touch:min-h-11 touch:items-center`, on its link and on the `div` it draws with no address                                                                                                                                                                                                                               |
| `TextLink`      | content-sized                                                                | standing alone, which is its default, `touch:inline-flex touch:min-h-11 touch:items-center`; inside a sentence, `inSentence` keeps it content-sized                                                                                                                                                                      |

The confirmation footers, `SanctionConfirmation` and `BlockedWordActionChange`, went from `flex justify-end gap-2` to `grid grid-cols-2 gap-2 sm:flex sm:justify-end`. From `sm`, the dialog stays centered, at the copied `DialogContent`'s `sm:max-w-sm`, or at the `sm:max-w-110` that the panel's two dialogs, the sanctions' confirmation and the blocked words' change of action, pass it.

## Navigation

`StaffHeader` keeps one `<aside>` for the rail and the sidebar, sized `md:w-16 lg:w-63`, and one `<header>` for the bar, `md:hidden`.

- **Rail, `md` to `lg`.** The panel's link shows the logo alone, its name in `sr-only` (`panelNameVariants` gets a `rail` value). The ornament rule becomes a 32 px line with the diamond in the middle. The group titles go `max-lg:sr-only`, and a 24 px rule in `border` separates the two groups. A section link becomes `max-lg:size-11 max-lg:justify-center max-lg:px-0`, its name `max-lg:sr-only` and repeated in `title`; the current one keeps `sidebar-accent`, its icon in `primary` and the 2 px bar against the left edge, at `-left-2.5`. `BlockedWordCountBadge` becomes `max-lg:absolute max-lg:top-0.75 max-lg:right-0.25`, a pill on `sidebar` ringed in `border`, in 11 px monospace. The foot stacks the theme toggle `iconOnly` in a column, the member's avatar, which keeps the link to their own record and takes their name and role in `title`, the log-out icon button and « Confidentialité » as a `Lock` icon button whose name stays « Confidentialité ».
- **Sidebar, from `lg`.** Unchanged, but for `touch:h-11` on its section links and on its theme toggle and `touch:min-h-11` on « Confidentialité », which a tablet in landscape reaches with a finger.
- **Bar, under `md`.** `sticky top-0 z-40`, so that the menu stays in reach on a long page; the flow of `e2e/staff-header.test.ts` that expects the bar to leave as the page scrolls changes with it. Its Sheet keeps every section, under its group titles, then the theme, the member, « Se déconnecter » and « Confidentialité », as today (#224), so that a new section or a sub-section joins it with no change to the bar. Its menu button and its avatar take `touch:size-11`, and the Sheet's section links `touch:h-11`.

## Pages

### `/blocked-words`

- The header wraps: the capacity gauge goes under the sentence and takes the full width under `sm`.
- `AddBlockedWordForm`: under `sm`, « Action » takes the full width and « Ajouter » too, under it; from `sm`, today's row.
- The list header: « La liste » and its count, `whitespace-nowrap`, then the filter form, `w-full sm:w-82`, as today.
- The tiles keep `repeat(auto-fill,minmax(12.5rem,1fr))`, one column under about 420 px of room. A tile stays 48 px tall; its pencil and its cross take `touch:size-11`, so `pr-1` becomes `pr-0.5` under `touch`.
- The side column goes under the list below a container of 780 px, as today; the rows of « Autres règles AutoMod » take `touch:min-h-11`, their `<summary>` too.

### `/audit-log`

- The type pills stay visible and wrap; under `touch` they take `h-11`.
- From `md`, `AuditLogFilterForm` stays inline. Under `md`, it folds behind an outline button, full width, « Auteur et compte », with the number of filters set in a `primary` pill; the button opens a Sheet from the bottom holding a GET form of its own, the two fields, the type chosen and the search text of the URL as hidden fields, « Réinitialiser » and « Filtrer », while the inline form keeps its two fields, hidden under `md` (**Forms and filters** of `CLAUDE.md`), and the filters set show under the button as chips, « Auteur : Sigrid », each a `Link` to `auditLogHref` without that filter, with a cross and the name « Retirer le filtre Auteur : Sigrid ».
- The rows keep the two grids of #319; the staff member's `AccountLink` takes `touch:min-h-11`.
- The pagination's links take the full width under `sm`, side by side when both show.

### `/records`

- The search field keeps its 44 px.
- From `md`, the six choices and « Chercher » stay inline, `basis-44`. Under `md`, « Filtres » and « Chercher » share a row in two columns; « Filtres » opens a Sheet, from the bottom under `sm` and from the right from `sm`, holding a GET form of its own to `/records`: the six `NativeSelect`s, the search text of the URL in a hidden `query`, « Réinitialiser » and « Appliquer », its submit. The page's form keeps its six choices, hidden under `md`, so that a search sent from it keeps the filters set; a `form="account-search"` on the Sheet's choices would send each one twice (**Forms and filters** of `CLAUDE.md`). The choices that differ from their first show under the search as chips, « État : Membres », each a `Link` to `accountListHref` without that filter.
- The rows: `touch:min-h-14`, the badges under the name under `sm`, as today.
- `AccountPagination` under `sm`: `pageNumbersOf(page, pages, { siblings: 1, compact: true })` gives the first, the current one and its neighbours and the last with « … » between, and the two links become `size-11` arrows whose text goes `sr-only`; the numbers take `touch:min-h-11 touch:min-w-11`.

### `/records/{userId}`

- The breadcrumb's link takes `touch:min-h-11`.
- The header: under `sm`, the avatar takes 56 px and the name 32 px.
- `RecordColumns` keeps its container query at 50.75 rem.
- `RecordDetails`: under `sm`, each entry stacks, the term in 12.5 px above its value, through `grid-cols-1` and a `sm:grid-cols-subgrid` row.
- `RecordSanctions`: the tabs take `touch:min-h-11`; the durations take `touch:h-11`; the radios of « Messages à supprimer » become, under `touch`, a grid of two columns under `sm` and `repeat(auto-fill,minmax(10.625rem,1fr))` from `sm`, each label `min-h-11`; `NotifyCheckbox`'s label takes `touch:min-h-11`; the main buttons already take the full width.

### Login pages, the privacy policy and the error pages

- `PublicPageFrame` keeps `max-w-2xl px-4 sm:px-12`; its theme toggle takes `touch:size-11` on each button and its footer's links `touch:min-h-11`.
- `LoginNotice`: under `sm`, the title takes 38 px and the actions stack at full width.
- `ErrorNotice`: under `sm`, the action takes the full width; the reference keeps `font-mono` and takes `wrap-anywhere`.
- The privacy policy's `<code>` takes `wrap-anywhere`.

## Known limits

- **`viewport-fit=cover` before the bar's safe-area padding.** The root layout's `viewport` sets `viewportFit: "cover"` since #355, so that the page extends under a phone's notch and home indicator. #357 pads the docked dialog, the footer of a Sheet and the toasts' viewport with `env(safe-area-inset-bottom)`, none of which a test proves, since Playwright's insets are 0 (inferred). The bar of #356 does not pad yet, and until it does, on a phone in landscape, the page column's margin, `clamp(1.25rem,4vw,3.5rem)`, can be narrower than a notch's inset and draw content under it (inferred from the margin's value and the usual size of an inset, not tried on a device). #356 lifts it. With a mouse every inset is 0, so no desktop page changes (inferred, #355).
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
