# CLAUDE.md

The Admin Panel is the web app Shor's staff use to administer the Discord server: a Discord login for the staff, blocked words kept in a Discord AutoMod rule (ADR 0002), and an audit log (ADR 0004). It is a Next.js app (App Router) in TypeScript under `src/app/`, to be hosted on Vercel, that talks to Discord's REST API only (ADR 0003). As of 2026-10-23 it serves a single French home page; the repo also holds the docs and the tooling.

## How we work

The process lives in Matt Pocock's skills (`mattpocock/skills`). This file only adds what the skills can't know about this repo.

Reach for these yourself:

- **tdd** for every behaviour change.
- **diagnosing-bugs** for any bug that survives a first look: a tight loop that goes red on this bug comes before any theory.
- **domain-modeling** the moment a term is fuzzy, overloaded, or disagrees with `GLOSSARY.md`, and whenever a decision clears the ADR bar.
- **code-review** against the originating ticket before any commit that closes one.
- **groom-backlog** before your final report, when the session changed the repo or leaves loose ends, or once a burst of tracker writes is over: an issue created, edited, labelled, closed or re-parented, a PR opened or merged, work started on an issue. A hook reminds you after each write.

The orchestrating skills are run by the user. When you see the moment for one, suggest it in a single line, then carry on:

- non-trivial change, not grilled yet → `/grill-with-docs`
- grilled change too big for one session → `/to-spec`, then `/to-tickets`
- effort too foggy to scope → `/wayfinder`
- the answer lives in a teammate's head (the POs, the staff, loanspac) → `/to-questionnaire`

## Language

Three things are in **French**: chat with the user, GitHub issues and their board (title, body, comments, and the board's descriptions and view names; see `docs/agents/issue-tracker.md`), and the panel's interface, which is French only, with no translation layer. Everything else is in **English**: docs, `GLOSSARY.md`, ADRs, PR text and PR comments, commit messages, and every word written into the codebase: file names, identifiers, logs.

## No comments

The repository holds no comments, in any file that supports them: code, tests, scripts, CSS, HTML, SQL, YAML, `.env.example`, whose variables are documented in the README. Two exceptions only: a shebang, and a tool directive the code needs to work (`eslint-disable…`, `@ts-expect-error`, `/// <reference …>`, `@vite-ignore`, `webpackIgnore`).

What a comment would say goes elsewhere: the why of a change in its commit message, a decision in an ADR, a term in `GLOSSARY.md`, an invariant in a test and its name. Code copied from elsewhere, such as skymp-heavy-rp or EsportCards, loses its comments on the way in.

`pnpm check:comments` checks every tracked or untracked, non-ignored file. A hook runs it before `gh pr create`, and CI on every PR and every push to `main`.

## Facts and docs

- **Facts apart from inferences.** Everything you write to docs, tickets or reports keeps verified facts, with their source (`file:line`, commit, URL and date, command output), visibly separate from inferences.
- **Challenge with evidence.** When the code, the docs, `GLOSSARY.md`, an ADR and the user's request disagree, name the contradiction, quote both sides, and ask which one wins. Record the answer through domain-modeling.
- **Unrecoverable why.** When nothing explains a decision or a fact the work needs, append it to `docs/agents/open-questions.md`: the question, where it shows up, who is likely to know, what is blocked on it.
- **Docs as you go.** Docs are updated the moment they become true, in the same change. `GLOSSARY.md` is a glossary and nothing else; ADRs follow domain-modeling's bar. When docs contradict the code, fix them in the same change if it takes a few lines, otherwise list them in your report.
- **Scope.** Each diff stays inside its ticket. Problems you spot nearby are loose ends: groom-backlog files them as tickets.
- **Gotchas.** When a session hits a trap the environment doesn't reveal, add one line under **Gotchas**. Delete lines that stop being true.

## Feedback loops

- Tests: `pnpm test` runs the tooling's tests, `node --test` over `test/**/*.test.mjs`, then the panel's, Vitest over `src/**/*.test.{ts,tsx}`. Vitest runs in Node, without a DOM: a test renders a component with `react-dom/server`, as the server does. One file: `node --test test/<name>.test.mjs` or `pnpm exec vitest run <path>`. Discord is always replaced by an in-memory fake: no test calls the real Discord.
- Typecheck: `pnpm typecheck` runs `next typegen`, which writes what a fresh clone lacks, the gitignored `next-env.d.ts` and the route types behind `PageProps` and `LayoutProps`, then `tsc --noEmit`.
- Lint: `pnpm lint`, ESLint with `eslint-config-next`'s Core Web Vitals and TypeScript configs, over the whole repo.
- Build: `pnpm build` (`next build`), which type-checks again. Dev server: `pnpm dev`.
- Comments: `pnpm check:comments`.
- CI: `.github/workflows/ci.yml` runs the comment check, the typecheck, the lint, the tests and the build. It is advisory: branch protection and rulesets are refused on this private repository of a free organization (HTTP 403 « Upgrade to GitHub Pro or make this repository public », checked 2026-10-23). Never merge a PR whose CI is red.

## Commits, PRs, issues

- Commit messages read `Area: what changed`, in English.
- The user is the sole author: commits carry no `Co-Authored-By` trailer, PRs carry no "Generated with" footer.
- Only the maintainer, Gilles (`docs/agents/issue-tracker.md`, **People**), merges into `main`, with a merge commit, never a squash. Vercel's Hobby plan has no team collaboration, and its forum reports blocked deploys when a private repo's commit author is not the owner's linked GitHub account; this is to be confirmed at the first deploy.
- Issues, PR descriptions and comments read like a teammate wrote them: direct, specific, complete, no filler.
- A PR that only advances a ticket names it once, as `Part of #<n>`. GitHub closes, at merge, every issue that a PR description or commit message puts right after `close`, `fix` or `resolve` (any form), even inside a negation.
- Once a PR merges, delete its local branch with `git branch -d` and run `git fetch --prune`. When `-d` refuses, the branch holds unmerged work: ask the user.

## Gotchas

- `@babel/parser`, which the comment check uses, stays on 7.x: 8.x requires Node `^22.18.0 || >=24.11.0` (`npm view @babel/parser@8 engines`, 2026-10-23), narrower than the `^22.13.0 || ^24.0.0 || >=26.0.0` that `engines` promises in `package.json`. CI would not catch the gap: its `node-version: 22` ran Node 22.23.3 on 2026-10-23 (run 39944674281), which 8.x accepts.
- `engines.node` is the intersection of the ranges the toolchain declares: Vitest 5 wants `^22.12.0 || ^24.0.0 || >=26.0.0`, ESLint 10 `^20.19.0 || ^22.13.0 || >=24` (`npm view <package> engines`, 2026-10-23). Read a new dependency's `engines` before adding it: jsdom 30, for one, wants `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `typescript@7` on npm is the native compiler: its package exports no stable JavaScript API (only `./unstable/*`), so tooling that parses code cannot rely on it. That is why the comment check parses with Babel, and why TypeScript stays on `~6.0.3`: typescript-eslint, which `eslint-config-next/typescript` uses, accepts `typescript >=4.8.4 <6.1.0` (8.72.0, `npm view typescript-eslint peerDependencies`, 2026-10-23). Next.js alone would accept 7, through its `tsc` CLI (https://nextjs.org/docs/app/api-reference/config/typescript, updated 2026-08-25).
- ESLint is on 10, since 9.x reached end-of-life on 2026-08-06 (https://eslint.org/version-support, read 2026-10-23). `eslint-config-next` supports 10 since 16.4.0 (https://nextjs.org/docs/app/api-reference/config/eslint, updated 2026-10-15), but three plugins it bundles, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and `eslint-plugin-react`, still cap their `eslint` peer at `^9`: hence the `peerDependencyRules` of `pnpm-workspace.yaml`. Drop each rule once its plugin lists 10.
- pnpm 12 refuses a version published less than a day ago (`minimumReleaseAge`), and `pnpm add` of such a version writes it into `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` without asking. On 2026-10-23, `pnpm add` reported doing so for Next.js 16.4.3, on npm since 13:40 UTC that day (`npm view next time`), so the panel stayed on 16.4.2. Read `pnpm-workspace.yaml` after every `pnpm add`.
- `next dev` writes an `AGENTS.md` for the coding agent it detects unless `next.config.ts` sets `agentRules: false` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/agentRules.md`). The docs it would point to, which match the installed Next.js, are in `node_modules/next/dist/docs/`.
- The hooks of `.claude/settings.json` need `pnpm install` first: without `node_modules`, the comment check cannot run and `gh pr create` is refused.
- The API can show Auto-add to project `enabled` while it adds nothing: its filter, which the API hides, once held a stray `label:`. Only an issue that `github-project-automation` puts on the board proves it works (`docs/agents/issue-tracker.md`, **Board workflows**).
- Writes to the project board need gh's `project` scope; `read:project` only lets `backlog.mjs plan` read it. When `apply` fails on a missing scope, run `gh auth refresh -s project`, which opens a browser.
- Several sessions can share this folder. On 2026-10-23, one session's `git switch -c` took the folder off the branch another session was working on, under its uncommitted changes (`git reflog`). Before switching branches here, read `git status` and `git reflog -3`; a change that needs its own branch goes in a `git worktree`.
- A browser tab of the project board keeps its own copy of the views in `sessionStorage` (`projects-v2/session-store-v1/…/memex-views`), which survives F5. On 2026-10-23, a tab opened between two view changes kept showing the older grouping after a reload, while a new tab showed the saved one (inferred from the key's contents, not from GitHub's code). After a view changes, check it in a new tab.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `ShorRP/Admin_Panel`, on the org project board **Admin Panel**, driven by the `gh` CLI. See `docs/agents/issue-tracker.md` for the commands and for writing an issue in French.

### Triage labels

The five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
