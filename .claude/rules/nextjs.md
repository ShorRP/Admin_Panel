---
paths:
  - "next.config.ts"
  - "tsconfig.json"
  - "src/app/**"
---

# Next.js

What a page prerenders, what the headers carry, how the error pages fail and which options TypeScript gets (#47, #49, #51, #55, #61, #76). The citations of Next.js's docs and source, the vendor pages and the dated trials behind each line are in `docs/nextjs.md`: read it before changing a header, a prerender or an error page.

## Caching

- Nothing from Discord and nothing from the session goes through `use cache`, since the panel reads Discord back on every view (ADR 0002).
- With `cacheComponents` on (`next.config.ts`), only the static shell prerenders: the part of a page that waits on Discord sits under `<Suspense>`, with a French fallback.
- That part, and a Route Handler, await `connection()` before they create a client. The build prerenders a page, and a `GET` Route Handler, until it reads the request, and a client created there parses variables that a build outside Vercel lacks, which fails `pnpm build`. It also keeps `/login` from prerendering one `state` for every visitor.
- `/records/[userId]` exports `instant = false`: its `userId` is unknown at build, so the navigation's `usePathname` suspends outside `<Suspense>` there and `pnpm build` fails. The page then renders at each request, where nothing outside `<Suspense>` waits on Discord (#176).

## Headers

- `next.config.ts` sends on every route, through `headers()` on `/:path*`, a Content Security Policy, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`, and `poweredByHeader: false` leaves every response without `X-Powered-By`. `next.config.test.ts` proves the headers, and `e2e/security-headers.test.ts` reads them on `/login/logged-out` (#76).
- The policy is `default-src 'self'` with `script-src` and `style-src` set to `'self' 'unsafe-inline'`, `img-src 'self' data: blob: https://cdn.discordapp.com`, `font-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` and `upgrade-insecure-requests`, and it sets no directive on a navigation. `next.config.ts` and `next.config.test.ts` hold the string. `img-src` allows Discord's CDN for the members' avatars (#140).
- It has no nonce, so that every page keeps its static shell: `'unsafe-inline'` stays in `script-src` and `style-src` (ADR 0006). `script-src` adds `'unsafe-eval'` when `NODE_ENV` is `development`, since React's development build needs `eval` (Next.js's CSP guide).
- `upgrade-insecure-requests` stays on in every environment, `next start` on `http://localhost` included. Its one local effect is on the target of a redirect that a `fetch` follows (`.claude/rules/next-link-prefetch.md`).
- Scripts may run inline, so React's escaping is the defense against XSS: `react/no-danger` and `react/jsx-no-script-url` stay errors in `eslint.config.mjs`, the second also on `next/link`'s `Link` (#76).
- Previews serve production's policy rather than one opened to `vercel.live`: the Vercel Toolbar, on by default there, is off (#9).
- HSTS is Vercel's: the panel sets none.

## Error pages

- `src/app/` holds `not-found.tsx`, `error.tsx` and `global-error.tsx`, with their own markup since they belong to no domain, and `error-notice.tsx`, the frame the first two share. Next.js requires `error.tsx` and `global-error.tsx` to be Client Components, and `global-error.tsx` to bring its own `<html>` and `<body>`, here with `lang="fr"`.
- None of the three checks the staff role, since they show nothing from Discord (ADR 0005). The panel has no `global-not-found`, which is experimental and serves only several root layouts (#49).
- The login callback throws nothing: a member who is not staff goes to `/login/refused`, any other failure to `/login/failed`.
- `error.tsx` replaces a page whose read of Discord failed, and the layout of `(staff)` with it, since it sits at the root of `src/app/`, above that layout: no navigation shows (#53). `global-error.tsx` shows none, nor does `not-found.tsx` for a URL that no route matches, which renders under the root layout alone. When a page of `(staff)` calls `notFound()`, as a section does for a staff member who does not hold its role (ADR 0005), the not-found page renders inside `(staff)/layout.tsx`, beside the navigation, which then lacks that section (`e2e/records.test.ts`, #61).
- In production `error.tsx` gets a generic message and the error's `digest`, never the original message, so it shows one message for Discord unavailable and panel error alike, a « Réessayer » button that calls `retry`, and the `digest` as a reference. An error without a `digest`, as one a Client Component throws in the browser, shows no reference, and the message then ends on the channel (decided by the agent on 2026-10-30, on #61, for Gilles to review).
- `error.tsx` says « Page indisponible » as its `h1`, which #61 leaves unnamed (decided by the agent on 2026-10-30, on #61, for Gilles to review), then, as #53 worded it, « Le panel n’a pas pu afficher cette page. Discord ne répond peut-être pas : réessaie dans un instant. Si ça continue, signale-le dans #créer-ticket avec la référence <digest>. ». `ReportChannelLink`, of `src/ui/`, draws « #créer-ticket », the channel where the staff report a problem of the panel, which `/login/failed` names too.
- `not-found.tsx` says « Page introuvable » as its `h1` and in its tab through `metadata`, « Page introuvable – Panel de Shor » (#53), then « Cette page n’existe pas. », and links to `/` through « Revenir à l’accueil », a plain `<a>` since `/` redirects (`.claude/rules/next-link-prefetch.md`). It says nothing more to a staff member who does not moderate and opens `/records`, as if the section did not exist (#61, comment of 2026-10-28).
- `ErrorNotice` frames `not-found.tsx` and `error.tsx` with a `PageHeader` with no overline, the rule with a diamond and the page's one button, in a `<main>` of at most 672 px that takes `px-4 py-12 sm:px-12` and no height of its own, since it sits either alone or in the page column of `(staff)/layout.tsx`, whose margin it then adds to (decided by the agent on 2026-10-30, on #61, for Gilles to review). Under `sm` the button fills the width, because the column that holds it, `flex-col sm:flex-row sm:flex-wrap`, stretches it, and the reference of `error.tsx`'s page takes `font-mono` and `wrap-anywhere` (#362).
- `global-error.tsx` renders `error.tsx`'s page in its own document, which imports `@/ui/globals.css`, applies the stored theme in its `<head>` as the root layout does and takes `suppressHydrationWarning` on `<html>`, so that it follows a theme a staff member chose and not the system's alone when the server renders it (#225; inferred, since a root layout that throws on the server was not provoked). It can export no `metadata`, so it sets its tab, « Page indisponible – Panel de Shor », through React's `<title>`, and the favicon through a `<link rel="icon">` to `/icon.svg`.
- When a client component of the root layout throws in the browser, React renders `global-error.tsx` over the same document and removes the `data-theme` that the layout's script set, so that the page follows the system's scheme (Gilles, 2026-10-30, on #270). The root layout holds no client component, so nothing reaches that case today (inferred from the code): revisit it with the first one.

## TypeScript's options

- `tsconfig.json` sets `strict`, and #86 adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns` and `noFallthroughCasesInSwitch` (not yet in `tsconfig.json`), since they cost nothing today and would touch more code the later they came (#55).
- One check, one tool: `noUnusedLocals` and `noUnusedParameters` stay off since `@typescript-eslint/no-unused-vars` checks the same, and `verbatimModuleSyntax` since `consistent-type-imports` will (#81, not yet in `eslint.config.mjs`). `noPropertyAccessFromIndexSignature` stays off too: it would have `next.config.ts` write `process.env["VERCEL"]`, and catches nothing `noUncheckedIndexedAccess` misses (inferred).
- `erasableSyntaxOnly` is #81's (`CLAUDE.md`, **Code style**, **TypeScript**). `ignoreDeprecations` is never set: TypeScript 6 makes a deprecated option an error, TS5107, unless it is.

## Gotchas of the dev server and typegen

- `next typegen`, and so `pnpm typecheck`, loads `next.config.ts` in the build phase (`node_modules/next/dist/cli/next-typegen.js:83`): whatever `next.config.ts` checks at build also runs at every typecheck.
- `next dev` writes every request with its query string, the login callback's `code` and `state` included, as `GET /login/callback?code=…&state=…&iss=… 307` (first login with « Shor Panel Dev », 2026-10-26), which `.claude/rules/monitoring.md` excludes; the code is spent by then. Whether Vercel's request logs keep them too, the first login on a preview tells (`docs/delivery.md`, **Previews**): #9 closed without one.
- `next dev` writes route types under `.next/dev/types/`, which `tsconfig.json` includes and `next typegen` leaves alone, so a route deleted since the last `next dev` fails `pnpm typecheck` with TS2307 on `.next/dev/types/validator.ts`: on 2026-10-26, a throwaway `src/app/probe-alert/` of the day before did. Deleting `.next/dev/types/` fixes it, and the next `next dev` writes it again.
- `next dev` writes an `AGENTS.md` for the coding agent it detects unless `next.config.ts` sets `agentRules: false` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/agentRules.md`). The docs it would point to, which match the installed Next.js, are in `node_modules/next/dist/docs/`.
