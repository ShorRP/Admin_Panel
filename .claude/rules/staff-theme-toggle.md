---
paths:
  - "src/staff/theme-toggle*"
  - "src/staff/stateful-theme-toggle.tsx"
  - "src/staff/shor-logo.tsx"
  - "src/staff/privacy-policy-link.tsx"
  - "e2e/theme.test.ts"
---

# The theme toggle and the logo

The toggle through which a staff member chooses the theme, and the logo that the navigation and the login pages draw (#129, #225). `src/staff/theme-toggle.test.tsx` and `e2e/theme.test.ts` name each case. The theme itself, its storage and the script of the root layout are in `.claude/rules/ui-theme.md`, **The theme a staff member chooses**; the places of the toggle are in `.claude/rules/staff-navigation.md` and `.claude/rules/login-pages.md`; the mockup's lines are in `docs/staff.md`, **The theme toggle**.

## The toggle

- `ThemeToggle` is a group named « Thème » of three buttons, « Auto », « Clair » and « Sombre », each after its lucide icon, `Monitor`, `Sun` and `Moon`, `aria-hidden` and, while the text shows, marked `data-icon="inline-start"` (`.claude/rules/ui.md`, **Buttons**), the theme chosen marked `aria-pressed`, on `muted`, the pressed one on `card` inside a border in `primary`. The pressed choice takes that border since `card` on `muted` misses the 3:1 that 1.4.11 asks of what shows a control's state (`docs/ui.md`, **Contrast ratios**); the mockup draws no such border (decided by the agent on 2026-10-29, on #225, for Gilles to review).
- The buttons are plain `<button>`s rather than shadcn/ui's Toggle Group, whose Base UI primitive empties its value when the pressed toggle is clicked again, which a choice among three must refuse, and keeps a value of its own, where `ThemeToggle` renders from its props (decided by the agent on 2026-10-29, on #225, for Gilles to review; `docs/staff.md`, **The theme toggle**).
- `StatefulThemeToggle` reads the theme from `data-theme` through `useSyncExternalStore`, whose server snapshot is « Auto », and on a click writes it to `data-theme` and `localStorage`, or removes both for « Auto », then hands the theme and that write to `ThemeToggle` (#225). The server renders it on « Auto », which the browser corrects once it hydrates, since the server cannot read the choice. That write is one of the two exceptions that **Components** of `CLAUDE.md` makes to « a client leaf holds no logic »: `e2e/theme.test.ts` proves it, since Vitest has no DOM, as #225 kept the rule (Gilles, 2026-10-29, on #225).
- The toggle sits in the sidebar's foot, above the member, in the Sheet's footer and at the right of the login pages' top bar, across from « Shor » (#236), through `PublicPageFrame`, which the privacy policy shares (#186), with its icons alone and their names in `sr-only`. In the sidebar's foot it takes `rail` (#356): below `lg`, its three icons stack in a column, each 44 px, their names in `sr-only`, and from `lg` it is the row of three labelled buttons, the one markup serving both; a toggle with no `rail`, as in the Sheet and on the login pages, is what it was.
- `PrivacyPolicyLink` and `ThemeToggle` take a `rail` prop, `ThemeToggle` beside its `iconOnly` and not in its place, since a rail shows the names from `lg` where an icon-only toggle never does; the link draws the `Lock` below `lg`, leaves its name in `sr-only` there and takes a `title` at every width (decided by the agent on 2026-11-03, on #356, for Gilles to review).
- `ThemeToggle` takes `touch:h-11` on every choice and `touch:w-11` on an icon-only one, where #357 writes `touch:size-11`, which gives the same box (decided by the agent on 2026-11-03, on #357, for Gilles to review).

## The logo

- `ShorLogo` lives in `src/staff/` since only the sidebar, the bar, the login pages and the privacy policy show it. It is one SVG holding the shapes of Shor's black logo, with `fill="currentColor"`, colored `primary`, so amber since #222, and `aria-hidden`, 28 by 30 px, before « Shor » and « Panel du staff » in the navigation's link to `/`, « Shor » in the headings' font (#133, #135, #224). The login pages draw it twice (`.claude/rules/login-pages.md`).
