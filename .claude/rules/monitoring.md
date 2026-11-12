---
paths:
  - "src/monitoring/**"
  - "src/instrumentation.ts"
---

# Monitoring

What the panel logs, what it never logs, and how Gilles learns that it broke (#50, built by #78, #59 and #10). The evidence behind each rule, Next.js's internals and the dated trials are in `docs/monitoring.md`: read it before changing how an error is caught, alerted or sent.

## What is logged

- Logs say why the panel failed; the audit log says which staff member changed what (`GLOSSARY.md`, ADR 0004). So logs hold failures only: no staff action, no success, no login.
- Next.js already prints every error that a render, a Server Action or a Route Handler throws, then calls `onRequestError`: the panel adds no line to those.
- The panel writes only what the login callback catches, since the callback throws nothing: a panel error at `error`, Discord unavailable and a missing or differing `state` at `warn`. Refused input, refused access, a login the member cancels on Discord (#10), a write that returns `{ ok: false }` because Discord is unavailable and a 429 retried with success leave nothing. `info` and `debug` go unused.
- `proxy.ts` catches what it throws, hands it to `Monitor.error` and lets the request through, because Next.js does not report its errors to `onRequestError` (tried under `next start`, inferred for Vercel; #78) and `proxy.ts` authorizes nothing: each page runs its own check, which fails the same way and alerts a second time (#10, `src/staff/redirect-without-session.test.ts`).
- Log lines go through `console.error` and `console.warn`, called with the error object as Next.js does, with no logging library and no JSON, since Vercel's log pages disagree on searching a JSON line's fields: the alert carries what matters.
- Stacks stay minified, with neither `serverSourceMaps` nor `--enable-source-maps`: the message, the route and a `DiscordError`'s fields place most failures in a panel this small.

## What is never logged

Never logged, nor sent in an alert: a secret, such as `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` or `ALERT_WEBHOOK_URL`; a member's OAuth2 token; the callback's `code` and `state`; a cookie, or the `Authorization` and `Cookie` headers; a member's Discord ID, name or IP, since the panel stores no personal data (ADR 0004); and what the staff typed, such as a blocked word. A member who reports a failure names themself in the staff's channel. That is why a `DiscordError` carries its route's pattern, never the path filled in.

## Alerts

- Every panel error notifies Gilles, the maintainer, alone, and stays findable for at least 7 days, a `proxy.ts` error included.
- Two reads turn a `DiscordError` into something else and alert no one, an avatar's lookup in the audit log (initials) and the blocked words' count in the navigation (no badge), as Read failures says (#141, #226). The support tickets' counts of request kinds hide only Discord unavailable, so a panel error there alerts (`.claude/rules/support-tickets.md`, **Read failures**). Discord unavailable notifies no one, since it passes.
- The staff get no alert: they report what they see in their channel, `error.tsx` with its reference, or `/login/failed`, which shows none.
- Alerts go through a Discord webhook into a private channel of Gilles' test Discord server (#7), which is free, needs no other account and leaves the panel writing every word it sends. Executing a webhook is the one call to Discord's REST API outside `DiscordApi` and `DiscordOAuth` (ADR 0003).
- Nothing is grouped: ten failing pages send ten messages, an alert sent during a Discord outage is lost, and each render that fails sends its own, « Réessayer » on a failing page included.
- No uptime probe: the failures that matter, a revoked token or a removed permission, show when a page reads Discord, and the alert fires then.
- The browser reports nothing: client leaves hold no logic, an action's error is thrown on the server before the browser sees it, and `connect-src` stays `'self'`.

## What an alert says

In English like the logs, as one `content` with no embed, within Discord's 2,000 characters:

- the environment, from `VERCEL_ENV` (`local` outside Vercel), and the short commit, from `VERCEL_GIT_COMMIT_SHA`;
- the context's `routeType` and `routePath`, when Next.js gives them, and the `digest`, when there is one;
- the error's name and message, which for a `DiscordError` hold its method, its route's pattern, its status, and Discord's `code` and `message`, then the stack's frames; these two go in a code block after the lines above, and its end is cut, ending on `…`, when it does not fit.

It never carries `request.path`, whose query string holds the callback's `code` and `state`, nor anything What is never logged names. It goes with `allowed_mentions: { parse: [] }`, so that no error text mentions anyone, where a webhook's default parses users. It holds no time: Discord shows when the message arrived.

## Sending

- An alert never changes what the staff see, so it runs in the background through `waitUntil`, gives up after 2 s through `AbortSignal.timeout` and never throws.
- It is never retried, a 429 included: in a burst the same error repeats, so the first alerts carry it (inferred).
- A failed send is one `console.error` line, `Alert not sent: ` then Discord's status or the name of what `fetch` threw, never its message, which can hold the webhook's URL, as a `Failed to parse URL from …` would.
- The factories can throw: `createRequestErrorReporter()` parses the variables on every error, and so does `createMonitor()`'s `error`, once its line is written, so an invalid `ALERT_WEBHOOK_URL` makes `onRequestError` throw, with the variable's name and never its value.

## `src/monitoring/`

- It sits outside the domain, like `src/discord/` and `src/ui/`. `alert.ts`, `monitor.ts` and `request-error.ts` start with `import "server-only"`.
- `Monitor` has one method per level, which `createMonitor()` builds, in `monitor.ts`, without reading its variables: `error` writes the line, then reads them and sends the alert, `warn` writes the line only. So a request that reports nothing, through `proxy.ts` say, never fails on `ALERT_WEBHOOK_URL` (#10).
- `isPanelError`, in `panel-error.ts`, tells whether a thrown error alerts: a `DiscordError` that says Discord is unavailable does not, anything else does. It knows a `DiscordError` by its `name` and its `unavailable`, never by `instanceof` (**Gotcha** below).
- `src/instrumentation.ts` only wires: its `onRequestError` hands the error, the request and the context to the reporter that `createRequestErrorReporter()` builds, in `request-error.ts`, which sends the alert when `isPanelError` says so and writes no line, since Next.js has written it.
- The login callback's domain function takes a `Monitor`, as it takes `DiscordApi` and `DiscordOAuth`, and so does what `proxy.ts` calls.
- `alert-message.ts` lays out the alert, and `alert.ts` sends it, over a `fetch` and a `waitUntil` taken as parameters that the two factories fill with `globalThis.fetch` and `@vercel/functions`' `waitUntil`.
- `env.ts` reads `ALERT_WEBHOOK_URL`, `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`, and `env.test.ts` holds their rules. `ALERT_WEBHOOK_URL` is a URL under `https://discord.com/api/webhooks/`, required when `VERCEL_ENV` is `production`, and left unset elsewhere, where `Monitor` only writes to the console. An empty one counts as unset, so that a copy of `.env.example` sends no alert rather than failing its parse (#78).
- `InMemoryMonitor`, in `in-memory-monitor.ts`, keeps each report with its level for the tests; the `no-restricted-imports` rule of `eslint.config.mjs` that keeps the fake Discord in `*.test.*` files refuses it elsewhere too.

## Tests

- Vitest proves `isPanelError`, the alert built from a `DiscordError`, the send and the login callback's reports; the names of the tests in `src/monitoring/*.test.ts` and `src/staff/login.test.ts` say each case.
- The send runs over a hand-written `fetch` and a `waitUntil` that keeps each send for the test to await. The delay runs on real timers, so that test lasts its 2 s, and the test captures the one `console.error` line that a failed send writes.
- The callback's test reads what an `InMemoryMonitor` holds: a report is its output, not a write to Discord.
- End to end sends no alert: the `webServer` of `playwright.config.ts` sets `ALERT_WEBHOOK_URL` empty.

## Gotcha

`instrumentation.ts` gets its own copy of every module it imports, so an error that a page or a Route Handler throws is no `instanceof` the class `instrumentation.ts` sees (#78, Next.js 16.4.2 with Turbopack; the trial is in `docs/monitoring.md`). Code that inspects an error there reads its fields, as `isPanelError` does.
