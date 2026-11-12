---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
---

# The dependencies

How the panel's dependencies move to new versions (#56). The monthly session is the skill `update-dependencies` (not yet, #97): the rules are here, its procedure will be there. The sources, dates and trials behind each line are in `docs/dependencies.md`: read it before changing a rule below. A target that an open ticket builds carries its ticket, as « (not yet in `ci.yml`, #93) » does, and goes once the ticket lands.

## What it covers

- npm packages, direct and transitive; the actions of `ci.yml`; pnpm itself, through `packageManager`; the Node major the panel runs on; the code copied from shadcn/ui; adding a dependency; and copying code from another project. `groom-backlog`, `deliver-epic` and `deliver-backlog` come from the agent-workflow plugin, whose settings for this repository are `workflow.json`, and Claude Code's plugins live outside the repository.

## Who and when

- No bot: Dependabot and Renovate re-read none of the citations that name a version (**Docs that name a version**), so each of their PRs would need a session anyway (#56).
- Once a month, in its first week, Gilles starts a session of `/update-dependencies` (not yet, #97), which runs the updates and the monthly check of `CLAUDE.md`, **Costs**. He starts one out of cycle when the daily audit fails (**Advisories**) or a ticket needs a newer version. Its commits are his.

## Exact versions

- Every direct dependency names an exact version, TypeScript included, and `savePrefix: ""` in `pnpm-workspace.yaml` makes `pnpm add` write one, since pnpm's default is `^`: CI installs the lockfile as it is, so with exact versions `package.json` says what runs and every update shows in its diff (#92).
- `engines.node` keeps its range, `^24.0.0`, since it names the Node major rather than a dependency (**Node**), though #92 asks that `package.json` hold no `^` (decided by the agent on 2026-11-02, on #92, for Gilles to review, since #92's decisions name the direct dependencies alone).

## Release age

- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`, 7 days, which makes pnpm strict once written down: on a younger version, `pnpm add` asks at a terminal and writes the exclusion only if told yes (not tried at a terminal), and without one, as under Claude's Bash tool, fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` and leaves `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` as they were.
- It also checks every entry of the lockfile, `pnpm install --frozen-lockfile` included, and refuses one under 7 days old (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`), so CI's install should fail on a lockfile that a young version slipped into (inferred from a throwaway copy). The help of that error says to relax the policy, which this rule allows only through an exclusion.
- An exclusion goes in only for a security fix that touches the panel and that an advisory attests, written by hand or approved at that prompt, on the exact version, with a line of this rule saying it goes once that version is 7 days old. Any other prompt is answered no.
- The repository's age does not reach `self-update` (inferred from pnpm's source), so the session reads a pnpm version's date, `npm view pnpm time`, before taking it.
- A local `pnpm install` proves a lockfile afresh only under an empty `--config.cache-dir`, since pnpm remembers each lockfile it verified (inferred).

## Majors

- A major, or a minor of a 0.x package, such as `cn`, `class-variance-authority` and `prettier-plugin-tailwindcss` today, comes in once what depends on it declares it, and at the latest when the current major reaches its end of life. One that must come in earlier gets a `peerDependencyRules` entry and its line here, as ESLint 10 did.
- Each major has a PR of its own: its release notes and migration guide are read and its codemod run, if it has one, the PR says what they changed, and every page is opened under `pnpm dev`.

## Checks

- Every update passes CI on its PR.
- An update of Prettier or of one of its plugins also passes `pnpm exec shadcn add <component> --diff` on every copied component, and its reformatting is a commit of its own, `Tooling: reformat with Prettier <version>` (`.claude/rules/prettier.md`, **Enforcement**).
- An update of Node also passes `pnpm test:contract`, since the `fetch` of the real implementations is Node's (`.claude/rules/discord.md`, **The real implementations**), and its pull request's Vercel build log still shows « Detected ENABLE_EXPERIMENTAL_COREPACK=1 » and the pnpm `packageManager` names (`docs/delivery.md`, **Environments**).

## Docs that name a version

- `CLAUDE.md`, `.claude/rules/` and `docs/`, the ADRs included, cite `node_modules/<package>/…:line`, and `grep -rnoE 'node_modules/[^ ]+:[0-9]+' CLAUDE.md .claude/rules docs` lists them. The commit that moves a package re-reads that package's citations in all of them, patches included, since a patch moves lines too: a citation whose text moved gets its new `path:line`, a claim whose behaviour changed is rewritten or deleted, and a line of `.claude/rules/` tied to a version is tried again.
- A sentence that reports a dated trial stays while its conclusion holds, and one that describes the present follows the update.
- A script of `scripts/` lists a package's citations (not yet, #97).

## Holds

A version held back is one line below: the package, the range it stays in, why, and what lets it go, and nothing else configures it. The session reads these lines first and tries each hold again, and each `peerDependencyRules` entry, whose condition it can check through `npm view <package> peerDependencies` or `engines`. That `@types/node` follows the Node major (**Node**) is a standing rule, not a hold.

- `@babel/parser`, which the comment check uses, stays on 7.x: 8.x requires Node `^22.18.0 || >=24.11.0`, which leaves out 24.0.0 to 24.10.x, within the `^24.0.0` that `engines` promises, and CI would not catch the gap, since it runs the latest 24.x (`.claude/rules/ci.md`, **CI**). The hold goes once 8.x accepts the whole of 24, or `engines.node` starts at 24.11.0.
- TypeScript stays on `6.0.3`, under 6.1: typescript-eslint, which `eslint-config-next/typescript` uses, accepts no higher, and `typescript@7`, the native compiler, exports no stable JavaScript API for tooling that parses code, which is why the comment check parses with Babel. Next.js alone would accept 7.
- ESLint is on 10, since 9.x is past its end of life. Three plugins that `eslint-config-next` bundles, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and `eslint-plugin-react`, still cap their `eslint` peer at `^9`: hence the `peerDependencyRules` of `pnpm-workspace.yaml`. Drop each rule once its plugin lists 10.
- `auditConfig.ignoreGhsas` holds GHSA-mrhx-c7xc-m3w5, against zod `<4.6.6`, which every `@vercel/cli-config` pins through `@vercel/functions` > `@vercel/oidc`. The panel cannot reach it: it imports only `waitUntil`, from `@vercel/functions`' `index.js`, which requires none of the `oidc/` files that alone load `@vercel/oidc`. The entry goes once `@vercel/cli-config` takes zod `>=4.6.6`, and must go if the panel ever imports `@vercel/functions/oidc`.
- Vercel installs with pnpm 12 only through Corepack (`docs/delivery.md`, **Environments**), which Node distributes below 25, so that on Node 26 Vercel's `ENABLE_EXPERIMENTAL_COREPACK` may find none (inferred). `engines.node` keeps Vercel on 24, so the move to 26 is a pull request, whose Vercel build log **Checks** reads. The line goes once Vercel picks pnpm 12 from the lockfile itself, or once Node 26 is shown to install with it.

## Node

- The panel runs on one Node major, the same on Vercel, in CI's main job and in `@types/node`: 24 (#96). On Vercel `engines.node` wins over the project's setting, so it names that major, `^24.0.0`, within the ranges the toolchain declares, and no open range: the `^22.13.0 || ^24.0.0 || >=26.0.0` that it replaced would deploy 26 without a PR the day Vercel offered it (inferred).
- Each range the toolchain declares must hold `^24.0.0` whole.
- `@types/node` names an exact 24.x (**Exact versions**).
- A new major comes in one PR that moves `engines.node` and `@types/node` together, which moves Vercel and CI with them, once Vercel offers the next LTS, and at the latest when the current one reaches its end of life. CI tests only the latest version of that major, which `actions/setup-node` reads from `engines.node` (`.claude/rules/ci.md`, **CI**).

## pnpm itself

- It follows a devDependency's rules, through the exact version of `packageManager`.

## Actions

- Actions name their full version tag, such as `pnpm/action-setup@v6.1.0` (not yet in `ci.yml`, which names `@v7` and `@v6`, #95): it reads without a comment (`CLAUDE.md`, **No comments**), and an update shows in the diff, where a major tag can lag. `pnpm outdated --include-github-actions` lists them with the packages.
- A workflow whose job holds a secret is to pin its actions by SHA instead, as `contract.yml` will (not yet in `.github/`, #102; `.claude/rules/ci.md`, **The contract suite in CI**).

## Advisories

- GitHub's dependency graph reads no lockfile of two YAML documents, which pnpm 12 writes, so it raises no Dependabot alert: #94 turns the graph and the alerts on all the same, for the day it does, but not Dependabot's security updates.
- CI is to run `pnpm audit` and `pnpm audit signatures` after the install, on every PR and every push to `main`, and once a day on `main`, which notifies the user who created the workflow (not yet in `ci.yml`, #93). `pnpm audit` covers every dependency, devDependencies included, and fails on any advisory at its default level, `low`.
- An advisory is fixed by an update. It is ignored, through `--ignore <GHSA>`, which writes it under `auditConfig.ignoreGhsas`, only when the panel cannot reach the vulnerable code, with its line in **Holds**, and the `overrides` that `pnpm audit --fix` writes are a last resort, with theirs (`CLAUDE.md`, **Warnings**, **Reasons**).
- An advisory published while a PR is open should turn it red with no change of code, as a warning that follows the date does (`.claude/rules/ci.md`, **CI's output**; inferred).

## One copy

- CI is to run `pnpm dedupe --check` after the install, which fails when two copies of a package could be one (not yet in `ci.yml`, #93).
- `typescript-eslint`, which #89 makes a direct devDependency, since it does not resolve from the root (not yet, #89), moves in the same commit as `eslint-config-next`, at the version that `eslint-config-next` uses.

## Transitive dependencies

- They are refreshed at each session by `pnpm update`, in a commit of its own. With exact direct versions, it should move only the transitive ones, within their ranges, since its `--depth` defaults to unlimited (inferred, not yet tried, #97). The release age guards it.

## Deprecated packages

- pnpm prints a deprecation only at `pnpm add` and `pnpm update` (`.claude/rules/ci.md`, **CI's output**), and records it as a `deprecated:` field of `pnpm-lock.yaml`. The session reads both: a deprecated direct dependency becomes a ticket to replace it, and a transitive one waits for its parent to move, unless `pnpm audit` flags it or it raises a warning in CI.

## The registry

- Each session runs `pnpm exec shadcn add <component> --diff` on every copied component. What the registry changed comes in like a minor update, and the panel's own lines stay (**Copied code** of `CLAUDE.md`, **Interface** and **Code style**).

## Adding a dependency

- What to read before `pnpm add` is in `CLAUDE.md`, **Dependencies**. After it, the version is exact, its build script stays refused in `allowBuilds` unless it cannot work without one, which its commit then explains, `pnpm-workspace.yaml` is read again, and `pnpm audit` and `pnpm dedupe --check` pass, by hand until CI runs them.

## Copying code from another project

- Before code comes into the repository from another project, by hand or through a tool such as shadcn/ui's CLI, its license is read (#106). The licenses of npm dependencies, which `pnpm add` installs without copying them into the repository, stay out of this rule.
- Code under a permissive license, such as shadcn/ui's MIT, adds the notice that its license asks every copy to carry to `THIRD_PARTY_NOTICES.md` in the same commit, in a section of its own that says which files it covers (decided by the agent on 2026-11-02, on #106, for Gilles to review, since #106 says only that the notice goes there).
- A notice the file already holds covers its project's later copies, as shadcn/ui's covers every component the CLI copies into `src/ui/` (#101).
- Apache-2.0, permissive too, asks that every modified file carry a prominent notice of the change, which only a comment in each file could do, against `CLAUDE.md`, **No comments** (inferred), so its terms are read again the day such code comes in.
- Code under a copyleft license, such as AGPL-3.0, is not copied: the panel would become a derivative work to be published under that license, against the absence of a license that ADR 0007 keeps (inferred from the license, not a lawyer's reading).
- Code from a project with no license, which default copyright reserves to its authors (README, **License**), comes in only when the panel's maintainer wrote it alone (decided by the agent on 2026-11-02, on #106, for Gilles to review, since #106 names the permissive and copyleft cases alone).
- EsportCards, Gilles' private repository, is such a project and has a second contributor, so that only what Gilles wrote alone may come in (inferred from the commits' authors; `docs/dependencies.md`).

## The session's PR

- One per session for all but the majors, on `dependencies/<yyyy-mm>`. It holds a commit per package, or per set that must move together, such as Next.js and `eslint-config-next`, or React and its types, with the docs that package changes: `Dependencies: update next and eslint-config-next to 16.4.3`. The refresh of transitive dependencies follows, as `Dependencies: refresh the lockfile`.
- For each package, the PR gives the versions it moves between, what was read, what changes for the panel, and the citations re-read.
