---
paths:
  - ".github/**"
---

# CI and delivery

How code goes from a branch to production and what CI checks (#57, ADR 0007). What is set on GitHub's and Vercel's side, which no file shows, with the vendor pages and the trials behind each line, is in `docs/delivery.md`: read it before an action that needs a ruleset, an environment, a Vercel setting, a deployment or a rollback. A target that an open ticket builds carries its ticket, as « (#93, not yet in `ci.yml`) » does, and goes once the ticket lands.

## CI

- `ci.yml` has three jobs, run on every pull request and every push to `main`: `Static checks`, which holds the comment and budget checks, the format check, the typecheck, the lint and the unit tests; `End to end (<i>/6)`, six shards that each build the panel and run a sixth of the end-to-end tests; and `Check`, which waits for the two and fails unless each succeeded (#489). A daily run of the audit on `main` joins them (#93, not yet in `ci.yml`).
- `Check`'s name is a status that `main`'s ruleset requires beside Vercel's, so renaming it leaves every pull request unmergeable until Gilles changes the ruleset (inferred; `docs/delivery.md`, **The rules of `main`**) (decided by the agent on 2026-11-12, on #447, for Gilles to review). The other jobs' names are free, and a shard is not required.
- `Check` takes `if: always()`, lists every other job in `needs` and reads each one's result: a required status reads a skipped job as a success (inferred, #489), so `Check` runs even on a cancelled run and fails unless each job ended `success`. A job that failed, was skipped, timed out or was cancelled with its run each left it red (`docs/delivery.md`, **CI**). A job added to `ci.yml` joins `needs` and `Check`'s step, which `test/ci-workflow.test.mjs` holds.
- The jobs run on `ubuntu-26.04`, not `ubuntu-latest`, so that a change of Ubuntu shows in a diff, as an action's update does (#95), and on 26.04 rather than #95's 24.04, which CI had already left (decided by the agent on 2026-11-15, on #95, for Gilles to review; `docs/delivery.md`, **CI**). The monthly session (`.claude/rules/dependencies.md`, **Who and when**) moves it to the next Ubuntu in a pull request, once GitHub offers it and Playwright supports it.
- It reads Node from `engines.node`, through `actions/setup-node`'s `node-version-file: package.json` with `check-latest: true`, and names no Node version of its own: it runs the latest of the panel's one major, as Vercel does (#96). It tests neither the floor of `engines.node`, which no deployment runs, nor the next major, which would either block merges or be ignored.
- Standard GitHub-hosted runners only, since a larger runner bills (`docs/costs.md`, **GitHub**) (decided by the agent on 2026-11-12, on #447, for Gilles to review).
- The end-to-end tests run on 6 shards (`--shard=<i>/6`) of 2 workers (`--workers=2`), both on the command line, so that `playwright.config.ts` holds no count of CI's. 6 shards took 157 to 209 s for the slowest job and a run's `Check` about 3 min 38 s, where 4 shards took 231 to 262 s, and 4 workers on the runner's 4 vCPUs failed `e2e/audit-log.test.ts:1032` on its 30 s timeout in 2 attempts of 2 (decided by the agent on 2026-11-16, on #489, for Gilles to review; the runs are in `docs/delivery.md`, **CI**). Playwright cuts the tests into shards of equal number in file order, so the slowest shard sets the job: a count changes with a measure, not a guess.
- GitHub Free runs 20 jobs at once, and a pull request holds 7 of them, `Static checks` and the 6 shards, while `Check` waits (`docs/delivery.md`, **CI**): a run beyond the limit queues, and no more shard is worth a longer queue (inferred).
- Each job sets its own `timeout-minutes`: 10 for `Static checks` and for a shard, which took 90 to 115 s and 157 to 209 s, and 5 for `Check`, which takes 3 s (decided by the agent on 2026-11-16, on #489, for Gilles to review). A cancelled shard whose last line is `The operation was canceled.`, after `Running N tests using 2 workers, shard i of 6`, is this limit and no hung test, and a shard near it calls for more shards, not a longer limit (inferred).
- The end-to-end step installs Chromium with `playwright install chromium`, in a step that gives up after 2 minutes, and installs no system package: `--with-deps` runs `apt-get`, which stalled on an Ubuntu mirror until the job's timeout, and the libraries Chromium needs were already on the runner (Gilles, 2026-10-27, in place of the `--with-deps` of #63 and #57; #116). A runner that lacks a library would fail end to end at Chromium's launch, so the pull request that moves the runner to a new Ubuntu shows it (inferred). The runs are in `docs/delivery.md`, **CI**; what the tests do there, in `.claude/rules/e2e.md` (decided by the agent on 2026-11-12, on #449, for Gilles to review, since the step's code is `ci.yml`, and the end-to-end rule only points here).

## Caches

- `actions/setup-node`'s `cache: pnpm` keeps the pnpm store. `actions/cache` keeps `.next/cache` (#103), in each shard, since `Static checks` builds nothing: its key is `runner.os`, `pnpm-lock.yaml` and the sources, and its `restore-keys`, the same without the sources, restores the newest entry of the same lockfile when only the sources changed. On a key with no entry, one shard saves it and the five others log « Failed to save: Unable to reserve cache », a plain line that fails nothing and leaves no annotation (`docs/delivery.md`, **CI**).
- Its sources are `src/**` and the root files that configure the build, which `ci.yml` lists, not the `**/*.ts` of Next.js's guide, which would reach into `node_modules` (inferred) (decided by the agent on 2026-11-15, on #103, for Gilles to review). A root file that starts to configure the build joins that list; one left out costs a staler cache, not a wrong build (inferred).
- `next build` still warns "No build cache found" on a run that restores no entry: the first of a lockfile that neither its pull request nor `main` has saved, or one after GitHub evicted the entry, unused for 7 days (`docs/delivery.md`, **Caches**). A red or cancelled run saves none (inferred).
- Playwright's browsers are downloaded on every run and never cached, as Playwright advises.
- The sources, the limits of GitHub's cache and why no cache spares `pnpm audit` its registry call: `docs/delivery.md`, **Caches**.

## CI's output

- CI fails on a warning of `pnpm build`, `pnpm lint` or `pnpm typecheck` that a list of exceptions does not hold: any `⚠` line of the build, Next.js's warning prefix, and any `(node:<pid>) …Warning:` line of the three, Node's process warning. A script of `scripts/` reads the output (#87, not yet in `scripts/`). The commands themselves stay as they are, so that Vercel never fails a deployment over a warning.
- The list starts empty. Each exception added gets a line in the rule of its area that says what lets it go (`CLAUDE.md`, **Reasons**).
- A dependency's own `console.warn` follows no format and stays advisory. A Next.js that changed its glyph would pass the check unseen (inferred).
- A warning that follows the date rather than the code can turn an unrelated pull request red: fix it like any other, by an update or an exception, since no PR merges red.
- `pnpm install --frozen-lockfile` skips resolution when the lockfile is up to date, and so prints no peer or deprecation warning: those come at `pnpm add` and `pnpm update`. `pnpm peers check` runs right after the install (#87, not yet in `ci.yml`) and reads the lockfile without resolving (inferred). A deprecated package is handled by `.claude/rules/dependencies.md`, **Deprecated packages**.
- What the runner and the actions print themselves fails nothing: `actions/checkout`'s `hint:` about the default branch name, the one such line left since #95. The runs behind it are in `docs/delivery.md`, **CI's output**.

## Scheduled workflows

GitHub turns off a scheduled workflow of a public repository, as this one has been since 2026-10-27 (#100), after 60 days without activity in it, so that the daily audit (#93) and the weekly contract run (#102) would stop with no failed run to say so (inferred). The monthly session's pull request keeps the repository active (inferred). `gh workflow enable <workflow>` turns one back on (`gh workflow enable --help`, gh 2.101.0). The line goes if the repository goes private again. The source: `docs/delivery.md`, **Scheduled workflows**.

## The contract suite in CI

`contract.yml` and the GitHub environment `discord-contract` are the target of #102, not yet in `.github/` or on GitHub.

- `contract.yml` runs `pnpm test:contract` on a pull request that touches `src/discord/**` or `contract.yml` itself, once a week on `main`, and on demand through `workflow_dispatch`, and skips a pull request from a fork, whose run gets no secret.
- Its job reads `discord-contract`: `DISCORD_BOT_TOKEN` as a secret, and `DISCORD_GUILD_ID`, `CONTRACT_MEMBER_ID` and `CONTRACT_ABSENT_USER_ID` as variables (#179, #181). The environment has no reviewer, who would have Gilles approve each run of his own pull requests, and allows every branch, since pull requests run it.
- It pins its actions by SHA (`.claude/rules/dependencies.md`, **Actions**), restores no cache, since a cache written by `ci.yml`, whose actions follow tags, could carry code into the job that holds the token (inferred), and keeps two runs from overlapping on the test Discord server through one concurrency group.
- The suite takes minutes against Discord, so the job sets its own `timeout-minutes` (inferred). Running it by hand: `.claude/rules/discord.md`, **The contract suite**.
- What GitHub offers and notifies, and what the suite's run time was: `docs/delivery.md`, **The contract suite in CI**.

## CI secrets

`ci.yml` holds none. "Shor Panel Dev"'s token is CI's one secret, in `discord-contract`, which only `contract.yml` reads. The application's permissions on the test Discord server: `docs/discord.md`, **The application's permissions**.

## Outside the repository

The facts behind each step below are in `docs/delivery.md`: **The rules of `main`**, **Environments**, **Previews**, **Production**, **Rollback** and **The Firewall**.

The steps a change to the repository can need on GitHub's or Vercel's side are steps for Gilles, which no file shows: an agent says what to set and stops short, as `deliver-epic/rules.md` of the agent-workflow plugin asks under **Stops**, for a secret, CI's environments and a third party's dashboard (decided by the agent on 2026-11-12, on #447, for Gilles to review). A plan, a card, a trial or a domain stays under `CLAUDE.md`, **Costs**.

- Typing `DISCORD_BOT_TOKEN`, creating or changing `discord-contract` with its variables and protection.
- Changing the ruleset of `main`, or the repository's merge, fork and security settings.
- Changing Vercel's project settings, environment variables (`.claude/rules/env.md`) or Firewall rule, promoting a deployment or rolling one back.
- Registering a preview's branch URL in "Shor Panel Dev" and setting `DISCORD_REDIRECT_URI` for that branch, the manual try of a pull request that touches the login, the session or the headers: such a pull request names it.
