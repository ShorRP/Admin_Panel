# Next.js

The evidence behind `.claude/rules/nextjs.md`: what Next.js's docs and source say about prerendering, headers and error files, what the vendor pages say, and the trials that showed how the panel behaves. The rule says what to do; this file says how it was known. Gilles decided the architecture and the errors while grilling #47 and #49 on 2026-10-23, the headers while grilling #51 on 2026-10-24 and the TypeScript options while grilling #55 on 2026-10-24. #76 wrote the headers, #61 the error pages and #270 their theme.

The `node_modules` citations are those of Next.js 16.4.2 unless a package is named: an update of a package re-reads the citations that name it (« Docs that name a version », in the Dependencies rules).

## Caching

- Next.js says that, with Cache Components on, `GET` Route Handlers follow the model of UI routes: they run at request time by default and can be prerendered when they access no uncached or runtime data (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:89`). Prerendering stops when the handler reads the request or a runtime API, `connection()` among them (`:124`). The build prerenders a page the same way, until it reads the request.
- On 2026-10-26, a client created in a page or in a `GET` Route Handler before it read the request parsed variables that a build outside Vercel lacks, and failed `pnpm build` on `/` and on `/login/callback`.
- `/login` awaits `connection()` too, so that it never prerenders one `state` for every visitor.
- For a route with a param that `generateStaticParams` does not cover, the pathname is unknown until request time, so `usePathname` suspends and needs a `<Suspense>` boundary above it (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md:75`). The navigation, in the layout of `(staff)`, calls `usePathname`, and `/records/[userId]` has a `userId` that is unknown at build, which failed `pnpm build` (2026-10-28, #176). `instant = false` is Next.js's opt-out of the validation that each page produces a non-empty static shell, when it is the highest `instant` config of the route's tree (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`, **Disabling static shell validation**, read 2026-11-12). That this validation is the one that failed the build is inferred.

## Headers

- Next.js's CSP guide asks for `'unsafe-eval'` in development, since React uses `eval` there to rebuild server-side error stacks in the browser (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:548`).
- `upgrade-insecure-requests` holds in every environment. Under `next start` on `http://localhost:3100`, Chromium still loaded every script and stylesheet over `http:`, and every end-to-end flow passed (throwaway test, 2026-10-27). Only the target of a redirect that a `fetch` follows went to `https:`.
- Under `next dev`, the same flows logged no violation (throwaway Playwright config, 2026-10-27), though two flows failed on Next.js's own development warning « Route … is rendering with server caches disabled », which `next start` does not print, and the headers test, as it should, on the development policy.
- The real `pnpm dev`, logged in through « Shor Panel Dev », logged no violation either, on `/`, on `/blocked-words` and around a blocked word added then removed (Gilles, 2026-10-30, #119).
- HSTS is Vercel's: `max-age=63072000; includeSubDomains; preload` on `*.vercel.app` (https://vercel.com/docs/cdn-security/encryption, updated 2026-09-15).
- `react/jsx-no-script-url` skips `next/link`'s `Link` unless the config names it, so `eslint.config.mjs` does (#76, 2026-10-27).
- The Vercel Toolbar, on by default on previews, is turned off there (#9), so that previews serve production's policy rather than one opened to `vercel.live` (https://vercel.com/docs/vercel-toolbar/managing-toolbar, updated 2026-08-11). `docs/delivery.md`, **Previews**, lists it among the project's Vercel settings.

## Error pages

- Next.js says that error boundaries must be Client Components (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:21`), that `global-error` replaces the root layout and so brings its own `<html>` and `<body>` (`:163`), and that it can export no `metadata`, so a `<title>` of React's stands in (`:167`).
- `error.js` wraps `loading.js`, `not-found.js`, `page.js` and the nested layouts, and does not wrap the layout or template above it in the same segment (`:96`). So the `error.tsx` of `src/app/` replaces everything below the root layout, the layout of `(staff)` and its navigation included. The root layout holds no client component, so no error reaches `global-error.tsx` today (inferred from the code).
- In production the `Error` object that reaches `error.js` no longer carries the original message, so that no sensitive detail leaks to the client (`:106`): an error forwarded from a Server Component shows a generic message and an identifier, the `digest`, that matches the server-side logs (`:111`, `:113-115`). A value thrown in a Client Component arrives as it was thrown and may be no `Error` (`:104`), so it has no `digest` (inferred).
- When a page of `(staff)` calls `notFound()`, the not-found page renders inside the layout, beside the navigation, which lacks that section (`e2e/records.test.ts`, 2026-10-30, #61). #61's earlier inference was that it replaced the navigation too.
- `global-error.tsx` links the favicon to `/icon.svg`, the route that the build lists (`pnpm build`, 2026-10-30).
- A throwaway client component of the root layout that threw on `?boom`, under `next start`, with « Sombre » stored under a light system, showed `data-theme` set to `dark`, then removed, and the body's background light (a `MutationObserver` on `data-theme` and the body's computed background, 2026-10-30, #61). React's commit of `<html>` removes every attribute it holds before it sets its own (`node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js:9361-9366`, react-dom 19.3.0-canary-278794d7-20261002). In #270's probe, a `useLayoutEffect` in `global-error.tsx` that copied the stored theme kept `dark`, but Vitest runs no effect, and end to end could provoke the error only through a way to throw added to the code (inferred). The system's scheme stands for that case (Gilles, 2026-10-30, on #270).

## TypeScript's options

- On 2026-10-24, on `main`, each of the five options gave no error under `pnpm exec tsc --noEmit --<option>`. On a scratch worktree with the 21 files that `shadcn add` copies for 20 base-nova components, only `exactOptionalPropertyTypes` gave one, TS2375 on `sonner.tsx`'s `theme={theme as ToasterProps["theme"]}`, with `skipLibCheck` on or off. That component is not used any more, the toast of #227 having replaced it, and `src/ui/toast.tsx` gives no error with the option (#86's comment: `pnpm typecheck` and `pnpm lint`, 2026-10-29).
- On 2026-10-24, TypeScript 6 made a deprecated option an error, TS5107, unless `ignoreDeprecations` is set (`pnpm exec tsc --noEmit --target ES5`).
