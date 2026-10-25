# Shor Admin Panel

The web app the staff of Shor, a Skyrim roleplay server, use to administer its Discord server without code or bot commands.

The panel is a Next.js app in TypeScript, under [`src/app/`](src/app/), whose interface is in French only. Its interface is built with Tailwind CSS 4 and with shadcn/ui components on Base UI, copied into [`src/ui/`](src/ui/), whose [`globals.css`](src/ui/globals.css) holds the theme. So far it serves a home page, on the theme's background and text, and `src/ui/` holds a button. The repository also holds the project's docs and tooling. Work is tracked on the [Admin Panel board](https://github.com/orgs/ShorRP/projects/1).

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

None yet. They are documented here as they arrive, since `.env.example` holds no comments.

## Related

- [ShorBot](https://github.com/ShorRP/ShorBot): Shor's Discord bot, by loanspac.
- [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp): the open-source SkyMP roleplay base ShorBot comes from. Shor itself does not run it: it has its own SkyMP server and launcher (ADR 0001).

## License

None. The repository carries no license, so default copyright applies: "no one may reproduce, distribute, or create derivative works from your work", while GitHub's Terms of Service give its users "the right to view and fork your repository" (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, read 2026-10-25). [ADR 0007](docs/adr/0007-public-repository-for-vercel-hobby.md) says why. The code copied from shadcn/ui into `src/ui/` keeps its MIT license, whose notice is in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
