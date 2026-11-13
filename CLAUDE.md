# CLAUDE.md

The Admin Panel is the web app Shor's staff use to administer Shor's Discord server: a Discord login, then one section per thing they administer. It is a Next.js app (App Router) in TypeScript on Vercel's free Hobby plan, at https://shor-admin-panel.vercel.app, built from this public repository (ADR 0007), and it talks to Discord's REST API only (ADR 0003). A section lives in `src/<term of GLOSSARY.md>/`, routed from `src/app/`, which lists the pages.

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
- an epic of `ready-for-agent` and `skill:implement` sub-tickets, to deliver without Gilles, its `ready-for-human` ones walked through with him in guide sessions → `/deliver-epic <n>`
- every `ready-for-agent` and `skill:implement` ticket of the backlog, to deliver without Gilles, one at a time in board order → `/deliver-backlog`

## Language

Three things are in **French**: chat with the user, GitHub issues and their board (title, body, comments, and the board's descriptions and view names; see `docs/agents/issue-tracker.md`), and the panel's interface, which is French only, with no translation layer. Everything else is in **English**: docs, `GLOSSARY.md`, ADRs, PR text and PR comments, commit messages, and every word written into the codebase: file names, identifiers, logs. URLs count as file names, since each segment is a folder under `src/app/`: `/blocked-words`, not `/mots-interdits`.

## No comments

The repository holds no comments, in any file that supports them, `.env.example` included (the README documents its variables), but for a shebang and a tool directive the code needs, alone in its comment (**Warnings**). The why of a change goes in its commit message, a decision in an ADR, a term in `GLOSSARY.md`, an invariant in a test and its name; copied code loses its comments on the way in. `pnpm check:comments` runs in CI and in a hook before `gh pr create` and `gh pr new`.

## Facts and docs

- **Facts apart from inferences.** Everything you write to docs, tickets or reports keeps verified facts, with their source (`file:line`, commit, URL and date, command output), visibly separate from inferences.
- **Challenge with evidence.** When the code, the docs, `GLOSSARY.md`, an ADR and the user's request disagree, name the contradiction, quote both sides, and ask which one wins. Record the answer through domain-modeling.
- **Agent decisions.** An agent running `deliver-epic` or `deliver-backlog` decides where this file or a skill says to ask Gilles: it applies the most acceptable option and records it under `Décisions de l'agent (à revoir par Gilles)` in the ticket and in the commit message, for Gilles to review; the docs' mark, `(decided by the agent on <date>, on #<n>, for Gilles to review)`, goes in a file of `.claude/rules/`, an ADR or `docs/`, never in this file.
- **Unrecoverable why.** When nothing explains a decision or a fact the work needs, append it to `docs/agents/open-questions.md`, created with its first entry: the question, where it shows up, who is likely to know, what is blocked on it.
- **Docs as you go.** Docs are updated the moment they become true, in the same change. This file holds only what every session needs, in its shortest form: a rule that matters only when touching some files goes to `.claude/rules/<area>.md`, scoped by `paths:`, a decision to an ADR, reference to `docs/` behind a pointer line, and a trial or a ticket trail to the commit message and the ticket. `GLOSSARY.md` is a glossary and nothing else; ADRs follow domain-modeling's bar. When docs contradict the code, fix them in the same change if it takes a few lines, otherwise list them in your report. A passage of this file or of `.claude/rules/` holds its rule, its why in one clause and a short source (`#n`, ADR, URL or commit); its measures and trials go to `docs/` or the commit message, and a moved passage keeps its agent decision mark.
- **Always-loaded context.** `CLAUDE.md` and the rules with no `paths:` load into every session and every sub-agent: keep them together under 20,000 bytes and 200 lines, and each rule scoped by `paths:` under 15,000 bytes. A hook tells you, right after an edit, that the budget is passed and by how much; a set already over it must not grow. Move the surplus where **Docs as you go** says, never just cut it. Delete a rule only when the code or a test already says it.
- **Scope.** Each diff stays inside its ticket. Problems you spot nearby are loose ends: groom-backlog files them as tickets.
- **Gotchas.** When a session hits a trap the environment doesn't reveal, add one line to the rule of the area it concerns, `.claude/rules/<area>.md`, and under **Gotchas** only a trap of the machine or the tooling that no path scopes. Delete lines that stop being true.

## Costs

No third party the panel relies on, in its code, CI or tooling, may ever send a bill or take a hidden fee: the golden rule (#123), whose detail per service is in `docs/costs.md`.

- **No way to pay.** Every account stays on a free plan with no payment method on file: nobody adds a payment method, starts a trial, upgrades a plan, buys a domain, credits or an add-on, or installs an integration or app that bills, not even for a free first month. A paid plan would reopen this rule: Gilles decides it in an ADR first.
- **A new tool** (a service, an account, an integration, an app, or a package, action or registry that reaches a hosted service when it installs or runs) gets its entry in `docs/costs.md` first; one that needs a card or bills past its free quota stays out.
- **Agents** create no account, type no payment method, accept no trial or upgrade and buy nothing: they tell Gilles what a step costs, with its source, and stop at a screen that asks for a card.

## Architecture

- **Folders.** `src/app/` only routes: its pages, layouts and Route Handlers call a domain folder named after a `GLOSSARY.md` term, such as `src/staff/`, which holds its logic, components, `actions.ts` and tests. `src/discord/` adapts Discord's REST API, `src/ui/` holds what the interface shares, `src/monitoring/` the logs and alerts.
- **Entry points only wire.** Pages, layouts, `actions.ts`, Route Handlers, `proxy.ts` and `instrumentation.ts` hold no logic and never read `process.env`: they pass the real clients of `createDiscordApi()` and `createDiscordOAuth()` to a domain function, to which tests pass the fake, with no `vi.mock` (`.claude/rules/discord.md`). Vitest cannot render `async` Server Components, so what a page does lives in functions tested directly. A write is a Server Action ending in `refresh()`; Route Handlers serve OAuth2 only.
- **The staff check.** Every page but the login pages, the privacy policy and the error pages, and every Server Action that writes, starts with `requireStaffMember`, and every domain write takes the `StaffMember` it returns (ADR 0005, `.claude/rules/staff.md`).
- **Validation** uses zod 4, config included: an invalid URL parameter counts as absent, and Discord's responses are typed, not validated.
- **Components** are Server Components. `"use client"` goes only on a leaf that needs browser state or events and holds no logic, on copied shadcn/ui components and on the error pages, never on a page, a layout or anything that reaches `src/discord/` (exceptions: `.claude/rules/ui-overlays.md`, `.claude/rules/staff-theme-toggle.md`).
- **No `use cache`**: the panel reads Discord back on every view (ADR 0002).
- **Imports** that leave their folder use `@/*`, mapped to `src/*`; within a folder they stay relative, but in `src/ui/`.

## Errors

- **Four kinds of failure.** _Refused input_: the staff entered something the panel refuses, or the Discord server is in a state they can fix. _Refused access_: no readable session, or not staff. _Discord unavailable_: a 429 not retried or coming back, a 5xx, a network error or a timeout (`.claude/rules/discord.md`). _Panel error_: everything else, a misconfiguration included; the staff can only report it, and it alerts the maintainer but for the reads a domain exempts (`.claude/rules/monitoring.md`, **Alerts**).
- **Write results.** A domain write checks every limit Discord documents first, so a 400 from Discord is a panel error, re-reads what it changes right before writing and applies only its own change, with no conflict error. It returns `{ ok: true, message }`, or `{ ok: false, message }` with each field the form sent, as typed, for refused input and Discord unavailable; anything else is thrown, a `DiscordError` of `requireStaffMember` included. Reads never write.
- **Read failures.** What a page reads from Discord is thrown, with no catch on the way, and `error.tsx` replaces the page, but for the exemptions a domain's rule lists.
- **Messages** are French sentences the panel writes, never Discord's message, a stack or a token, saying what to do next: correct the input, retry, or report it in « #créer-ticket ».

## Testing

- **Layers.** Domain functions carry most of the tests, in Vitest against the fake Discord, which the contract suite holds to the real one (`.claude/rules/discord.md`); Playwright covers the flows where a wiring mistake shows nowhere else, and only the typecheck and the build check the rest. No coverage tool, no threshold, no snapshot: a test names the text or the attribute it proves, never a class, but for `sr-only`.
- **Assertions read state.** A test proves a write by what it leaves on the Discord server, read back through `DiscordApi`, never by the calls the fake received.
- **No DOM.** Vitest runs in Node without one: a component whose output follows from its props renders with `react-dom/server`, and a client leaf's state and events are proven end to end; revisited with the first client component whose logic goes beyond the toast and the theme write.

## Interface

- **Framework.** React through Next.js, with no library for state, client-side fetching, forms, URL state or animation (Discord holds the state, a form sends one field) and no React Compiler: revisited when a client leaf must share state or fetch data itself, or grows heavy.
- **Styles.** Tailwind CSS 4 and shadcn/ui on Base UI (`.claude/rules/ui.md`), themed through semantic tokens, never a palette color (`.claude/rules/ui-theme.md`); a class name is written whole, never built by concatenation.
- **Wording.** French only, « tu », buttons in the infinitive, with French typography: the apostrophe ’, « » with a no-break space U+00A0 inside, a U+00A0 before : ; ! ?, « … » as one character. `pnpm check:typography` is not yet in place (#73); the lint only refuses ' in JSX text.
- **Dates** are absolute, on 24 hours, in Paris time, through `ParisTime` or `formatParisTime` of `src/ui/`; `timeZone` is always passed, since the server renders dates.
- **Accessibility and small screens.** WCAG 2.2 AA in light and dark (text 4.5:1, a control and its state 3:1), and every page works from 360 px wide, mobile first, with every control a finger can reach at least 44 by 44 px (`.claude/rules/ui.md`, `docs/responsive.md`).

## Monitoring

Logs say only failures, and never carry a secret, a personal datum or what the staff typed (`.claude/rules/monitoring.md`).

## Security

The lines here add to the **Security** stop of the plugin's `deliver-epic/rules.md`, under **Stops**, on which an agent running `deliver-epic` or `deliver-backlog` stops short of the action, and they hold outside a run too: an agent asks Gilles before it touches what they name. Here stay the project's own triggers, each with its source: none yet.

- **The session, OAuth2 and CSRF**: `.claude/rules/staff.md`.
- **The application's permissions.** A new permission or privileged intent for the panel's Discord application, or a change to its role, is a stop for Gilles; it never holds Administrator (`.claude/rules/discord.md`, `docs/discord.md`).
- **Secrets.** A module that reads a secret or calls Discord starts with `import "server-only"`, and each folder alone reads its own variables (`.claude/rules/env.md`).
- **Personal data.** A change that starts or stops processing one updates `docs/personal-data.md` and `/privacy` in the same change.

## Code style

- **Names.** Files and folders are kebab-case and a component lives in the file named after it; values and functions are camelCase, components, types and classes PascalCase, fixed-data constants SCREAMING_SNAKE_CASE; an acronym is a word (`userId`), but for `OAuth`, and a type takes no `I` prefix.
- **Exports** are named and inline, a copied component keeping the registry's `export { … }`; a default export lives only where Next.js or a tool requires one, and an import names its module, with no barrel, which would pull a client leaf into a `server-only` graph (inferred).
- **TypeScript.** `type` for object types, `import type` for type-only imports, `as const` as the one assertion but on the line that mints the `StaffMember` brand (ADR 0005), erasable syntax only (no `enum`, `namespace` or parameter property); the lint does not yet enforce these (#81).

## Warnings

- **Zero.** `pnpm lint` is to run `eslint --max-warnings 0` (#89), CI to fail on a warning of the build or of Node (#87) and a test to fail on a console write (#88); none is in place yet (`.claude/rules/eslint.md`).
- **Directives.** On a line, the one ESLint directive is `eslint-disable-next-line` followed by rule names, with no other text, and `@ts-expect-error` stands alone, in script files only.
- **Reasons.** A warning's cause is fixed first, and silenced only when it is wrong for that code or comes from copied code or a dependency. A directive's why goes in its commit message, and code-review refuses a new directive whose commit gives none; a silence that waits on something, such as a `peerDependencyRules` entry, gets a line in its area's rule saying what lets it go.

## Dependencies

- **Versions.** Every direct dependency names an exact version, and a version under 7 days old is refused, with an exclusion only for a security fix (`.claude/rules/dependencies.md`).
- **Adding a dependency.** Read its `engines`, which must hold `engines.node`, its `peerDependencies` and whether it is deprecated, and see **Costs** for a hosted service.
- **Copying code from another project.** Read its license first (#106): a permissive one adds its notice to `THIRD_PARTY_NOTICES.md`, a copyleft one stays out, an unlicensed one comes in only if the maintainer wrote it alone.

## Feedback loops

- `pnpm test:contract` fails in a worktree for want of `.env.local`, which git ignores (`.claude/rules/discord.md`).
- `pnpm test:e2e` runs against the last `pnpm build`, so build first, after `pnpm exec playwright install chromium` once.
- `pnpm exec shadcn add <component>` copies into `src/ui/`: read `.claude/rules/ui.md`, **shadcn/ui and copied code**, after it.

## Commits, PRs, issues

- Commit messages read `Area: what changed`, in English; Gilles' commits carry his GitHub `noreply` address (`docs/delivery.md`, **The repository**).
- A branch is named `<area>/<subject>`: the commits' area in lower case, such as `docs`, then a few English words in kebab-case, with no issue number. A session renames its branch before its first push, since the desktop app names new sessions' branches after a prefix of its own. Review checks it.
- The user is the sole author: no `Co-Authored-By` trailer in commits, no "Generated with" footer in PRs.
- A change reaches `main` through a pull request whose `Check` job and Vercel status are green on a branch up to date with `main`, merged with a merge commit, never a squash, and never on red CI (`docs/delivery.md`, **The rules of `main`**; who merges: `docs/agents/issue-tracker.md`, **People**).
- Issues, PR descriptions and comments read like a teammate wrote them: direct, specific, complete, no filler.
- A PR that only advances a ticket says `Part of #<n>`: GitHub closes every issue put right after `close`, `fix` or `resolve` in a PR description or commit message, even inside a negation.
- Once a PR merges, delete its local branch with `git branch -d` and run `git fetch --prune`. When `-d` refuses, `git merge-base --is-ancestor <branch> origin/<default branch>` failing means unmerged work: ask the user, or under `deliver-backlog` list it in the run's report (`finish-pbi.mjs` does it under `deliver-epic`).

## Gotchas

A trap of one area sits in its rule under `.claude/rules/`, the hooks' in `claude-hooks.md`; here stay those no path scopes:

- Under Git Bash, write a path inside a script as `C:/Users/…`: Node reads `/c/Users/…` as `C:\c\Users\…`, since MSYS converts only arguments.
- A U+00A0 typed into `Write` or `Edit` can land as an ordinary space, and `Read` shows one as a space too: count them with `grep -c $'\xc2\xa0' <file>`, or write a placeholder and replace it with `sed 's/<placeholder>/\xc2\xa0/g'`.
- Several sessions can share this folder: before switching branches, read `git status` and `git reflog -3`; a change that needs its own branch goes in a `git worktree`.
- The hooks of `.claude/settings.json` need `pnpm install` first: without `node_modules`, `gh pr create` and `gh pr new` are refused and edits go unformatted.
- On Windows, `git worktree remove` fails (`Filename too long`) after `pnpm install` and unlists the worktree, its folder staying: `rm -rf` it in Git Bash, or `Remove-Item -LiteralPath '\\?\…'` in PowerShell, then `git worktree prune` (`git worktree unlock` first if locked).

## Agent skills

### Issue tracker

Issues live as GitHub issues in `ShorRP/Admin_Panel`, on the org project board **Admin Panel**, driven by the `gh` CLI. See `docs/agents/issue-tracker.md` for the commands and for writing an issue in French.

### Triage labels

The five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
