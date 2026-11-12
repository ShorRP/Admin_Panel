---
paths:
  - "src/ui/globals.css"
  - "src/ui/globals.test.ts"
  - "src/ui/theme.ts"
  - "src/app/layout.tsx"
  - "e2e/heading-font.test.ts"
---

# The theme, the font, the accessibility level and the motion

What `src/ui/globals.css`, `src/ui/theme.ts` and the theme test hold: the semantic variables, the palette, the theme a staff member chooses, the headings' font, WCAG 2.2 AA and the CSS of the view transitions. The components that use them are in `.claude/rules/ui.md`. The contrast ratios, the measures and the trials behind this rule are in `docs/ui.md`: read it before changing a color, the script in the root layout's `<head>` or a motion class.

## Theme

- shadcn/ui's semantic variables (`background`, `foreground`, `primary`, `muted`, `destructive`, `border`, `ring` and the rest) are set in `:root` and mapped through `@theme inline`. The panel's code uses those, never a palette color such as `zinc-100`, which review checks. Tailwind's default palette stays, since copied components use it, such as the Dialog's `bg-black/10`.
- The palette is Hydromel: the values of the mockup's handoff, `etape-1-palette/src/ui/globals.css`, for the variables the panel already had and none of the variables that file adds (#221, #222). `globals.css` holds the values and the theme test proves them. `card` and `popover` stand out from `background` in both schemes: a toast sits on `popover`, and forms and messages sit on `card` (#222, #238). `chart-*` is unused and keeps `nova`'s grays.
- `--success`, `--warning`, `--destructive-foreground` and `--ornament` are the variables the panel adds to shadcn/ui's set, and `--destructive` is warmed toward orange; each is also in `@theme inline` and in the four blocks of `globals.css`: the dot of a standing and the diamond of a lifting, the amber of a timeout, the diamond of a kick or a ban, the text of the red buttons, and the diamond of the rule with a diamond. `--warning` sits darker than the handoff's step 1 until it holds 4.5:1 on `background` and `card` (`docs/ui.md`, **The palette**), and it is a color, not the **Warning** of `GLOSSARY.md`, the sanction, which it does not draw (decided by the agent on 2026-10-29, on #232, for Gilles to review, since #221 names the token).
- A domain's colors follow its rule: the notices of the card « Sanctions » (`.claude/rules/sanctions.md`, **Notices and history**) and the badges of the list of accounts (`.claude/rules/account-list.md`, **Badges**).
- The site's forest green and sage, its paper texture and its illustration stay the site's, since the panel must not look like it. The refusal of decoration is lifted for letter-spaced overlines and the rule with a diamond (#129, #221, #224).
- `docs/design/hydromel/` holds the captures of the mockup, the visual reference of #221's tickets; where a capture and its ticket differ, the ticket wins (#221, #223; decided by the agent on 2026-10-29, on #223, for Gilles to review).

## The theme a staff member chooses

- The panel follows the system's scheme until a staff member chooses another through the theme toggle of `src/staff/`. `src/ui/theme.ts` holds the `Theme` type, the key, the event and the script.
- The choice lives in `localStorage` under `shor-panel-theme`, not in a cookie, which the server would read and so break the static shell (`.claude/rules/nextjs.md`, **Caching**). « Auto » removes the key and hands the page back to `prefers-color-scheme`.
- The theme toggles share the theme through the document, not through React: each reads `data-theme` through `useSyncExternalStore`, and the one clicked dispatches `THEME_EVENT`, which wakes the others, so no state library comes in (decided by the agent on 2026-10-29, on #225, for Gilles to review).
- A theme chosen sets `data-theme` on `<html>`. After the dark values, `globals.css` holds `:root[data-theme="light"]` and `:root[data-theme="dark"]`, copies of the light `:root` and of the dark one under `color-scheme: light` and `color-scheme: dark`, which the theme test keeps identical to them: a value changes in every block. They stand in place of `light-dark()`, which Tailwind leaves as it is for the browsers that lack it (`docs/ui.md`, **The theme a staff member chooses**).
- The `dark` variant is the `@custom-variant dark` of `globals.css`: it holds under `[data-theme="dark"]` and under `@media (prefers-color-scheme: dark)` unless `data-theme` is `light`, so the `dark:` classes of the copied components follow the choice. `:root` declares `color-scheme: light dark`, so that the browser draws its own controls, such as scrollbars, in the same scheme (inferred, not checked against the CSS specification).
- The root layout's `<head>` holds a `<script>` of `APPLY_STORED_THEME`, which copies the stored choice into `data-theme`, so that the browser runs it before it reads the body and a theme chosen shows from the first frame. `<html>` takes `suppressHydrationWarning`, since `data-theme` is set before React hydrates; end to end cannot see that warning, so a run under `next dev` is the proof (`docs/ui.md`, **The theme a staff member chooses**). The script needs no `dangerouslySetInnerHTML`, which `react/no-danger` refuses, since React writes a script's text as it is; the Content Security Policy runs it through `'unsafe-inline'` (ADR 0006).
- The script is a plain `<script>` and not `next/script`'s `beforeInteractive`, which runs after the page can be read and painted (`.claude/rules/react-components.md`) (decided by the agent on 2026-10-29, on #225, for Gilles to review).

## The favicon

`src/app/icon.svg` is the whole logo in dark's `primary` on a tile of light's `primary`, with rounded corners, until the POs give a smaller mark (#74). Its colors are fixed, since Next.js serves the file as it is, outside the theme's variables, and the theme test holds them to light's and dark's `primary`.

## Fonts

- Text uses the system's sans-serif stack, and `font-mono`, the system's monospace stack, marks identifiers, counts and times, such as the audit log's (`docs/ui.md`, **Fonts**).
- Headings, `h1` and `h2`, and the « Shor » of the panel's link and of the login pages' top bar use EB Garamond through the `font-heading` class, which `--font-heading` sets in the `@theme` of `globals.css` with Tailwind's `--font-serif` behind it. The error pages' headings do too. `e2e/heading-font.test.ts` proves it.
- `globals.css` imports `@fontsource/eb-garamond/latin-500.css`, one face: a heading in another weight needs that weight's file, and a character the face lacks falls back to `--font-serif` (`docs/ui.md`, **Fonts**). Georgia stays set aside as the headings' font, not as their fallback.
- The package installs from the npm registry, so no font service is called, neither at build nor in the browser, and `font-src 'self'` holds (`.claude/rules/nextjs.md`, **Headers**). Its OFL-1.1 notice stays out of `THIRD_PARTY_NOTICES.md`, like those of the other npm dependencies, which the repository does not copy (Gilles, 2026-10-27, on #133).
- A font that `shadcn init` adds is removed.

## Accessibility

- WCAG 2.2 AA (https://www.w3.org/TR/WCAG22/, Recommendation of 2024-12-12, read 2026-10-24), in light and in dark: text at 4.5:1 (1.4.3), and at 3:1 against adjacent colors what identifies a control and its state, such as an input's border or the focus indicator (1.4.11); a target of 24 px at least (2.5.8).
- The ring must be darker than `primary` in light, since the Button, the Input and the base layer of `globals.css` draw it at 50% (`ring-ring/50`, `outline-ring/50`), so the ring's copied classes stay as the CLI wrote them.
- `src/ui/globals.test.ts` reads `globals.css`, the light values in its `:root` and the dark ones in the `:root` under the media query, and proves each contrast pair in light and in dark, each test's name saying its pair: every text color on its surface at 4.5:1, the hover fills of the Button, the fields' fills in dark, and at 3:1 the field's border, the focus ring and what shows a control's state. The ratios of the closest pairs are in `docs/ui.md`, **Contrast ratios**.
- It computes WCAG's ratio from the `oklch()` values, through OKLab and linear sRGB, clipping what falls outside sRGB, and lays an opacity a class adds, such as `ring-ring/50`, over what lies below in gamma-encoded sRGB, as browsers composite (inferred). Two tests hold that measure to known ratios. It covers what axe leaves out, since axe measures only the contrast of text (inferred, not checked against axe's rule list).
- It proves the blocks of a theme chosen, so that a value changed in one block and not in its copy fails it, and the favicon's two colors.
- No pair covers `ornament`, whose rule is decorative and carries nothing, so 1.4.11 asks no contrast of it (inferred, #224), nor the dot of a standing badge, which is `aria-hidden` (inferred, as for `ornament`; #232), nor the dot of a role's badge, whose color Discord sets (inferred; #323), nor `destructive` on its own tint, which the panel does not use (`.claude/rules/ui.md`, **Buttons**).
- A page that a flow crosses also passes `@axe-core/playwright` in light and in dark (`.claude/rules/e2e.md`, **The fixtures**).

## Motion

- No library: React's `<ViewTransition>`. Each staff page wraps its `<main>` in one whose `enter` and `exit` are `section-crossfade` and whose `default` is `none`, so moving between sections fades the old content out and the new one in. The page holds it, not `src/app/(staff)/layout.tsx`, which stays mounted across sections, so that `enter` and `exit` fire (`docs/ui.md`, **Motion**).
- `globals.css` holds, after the theme, the rules of the `::view-transition-*` pseudo-elements for six classes: `section-crossfade`; `content-enter`, which fades in and rises by `0.5rem`, and `fade-exit`, which fades out, which `SuspenseWithSkeleton` and the blocked words' tiles name (`.claude/rules/ui.md`, **Avatars and skeletons**); `highlight-enter`, which fades in over a tint of `primary` at 15%, for a blocked word just added; `slide`, which times the group that moves the navigation's current-section bar; and `slide-into-place`, which times that group as `slide` does and shows the new snapshot at once, with neither a fade nor the browser's default crossfade, so that an element React names without moving it does not animate (`.claude/rules/view-transitions.md`).
- `tw-animate-css`, imported by `globals.css`, and Base UI's `data-starting-style` and `data-ending-style` animate the Sheet and any dialog or popover as the copied components write them; `tw-animate-css` alone brings in a failed write's message.
- CSS transitions animate hover and press, each 150 to 250 ms, easing out, but for the Toast's copied 500 ms, the pending button's spinner, `animate-spin`, which runs only under `motion-safe`, and the skeleton's pulse, `animate-pulse`, which stops under reduced motion.
- Under `prefers-reduced-motion: reduce`, what moves only fades or does not animate: no `::view-transition-group` animates, so an element named in both renders swaps in place, and `content-enter` only fades, since it rises under `prefers-reduced-motion: no-preference` alone. A copied class that moves a component has its movement taken off under reduced motion (`.claude/rules/ui-overlays.md`).
