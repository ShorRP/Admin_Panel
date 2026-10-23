# Shor Admin Panel

The web app the staff of Shor, a Skyrim roleplay server, use to administer its Discord server without code or bot commands.

The repository holds the project's docs and tooling; the app itself is not scaffolded yet. Work is tracked on the [Admin Panel board](https://github.com/orgs/ShorRP/projects/1).

## Docs

- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary.
- [`docs/adr/`](docs/adr/): the decisions that shape it.
- [`CLAUDE.md`](CLAUDE.md): how we work, for people and agents alike.
- [`docs/agents/`](docs/agents/): the tracker's conventions and the open questions.

## Requirements

- Node 22 or later.
- pnpm, at the version `packageManager` pins in `package.json`.

## Commands

```bash
pnpm install
```

```bash
pnpm test
```

```bash
pnpm check:comments
```

## Environment variables

None yet. They are documented here as they arrive, since `.env.example` holds no comments.

## Related

- [ShorBot](https://github.com/ShorRP/ShorBot): Shor's Discord bot, by loanspac.
- [skymp-heavy-rp](https://github.com/vinicius3232/skymp-heavy-rp): the open-source SkyMP roleplay base ShorBot comes from. Shor itself does not run it: it has its own SkyMP server and launcher.
