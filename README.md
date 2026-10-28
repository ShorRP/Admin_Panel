# Shor Admin Panel

The web app the staff of Shor, a Skyrim roleplay server, use to administer its Discord server without code or bot commands.

The panel is a Next.js app in TypeScript, under [`src/app/`](src/app/), whose interface is in French only. Its interface is built with Tailwind CSS 4 and with shadcn/ui components on Base UI, copied into [`src/ui/`](src/ui/), whose [`globals.css`](src/ui/globals.css) holds the theme. So far it serves the blocked words, the audit log and the moderation section's records, under a shared header, which only the staff reach, through a Discord login, and answers at `/interactions` the PING with which Discord checks the address of the panel's application, and [`src/discord/`](src/discord/) holds the panel's client for Discord's REST API, with an in-memory fake that the tests use instead, and an HTTP adapter through which that fake answers the panel's calls in the end-to-end tests, under [`e2e/`](e2e/), while [`src/monitoring/`](src/monitoring/) sends the panel's own errors to a private Discord channel, through a webhook. The repository also holds the project's docs and tooling. Work is tracked on the [Admin Panel board](https://github.com/orgs/ShorRP/projects/1).

## Docs

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary.
- [`docs/adr/`](docs/adr/): the decisions that shape it.
- [`CLAUDE.md`](CLAUDE.md): how we work, for people and agents alike.
- [`docs/agents/`](docs/agents/): the tracker's conventions and the open questions.
- [`SECURITY.md`](SECURITY.md): how to report a vulnerability, privately.
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md): the notices of the code that comes from other projects, shadcn/ui's MIT license so far.

## Requirements

- Node `^22.13.0 || ^24.0.0 || >=26.0.0`, the range `engines` sets in `package.json`.
- pnpm, at the version `packageManager` pins in `package.json`.

## Commands

Install the dependencies:

```bash
pnpm install
```

Serve the panel at http://localhost:3000, reloading on every change:

```bash
pnpm dev
```

Have "Shor Panel Dev" send its interactions, the clicks on the buttons and menus of the messages the panel posts, to that `pnpm dev`, through a Cloudflare quick tunnel, while `pnpm dev` runs in another terminal. The tunnel needs no Cloudflare account, and `cloudflared` installs once, on Windows:

```bash
winget install --id Cloudflare.cloudflared --exact
```

Then, in a terminal opened after the install, so that it finds `cloudflared`, with `DISCORD_BOT_TOKEN` and `DISCORD_PUBLIC_KEY` of "Shor Panel Dev" in `.env.local`:

```bash
pnpm dev:tunnel
```

It checks that the token and the public key are "Shor Panel Dev"'s, and that `pnpm dev` refuses an unsigned request to `/interactions`, opens the tunnel, then points the application's Interactions Endpoint URL at `/interactions` through it, which Discord accepts only once a PING signed by Discord gets its PONG. The tunnel's URL changes at every run, and while it runs anyone who has it reaches `pnpm dev`, whose pages still ask for the staff's login. Ctrl+C stops it; Discord should then remove the stale URL at its next check, with an email (inferred). Previews receive no interactions.

Run the tooling's tests, then the panel's:

```bash
pnpm test
```

Run the contract suite of the panel's Discord client against the real Discord, on the Discord server and with the token that `.env.local` names. It creates AutoMod rules, all named `Contract …`, deletes them, and touches no other rule; the Discord server needs room for one more keyword rule:

```bash
pnpm test:contract
```

Run the end-to-end tests with Playwright, on Chromium, against `next start` serving the last build. The server never reaches the real Discord: each test's in-memory fake answers the calls it makes for that test's page. Install Chromium once:

```bash
pnpm exec playwright install chromium
```

Then build, and run them:

```bash
pnpm build
```

```bash
pnpm test:e2e
```

Check the types:

```bash
pnpm typecheck
```

Lint the repository:

```bash
pnpm lint
```

Build the panel for production:

```bash
pnpm build
```

Serve that build at http://localhost:3000:

```bash
pnpm start
```

Check that the repository holds no comments:

```bash
pnpm check:comments
```

Lay out the repository with Prettier, sorting Tailwind classes and imports, as `prettier.config.mjs` sets:

```bash
pnpm format
```

Check that it is laid out, as CI does:

```bash
pnpm format:check
```

Have `git blame` skip the commits that only reformat, as GitHub's blame does, through `.git-blame-ignore-revs`:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Copy a shadcn/ui component into `src/ui/`, with the dependencies it needs, as `components.json` sets; `button` here:

```bash
pnpm exec shadcn add button
```

The copy then loses its comments and its English strings turn French. To see how a copied file differs from the registry's:

```bash
pnpm exec shadcn add button --diff
```

## Environment variables

`pnpm dev` and `pnpm test:contract` read them from `.env.local`, which git ignores, while `pnpm test:e2e` sets placeholders of its own, in `playwright.config.ts`; [`.env.example`](.env.example) lists them, empty, but `E2E_TEST_PROXY` and Vercel's own two, and they are documented here, since it holds no comments. On Vercel, the project's settings hold them, along with `ENABLE_EXPERIMENTAL_COREPACK=1`, which no code reads: it has Vercel install with the pnpm that `packageManager` names. The panel checks each variable the first time it needs it, and a build on Vercel checks them all, so a missing or invalid one fails that build; `E2E_TEST_PROXY` alone is checked whenever Next.js loads its config, under `pnpm dev`, `pnpm build`, `pnpm start` and `pnpm typecheck` alike. The error names the variable, never its value.

- `DISCORD_CLIENT_ID`: the client ID of the panel's Discord application, "Shor Panel Dev" in development and on previews, "Shor Panel" in production. A snowflake, 17 to 20 digits.
- `DISCORD_CLIENT_SECRET`: that application's client secret, from its OAuth2 page in Discord's Developer Portal.
- `DISCORD_REDIRECT_URI`: where Discord sends a member back after they log in, `/login/callback` on the panel's own URL, such as `http://localhost:3000/login/callback`. It must be among the application's OAuth2 redirects, and use `https:` anywhere but on `localhost`.
- `DISCORD_BOT_TOKEN`: the panel's application token, which Discord files under the application's Bot tab and which the panel sends as `Authorization: Bot`. The panel never connects to Discord's gateway with it ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)), and the application needs Manage Server and View Audit Log on the Discord server, the latter also to read its bans.
- `DISCORD_PUBLIC_KEY`: the public key of the panel's Discord application, from its General Information page in Discord's Developer Portal, with which the panel checks that an interaction sent to `/interactions` comes from Discord ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)). 64 hexadecimal digits. It is no secret, but it changes with the application: "Shor Panel Dev"'s in development and on previews, "Shor Panel"'s in production.
- `DISCORD_GUILD_ID`: the ID of the Discord server the panel administers, Gilles' test Discord server in development and on previews, Shor's in production. A snowflake.
- `ALERT_WEBHOOK_URL`: the URL of the Discord webhook to which the panel sends an alert for each of its own errors, a URL under `https://discord.com/api/webhooks/` that Discord gives for a webhook of a private channel, on Gilles' test Discord server. It holds the webhook's token, so it is a secret like the others. Production requires it, so a production build on Vercel fails without it. Leave it unset anywhere else, where the panel writes its errors to the console only, but to try an alert by hand; an empty value counts as unset.
- `STAFF_ROLE_ID`: the ID of the Discord role that makes a member of the Discord server part of the staff, the only members the panel lets in. A snowflake.
- `MODERATION_ROLE_IDS`: the IDs of the Discord roles that open the moderation section, `/records`, to a staff member who also holds `STAFF_ROLE_ID`, roles of Gilles' test Discord server in development and on previews. One or more snowflakes, separated by commas.
- `BAN_ROLE_IDS`: the IDs of the Discord roles that, within the moderation section, let a staff member ban an account and lift a ban, which the panel cannot do yet (#181). One or more snowflakes, separated by commas.
- `SESSION_SECRET`: the secret that seals the staff's session cookie, at least 32 random characters, a different one per environment. Changing it logs every member out.
- `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`: Vercel's system variables, from which an alert names its environment and its short commit. Vercel sets them once the project exposes its system variables, so `.env.example` leaves them out: leave them unset anywhere else, where an alert says `local`.
- `E2E_TEST_PROXY`: `1` turns on Next.js's test proxy, through which the end-to-end tests answer the server's calls to Discord. Only `playwright.config.ts` sets it, so `.env.example` leaves it out: leave it unset anywhere else. Any other value, an empty one included, is refused, and a build on Vercel refuses it.

## Related

- [ShorBot](https://github.com/ShorRP/ShorBot): Shor's Discord bot, by loanspac.
- [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp): the open-source SkyMP roleplay base ShorBot comes from. Shor itself does not run it: it has its own SkyMP server and launcher (ADR 0001).

## License

None. The repository carries no license, so default copyright applies: "no one may reproduce, distribute, or create derivative works from your work", while GitHub's Terms of Service give its users "the right to view and fork your repository" (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, read 2026-10-25). [ADR 0007](docs/adr/0007-public-repository-for-vercel-hobby.md) says why. The code copied from shadcn/ui into `src/ui/` keeps its MIT license, whose notice is in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
