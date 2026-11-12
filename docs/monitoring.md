# Monitoring

The evidence behind `.claude/rules/monitoring.md`: what Next.js does with an error, what each vendor page says, and the trials that showed how an alert behaves. The rule says what to do; this file says how it was known. Gilles decided the design while grilling #50 on 2026-10-24, with everything kept free, and the options set aside, and why, are in #50's decisions. #78 wrote `src/monitoring/` and `instrumentation.ts`, #59 gave `DiscordError` its route's pattern, #10 made the login callback report what it catches, and #9 set the webhook's variable in Vercel's dashboard.

The `node_modules` citations are those of Next.js 16.4.2 unless a package is named: an update of a package re-reads the citations that name it (« Docs that name a version », in the Dependencies rules).

## What Next.js prints, and where an error goes

- Next.js prints every error thrown in a render, a Server Action or a Route Handler itself, through `console.error`, before it calls `onRequestError` (`node_modules/next/dist/server/route-modules/route-module.js:320-327`), with its message, its stack and its enumerable properties, `digest` included (`node_modules/next/dist/server/patch-error-inspect.js:437-442`). `redirect()` and `notFound()` never get there (`node_modules/next/dist/server/app-render/create-error-handler.js:52`, `:68-71`).
- An error of `proxy.ts` takes another way to `onRequestError`, with no such `console.error` on it (`node_modules/next/dist/build/templates/middleware.js:108-118`), and that way looks for the instrumentation the edge runtime loads, `_ENTRIES.middleware_instrumentation` (`node_modules/next/dist/server/web/globals.js:27-30`, `:48-57`), while `proxy.ts` runs on Node.js only (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:255`).
- On 2026-10-25, a throwaway `proxy.ts` that threw, under `next start`, never reached `onRequestError`, and Next.js printed its error once, with its stack. This is inferred for Vercel, where it was not tried. It is why `proxy.ts` catches its own errors (Gilles, 2026-10-25, on #78).
- On 2026-10-25, with Next.js 16.4.2 and Turbopack, a `DiscordError` thrown by a throwaway page and by a throwaway Route Handler reached `onRequestError` with `instanceof DiscordError` false, its `name` and its fields intact: `instrumentation.ts` gets its own copy of every module it imports. `src/monitoring/panel-error.test.ts` holds the case.

## Logs

- Vercel's own pages disagree on whether the fields of a JSON line are searchable: https://vercel.com/docs/logs/runtime (updated 2026-08-28) against https://vercel.com/kb/guide/add-structured-application-logs-to-vercel-functions (updated 2026-05-28). Hobby keeps runtime logs one hour (the first page).
- Stacks stay minified since `experimental.serverMinification` defaults to `true` (`node_modules/next/dist/server/config-shared.js:203`).

## Alerts

- Discord keeps a channel's messages with no expiry, which covers the 7 days an alert must stay findable (inferred, not checked against Discord's docs).
- A failed deployment notifies its creator, on the web and by email, by default on every plan (https://vercel.com/docs/notifications, updated 2026-09-14).
- An alert's route comes from the context of `onRequestError`: `routeType` and `routePath`, the route's file path (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md:109`). `request.path` holds the query string (`instrumentation.md:103`), which is why no alert carries it.
- A webhook's `content` holds 2,000 characters at most, and its default parses users, which `allowed_mentions: { parse: [] }` turns off (https://docs.discord.com/developers/resources/webhook, modified 2026-06-25).
- Discord gives no figure for the rate limit of webhooks (https://docs.discord.com/developers/topics/rate-limits, modified 2026-02-06).

## Sending

- Next.js awaits `onRequestError` before it answers a Route Handler or an error that escapes a render (`node_modules/next/dist/build/templates/app-route.js:338`, `node_modules/next/dist/build/templates/app-page-runtime.js:1602`), but not for an error thrown while streaming (`create-error-handler.js:125`), and `after()` is documented for Server Components, Server Functions, Route Handlers and `proxy.ts` only (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:8`).
- An invalid `ALERT_WEBHOOK_URL` makes `onRequestError` throw, which Next.js catches and prints as `Error in instrumentation.onRequestError:` (`node_modules/next/dist/server/lib/router-utils/instrumentation-globals.external.js:138`).
- `waitUntil` from `@vercel/functions` hands the send to the `waitUntil` of the request context that Vercel's runtime keeps under `Symbol.for("@vercel/request-context")`; without that context it does nothing (`node_modules/@vercel/functions/wait-until.js`, `get-context.js`, 3.10.1).

### Trials

- Under `next start`, an error thrown while streaming and one thrown by a Route Handler each sent their alert, to a well-formed URL that Discord answered with a 404 (2026-10-25).
- Under `pnpm dev`, with `ALERT_WEBHOOK_URL` set by hand, a Route Handler's panel error reached the private channel of Gilles' test Discord server (Gilles, 2026-10-25).
- On a preview, the send of an error thrown while streaming reached its end too. On 2026-10-30, a throwaway page under `/login/`, `◐` in the build's list, whose component under `<Suspense>` threw after `connection()`, put an alert in that channel with `preview`, the commit, `render /login/probe-alert`, the `digest` and frames under `/var/task/` (Gilles, on #78).
- That the response had already left is read under `next start`, where `curl` got the page's `200` and its shell in 27 ms, the boundary flagged in the stream, and inferred on Vercel. Whether the send would have ended without `waitUntil` was not tried.
- Each render that fails sends its own alert: that trial's « Réessayer » sent a second one with the same `digest`, as a load and a click on it sent two in a browser under `next start` (2026-10-30).
