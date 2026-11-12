# Staff

The reference behind `.claude/rules/staff.md`, `.claude/rules/staff-navigation.md` and `.claude/rules/login-pages.md`: the sources of the session, the login and the staff check, what Discord's pages say that `canViewChannel` follows, and the trials and measures behind the navigation and the login pages. The rules say what to do; this file says how it was known.

The mockup's lines are quoted as `M:<line>`, as in `docs/records.md`. The `node_modules` citations are those of Next.js 16.4.2: an update of a package re-reads the citations that name it (`.claude/rules/dependencies.md`, **Docs that name a version**).

## The session

- iron-session 9.0.1 needs Node `>=22.13.0` and is ESM only (`npm view iron-session`, 2026-10-24).
- The cookie is `Secure` in development too, since Chromium takes a `Secure` cookie on `http://localhost` (end to end, 2026-10-26).
- `vercel.app` is on the Public Suffix List (https://publicsuffix.org/list/public_suffix_list.dat, line 16331, read 2026-10-24), so another Vercel project is another site, which can neither set the panel's cookies nor send them on a POST; `__Host-` costs nothing, and would matter under a domain of the panel's own.
- A Server Component cannot set a cookie (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md:81`), which is why the session is never extended.
- None can be revoked on its own (iron-session 9.0.1's README, « How to invalidate sessions? », `npm view iron-session readme`, 2026-10-24).

## OAuth2

- Discord documents no default for `prompt`, and `none` would send a member who clicks « Se reconnecter » back as the same account (https://docs.discord.com/developers/topics/oauth2, modified 2026-10-16).
- PKCE with S256 is listed by Discord's metadata (`code_challenge_methods_supported`, https://discord.com/.well-known/oauth-authorization-server, read 2026-10-24) but not documented by its OAuth2 page. On 2026-10-26, against « Shor Panel Dev », Discord refused a code exchanged with a wrong `code_verifier` (`400 invalid_grant`, « Code challenge failed. ») or with none (`400 invalid_request`, « Missing "code_verifier" »), and accepted it with the right one (#10).
- `state` stays beside PKCE, as #51 decided, since RFC 9700 relies on PKCE against CSRF only once the server is known to support it (§4.7.1).
- The member's token is not revoked after `/users/@me`, since revoking it would revoke every token of that authorization (the OAuth2 page).
- `iss`, which Discord has returned since 2026-10-14 (https://docs.discord.com/developers/change-log), goes unchecked: Discord advises the check for a client of several providers.

## CSRF

- A Server Action takes only POST, and its `Origin` must match `Host` (`node_modules/next/dist/docs/01-app/02-guides/data-security.md:548-550`). A POST without `Origin` passes with a warning (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md:13`).

## The staff check

- `forbidden()` needs `experimental.authInterrupts` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md:17`) and gives a Route Handler an empty body (`node_modules/next/dist/server/route-modules/app-route/module.js:259-263`), which is why `requireStaffMember` uses `redirect`.
- `notFound()` takes effect in the part of the page under `<Suspense>`, so the page's static shell shows first and the response keeps its `200` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md:193`).
- `requireStaffMember` is covered end to end because it reads `cookies()`, which throws outside a request (`node_modules/next/dist/server/request/cookies.js:104`).

## Channel visibility

The pages of https://docs.discord.com/developers/topics/permissions that `canViewChannel` follows, read 2026-11-05 (#384):

- "Permissions For Timed Out Members": "Timed out members will temporarily lose all permissions except VIEW_CHANNEL and READ_MESSAGE_HISTORY".
- "Rather than inheritance, permissions are calculated by means of what we call Permission Syncing": a child channel is synced to its category when it holds "the same permissions and overwrites", and changing the child de-syncs it. #384 and the epic #380 word the rule as « surcharges de la catégorie et du salon », which assumes an inheritance that the page does not describe.

## `proxy.ts`

- Next.js 16.4.2's docs name `unstable_doesProxyMatch` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:732-743`), which the package does not export: `src/proxy.test.ts` imports `unstable_doesMiddlewareMatch` from `next/experimental/testing/server` (`node_modules/next/dist/experimental/testing/server/index.d.ts`, `middleware-testing-utils.d.ts:13`).
- `/` redirects through `redirects()` of `next.config.ts`, which runs before `proxy.ts` (`proxy.md:239-241`).

## Prefetch after a logout

Why the navigation's links take `prefetch={false}` (#153, Gilles, 2026-10-28):

- The logout's response deletes the session cookie, so the router invalidates its prefetch cache and prefetches every link still visible again once a cooldown of 300 ms ends (`node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:228-233`, `node_modules/next/dist/client/components/segment-cache/scheduler.js:65`, `node_modules/next/dist/client/components/links.js:285`), while the navigation to `/login/logged-out` waited, behind a view transition of about 300 ms, to hide the header, whose unmounted links would cancel their prefetch (`links.js:185-193`).
- A viewport prefetch still under way at the click sent its second request, a segment's, once the cookie was gone: a throwaway Playwright probe that logged the page's requests and view transitions was red in 6 runs of 40 (2026-10-28).
- Without the prefetch, the probe passed 40 runs of 40, and the header flow `--repeat-each=300` 300 of 300 (2026-10-28).
- The matcher of `proxy.ts` could skip prefetches instead, through `missing` (`proxy.md:666-672`), which passed the same probe in 40 runs of 40. A request without a session would then read a staff page's static shell (inferred, not tried), where `.claude/rules/staff.md`, **`proxy.ts`**, sends it to `/login`, and Next.js hides `next-router-prefetch` from Proxy's code so that an RSC request is handled as its HTML is (`proxy.md:474`).
- The flows that log out read `prefetchedPaths`, and `docs/e2e.md`, **The fixtures**, says how they failed before the links stopped prefetching.

## The navigation

- The sidebar is drawn as the mockup draws it (`docs/design/hydromel/blocked-words-light.png`, and the mockup's lines that #224 cites).
- The switch from the sidebar to the bar is `md` rather than the `sm` #129 planned, since at 640 px the wide header that came before the sidebar left the member's name about 10 px of width (Playwright screenshot, 2026-10-27; Gilles, 2026-10-27, on #137).
- shadcn/ui's Sidebar is a client component with logic of its own, a context, a `sidebar_state` cookie written through `document.cookie`, the Ctrl+B shortcut and `useIsMobile` (https://ui.shadcn.com/r/styles/base-nova/sidebar.json, read 2026-10-27).
- `StatefulStaffHeader` reads `usePathname` because a layout receives no path and stays mounted across the navigations between sections (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:240-242`).
- Base UI adds `role="button"` to what `nativeButton={false}` renders (`node_modules/@base-ui/react/internals/use-button/useButton.js:186`); the 360 px flow of `e2e/staff-header.test.ts` fails without the `role={undefined}` that takes it off (2026-10-27).
- Base UI's `DialogClose` throws outside a `Dialog.Root` (`node_modules/@base-ui/react/dialog/root/DialogRootContext.js:15-20`).
- On a screen too short for the rail, a phone in landscape say, `flex-1` with `shrink-0` left the list of sections at no height at all: a Playwright screenshot of the rail at 844 by 390 px, taken by a throwaway test with `pnpm test:e2e` (2026-11-03), and `e2e/responsive.test.ts` at 1,023 by 300 px.
- The review of #356 found a link that Shift+Tab focuses just under the bar hidden behind it, with `elementFromPoint` answering the header: the `scroll-padding-top` fixes it, and `e2e/responsive.test.ts` fails without it.
- The safe-area flow of `e2e/responsive.test.ts` overrides the insets through the Chrome DevTools Protocol's `Emulation.setSafeAreaInsetsOverride`, in Playwright 1.64.1's Chromium 156, where `env()` then reads 47, 44, 40 and 34 px and holds across a change of the viewport (6 runs of 6, 2026-11-03; `docs/responsive.md`, **Known limits**).
- A scratch copy of `e2e/responsive.test.ts` with every `fixme` lifted passed `/blocked-words` at 360, 390, 768 and 1,024 px, and the controls it reported on the other pages were their own, none the navigation's (2026-11-03, #356).
- `StaffHeader` renders with `react-dom/static`'s `prerender` in its test, given a `progressiveChunkSize` without limit: past its default 12,800 bytes, which the sidebar's and the bar's two logos exceed, the render moves a `<Suspense>` it has completed to the end of the document, behind a `<template>` that a script would fill (`node_modules/react-dom/cjs/react-dom-server.node.development.js:8603-8608`, react-dom 19.3.1; #224).

## The theme toggle

- The contrast that the border of the choice made answers is in `docs/ui.md`, **Contrast ratios**.
- shadcn/ui's Toggle Group (https://ui.shadcn.com/r/styles/base-nova/toggle-group.json, read 2026-10-29) wraps a Base UI primitive that empties its value when the pressed toggle is clicked again (`node_modules/@base-ui/react/toggle-group/ToggleGroup.js:60`).
- Its places come from the mockup: the sidebar's foot, above the member (M:115-119), and the login pages' top bar, with its icons alone and their names in `sr-only` (M:40-44).

## The logo

- `ShorLogo` holds the shapes of Shor's black logo, `Noir.svg` on #129. The mockup draws it 28 by 30 px in the sidebar (#224), 22 by 24 px in the login pages' top bar, which is no link (M:37-40), and 44 by 48 px above their overline (M:48, #236).

## The login pages

- `LoginNotice` lays out the right column of the mockup's login screen alone, `max-w-2xl`, about the column's width at 1440 px (M:30-74; inferred from its `minmax(440px, 1fr)` beside `1.15fr`), without its left column, the empty slot of the site's illustration (M:32).
- The buttons are 40 px high as the mockup draws them (M:57-64).
- The 639 px measure of the actions' width, 400 px against the error pages' 607, is that of the review of d63d8ae, with the block's `max-w-100` read in `login-notice.tsx`.
- The footer's « shor-rp.fr » link needs no change of the Content Security Policy, which sets no directive on a navigation (inferred from `.claude/rules/nextjs.md`, **Headers**).
- The « shor-rp.fr » link carries no `sr-only` text saying it opens a new tab: that is WCAG's advisory technique G201, under 3.2.5, a level AAA criterion, beyond the AA of `.claude/rules/ui-theme.md`, **Accessibility**.
