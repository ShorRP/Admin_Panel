# Shor Admin Panel

The web app the staff of Shor, a Skyrim roleplay server, use to administer its Discord server without code or bot commands.

The panel is a Next.js app in TypeScript, under [`src/app/`](src/app/), whose interface is in French only. Its interface is built with Tailwind CSS 4 and with shadcn/ui components on Base UI, copied into [`src/ui/`](src/ui/), whose [`globals.css`](src/ui/globals.css) holds the theme. So far it serves a home page, on the theme's background and text, `src/ui/` holds a button, and [`src/discord/`](src/discord/) holds the panel's client for Discord's REST API, with an in-memory fake that the tests use instead, and an HTTP adapter through which that fake answers the panel's calls in the end-to-end tests, under [`e2e/`](e2e/). The repository also holds the project's docs and tooling. Work is tracked on the [Admin Panel board](https://github.com/orgs/ShorRP/projects/1).

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

`pnpm dev` and `pnpm test:contract` read them from `.env.local`, which git ignores, while `pnpm test:e2e` sets placeholders of its own, in `playwright.config.ts`; [`.env.example`](.env.example) lists them, empty, but `E2E_TEST_PROXY`, and they are documented here, since it holds no comments. On Vercel, the project's settings hold them. The panel checks each variable the first time it needs it, and a build on Vercel checks them all, so a missing or invalid one fails that build; `E2E_TEST_PROXY` alone is checked whenever Next.js loads its config, under `pnpm dev`, `pnpm build`, `pnpm start` and `pnpm typecheck` alike. The error names the variable, never its value.

- `DISCORD_CLIENT_ID`: the client ID of the panel's Discord application, "Shor Panel Dev" in development and on previews, "Shor Panel" in production. A snowflake, 17 to 20 digits.
- `DISCORD_CLIENT_SECRET`: that application's client secret, from its OAuth2 page in Discord's Developer Portal.
- `DISCORD_REDIRECT_URI`: where Discord sends a member back after they log in, `/login/callback` on the panel's own URL, such as `http://localhost:3000/login/callback`. It must be among the application's OAuth2 redirects, and use `https:` anywhere but on `localhost`.
- `DISCORD_BOT_TOKEN`: the panel's application token, which Discord files under the application's Bot tab and which the panel sends as `Authorization: Bot`. The panel never connects to Discord's gateway with it ([ADR 0003](docs/adr/0003-event-driven-features-belong-to-shorbot.md)), and the application needs Manage Server and View Audit Log on the Discord server.
- `DISCORD_GUILD_ID`: the ID of the Discord server the panel administers, Gilles' test Discord server in development and on previews, Shor's in production. A snowflake.
- `E2E_TEST_PROXY`: `1` turns on Next.js's test proxy, through which the end-to-end tests answer the server's calls to Discord. Only `playwright.config.ts` sets it, so `.env.example` leaves it out: leave it unset anywhere else. Any other value, an empty one included, is refused, and a build on Vercel refuses it.

## Related

- [ShorBot](https://github.com/ShorRP/ShorBot): Shor's Discord bot, by loanspac.
- [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp): the open-source SkyMP roleplay base ShorBot comes from. Shor itself does not run it: it has its own SkyMP server and launcher (ADR 0001).

## License

None. The repository carries no license, so default copyright applies: "no one may reproduce, distribute, or create derivative works from your work", while GitHub's Terms of Service give its users "the right to view and fork your repository" (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, read 2026-10-25). [ADR 0007](docs/adr/0007-public-repository-for-vercel-hobby.md) says why. The code copied from shadcn/ui into `src/ui/` keeps its MIT license, whose notice is in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
