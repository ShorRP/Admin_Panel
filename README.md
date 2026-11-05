# Shor Admin Panel

The web app the staff of Shor, a Skyrim roleplay server, use to administer its Discord server without code or bot commands.

The panel is a Next.js app in TypeScript, under [`src/app/`](src/app/), whose interface is in French only. Its interface is built with Tailwind CSS 4 and with shadcn/ui components on Base UI, copied into [`src/ui/`](src/ui/), whose [`globals.css`](src/ui/globals.css) holds the theme. So far it serves, under a shared header, which only the staff reach, through a Discord login, the blocked words, the audit log, the archives of the support tickets, `/support-tickets`, and the records of the moderation section, `/records`, which opens only to the staff members who also hold a role of `MODERATION_ROLE_IDS`, and where they time out a member or lift their timeout, and kick a member, and [`src/discord/`](src/discord/) holds the panel's client for Discord's REST API, with an in-memory fake that the tests use instead, and an HTTP adapter through which that fake answers the panel's calls in the end-to-end tests, under [`e2e/`](e2e/), while [`src/monitoring/`](src/monitoring/) sends the panel's own errors to a private Discord channel, through a webhook. The repository also holds the project's docs and tooling. Work is tracked on the [Admin Panel board](https://github.com/orgs/ShorRP/projects/1).

## Docs

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary.
- [`docs/adr/`](docs/adr/): the decisions that shape it.
- [`CLAUDE.md`](CLAUDE.md): how we work, for people and agents alike.
- [`docs/agents/`](docs/agents/): the tracker's conventions and the open questions.
- [`SECURITY.md`](SECURITY.md): how to report a vulnerability, privately.
- [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md): the notices of the code that comes from other projects, shadcn/ui's MIT license so far.

## Requirements

- Node 24, the one major that `engines` sets in `package.json`, as `^24.0.0`, and that Vercel and CI run too.
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

Run the tooling's tests, then the panel's:

```bash
pnpm test
```

Run the contract suite of the panel's Discord client against the real Discord, on the Discord server and with the token that `.env.local` names. It creates AutoMod rules, all named `Contract …`, deletes them, and touches no other rule; the Discord server needs room for one more keyword rule, and at least one category, which it lists with the channels. It also times out the member `CONTRACT_MEMBER_ID` names, then lifts the timeout, sends that member a direct message, which it then deletes, and bans the account `CONTRACT_ABSENT_USER_ID` names, then lifts the ban. It also posts six messages in the first text channel of the Discord server where the application can read the history and post, searches them, and deletes them: the application needs View Channel, Read Message History and Send Messages there, and the Message Content intent, and this part takes a few minutes, since Discord's search finds a message up to about 100 seconds after its post:

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
- `DISCORD_BOT_TOKEN`: the panel's application token, which Discord files under the application's Bot tab and which the panel sends as `Authorization: Bot`. The panel never connects to Discord's gateway with it ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)), and the application needs Manage Server and View Audit Log on the Discord server, the latter also to read its bans, Timeout Members, `MODERATE_MEMBERS`, to time a member out, lift the timeout and create the AutoMod rules of the blocked words that time out the member who writes one, Kick Members, `KICK_MEMBERS`, to kick a member, and Ban Members, `BAN_MEMBERS`, to ban an account and lift a ban. It also needs the Server Members Intent, `GUILD_MEMBERS`, to list the members of the Discord server, which an application on fewer than 100 Discord servers turns on itself, on the Bot page of Discord's Developer Portal, under Privileged Gateway Intents, for the panel's two applications alike. The panel opens no connection to the gateway with it ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)): it only calls the REST endpoint List Guild Members, which requires that intent (https://docs.discord.com/developers/resources/guild, read 2026-11-02), and receives no event; without it, Discord answers that call `403` with code `50001`, and the list of accounts of `/records` fails with the error page and an alert. Its role must sit above the roles of the members it times out, kicks or bans. To show the support tickets of an account on its record, it also needs View Channel and Read Message History on the archives channel (`TICKET_ARCHIVES_CHANNEL_ID`), which only the staff see: without them, Discord answers `403` with code `50001`, and every record and the page `/support-tickets` fail with the error page and an alert. Paging that channel's history, as a record does, needs no privileged intent; searching it, as `/support-tickets` does, needs Message Content, below. To show the support tickets in progress, it also needs View Channel on each ticket's channel, which the Bot gives the application's role when it creates the channel, and Read Message History, which the application's role holds on Shor at role level (#382, [ADR 0009](docs/adr/0009-ticket-archives-are-read-from-discord.md)): the panel reads the last 100 messages of each ticket the staff member views, with the Message Content intent below. Reading the Discord server's channels, to tell which of them a staff member views, is not documented to ask for a permission or an intent of its own (https://docs.discord.com/developers/resources/guild, Get Guild Channels, read 2026-11-05), but from 2026-11-16 Discord lists only the channels the application can view (https://docs.discord.com/developers/change-log, August 12, 2026, read 2026-11-05), so a channel that the application cannot view reads as one that nobody views. Searching the Discord server's messages needs Read Message History on the channels searched and the Message Content intent, `MESSAGE_CONTENT`, turned on in the Developer Portal for the panel's two applications, which Gilles did on 2026-11-05 (https://docs.discord.com/developers/resources/message, Search Guild Messages, read 2026-11-05); the panel uses it through REST alone, and the Bot does not ask for it when it connects to the gateway ([ADR 0010](docs/adr/0010-message-content-to-read-the-discord-servers-channels.md)).
- `DISCORD_GUILD_ID`: the ID of the Discord server the panel administers, Gilles' test Discord server in development and on previews, Shor's in production. A snowflake.
- `ALERT_WEBHOOK_URL`: the URL of the Discord webhook to which the panel sends an alert for each of its own errors, a URL under `https://discord.com/api/webhooks/` that Discord gives for a webhook of a private channel, on Gilles' test Discord server. It holds the webhook's token, so it is a secret like the others. Production requires it, so a production build on Vercel fails without it. Leave it unset anywhere else, where the panel writes its errors to the console only, but to try an alert by hand; an empty value counts as unset.
- `STAFF_ROLE_ID`: the ID of the Discord role that makes a member of the Discord server part of the staff, the only members the panel lets in. A snowflake.
- `MODERATION_ROLE_IDS`: the IDs of the Discord roles that open the moderation section, `/records`, to a staff member who also holds `STAFF_ROLE_ID`, roles of Gilles' test Discord server in development and on previews. One or more snowflakes, separated by commas.
- `BAN_ROLE_IDS`: the IDs of the Discord roles that, within the moderation section, let a staff member who also holds a role of `MODERATION_ROLE_IDS` ban an account and lift a ban, roles of Gilles' test Discord server in development and on previews. One or more snowflakes, separated by commas.
- `CONTRACT_MEMBER_ID`: the ID of the member of the Discord server that `pnpm test:contract` times out and sends a direct message, a test account below the application's role, without Administrator, which is not the owner of the Discord server. Only `pnpm test:contract` reads it. A snowflake.
- `CONTRACT_ABSENT_USER_ID`: the ID of an account that is not on the Discord server, which `pnpm test:contract` bans by its ID, then lifts the ban of. It must not be banned when the suite starts. Only `pnpm test:contract` reads it. A snowflake.
- `TICKET_ARCHIVES_CHANNEL_ID`: the ID of the channel where the Bot posts the archive of each closed support ticket, `1562505523490848881`, « 📃・transcriptions », on Shor's Discord server, which the panel reads to show an account's tickets on its record and every ticket on `/support-tickets` ([ADR 0009](docs/adr/0009-ticket-archives-are-read-from-discord.md)). A snowflake. Optional: left unset, or empty, a record and `/support-tickets` say that the archives are not configured. Gilles' test Discord server has had one since 2026-11-05, « transcriptions », `1567881753266229298`, in the ticket category `1567881446415278191` (#382). Set it in Production on Vercel, which only Gilles does, then redeploy, since a variable reaches a deployment at its build.
- `TICKET_CATEGORY_ID`: the ID of the category where the Bot creates the channel of each support ticket, `1559574907426439229`, « ・TICKETS PRIVÉS ・ », on Shor's Discord server, which the panel reads to list the support tickets still open on `/support-tickets` ([ADR 0009](docs/adr/0009-ticket-archives-are-read-from-discord.md), section « The support tickets in progress »). A snowflake. Optional: left unset, or empty, the page says that the tickets category is not configured. Gilles' test Discord server has had one since 2026-11-05, `1567881446415278191` (#382). Set it in Production on Vercel, which only Gilles does, then redeploy, since a variable reaches a deployment at its build.
- `SESSION_SECRET`: the secret that seals the staff's session cookie, at least 32 random characters, a different one per environment. Changing it logs every member out.
- `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`: Vercel's system variables, from which an alert names its environment and its short commit. Vercel sets them once the project exposes its system variables, so `.env.example` leaves them out: leave them unset anywhere else, where an alert says `local`.
- `E2E_TEST_PROXY`: `1` turns on Next.js's test proxy, through which the end-to-end tests answer the server's calls to Discord. Only `playwright.config.ts` sets it, so `.env.example` leaves it out: leave it unset anywhere else. Any other value, an empty one included, is refused, and a build on Vercel refuses it.

## Related

- [ShorBot](https://github.com/ShorRP/ShorBot): Shor's Discord bot, which serves the members on the Discord server, by loanspac ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)).
- [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp): the open-source SkyMP roleplay base ShorBot's first version, in Node, came from. Shor itself does not run it: it has its own SkyMP server and launcher (ADR 0001).

## License

None. The repository carries no license, so default copyright applies: "no one may reproduce, distribute, or create derivative works from your work", while GitHub's Terms of Service give its users "the right to view and fork your repository" (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, read 2026-10-25). [ADR 0007](docs/adr/0007-public-repository-for-vercel-hobby.md) says why. The code copied from shadcn/ui into `src/ui/` keeps its MIT license, whose notice is in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
