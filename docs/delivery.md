# Delivery

The reference behind `.claude/rules/ci.md`: what is set on GitHub's and Vercel's side, which no file of the repository shows, what each vendor page says, and the trials that showed how CI and a deployment behave. The rule says what to do; this file says how it was known. Gilles decided the design while grilling #57 on 2026-10-25, and the options set aside, and why, are in #57's decisions and in ADR 0007. #101 and #100 opened the repository, #96 and #95 set CI's Node and runner, #103 the build cache, #102 `contract.yml`, #9 the Vercel project and #13 the first production deploy. What each service can cost is in `docs/costs.md`, and the rule that none may bill in `CLAUDE.md`, **Costs**.

The `node_modules` citations are those of Next.js 16.4.2 unless a package is named: an update of a package re-reads the citations that name it (**Docs that name a version** of `CLAUDE.md`). A value read from GitHub with `gh api` carries its date: a setting can change without a commit.

## The repository

- It has been public since 2026-10-27, because Vercel's Hobby plan deploys no private repository of a GitHub organization (https://vercel.com/docs/git, updated 2026-09-18). ADR 0007 lists what going private again would break.
- #100 published it once a secret scan of the whole history, pull requests' refs included, found nothing; once the passages Gilles chose to withhold from the issues were rewritten and their earlier versions deleted, since "anyone with read access to a repository can view a comment's edit history" (https://docs.github.com/en/communities/moderating-comments-and-conversations/tracking-changes-in-a-comment, read 2026-10-27); and once the POs and loanspac, owners of the organization like Gilles (`gh api orgs/ShorRP/members?role=admin`, 2026-10-25), agreed.
- It carries no license, so its code can be read but not reused (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, read 2026-10-25): `THIRD_PARTY_NOTICES.md` carries shadcn/ui's MIT notice for the code copied into `src/ui/` (https://github.com/shadcn-ui/ui/blob/main/LICENSE.md, read 2026-10-25), and `SECURITY.md` asks for vulnerabilities through GitHub's private reporting rather than in issues (#101). `gh api repos/ShorRP/Admin_Panel` still answers `license: null` on 2026-11-12.
- A public repository gets secret scanning, push protection and private vulnerability reporting with no license (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility, read 2026-10-25), but GitHub left the first two off at the switch, and #100 turned all three on (`security_and_analysis` of `gh api repos/ShorRP/Admin_Panel`, read right after it, 2026-10-27). On 2026-11-12 the same field reads secret scanning and push protection `enabled` and Dependabot security updates `disabled`; it does not show private vulnerability reporting, which was not read again.
- Gilles' commits carry his GitHub `noreply` address, set in this repository's `.git/config`, and his account keeps his other address private and refuses a push that would expose it (Gilles, 2026-10-27). The earlier commits keep theirs, since rewriting them would change every SHA the docs and the issues cite.

## Outside contributions

- Issues and pull requests from outside follow `docs/agents/issue-tracker.md`, **Outside contributions**.
- A fork's workflow runs wait for a maintainer's approval, at GitHub's strictest setting, `all_external_contributors`, which #100 set in place of the default `first_time_contributors` (`gh api repos/ShorRP/Admin_Panel/actions/permissions/fork-pr-contributor-approval`, 2026-10-27, and again 2026-11-12), and get no secret (https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions, read 2026-10-25).
- Vercel deploys a fork's pull request only once it is authorized (https://vercel.com/docs/git, updated 2026-09-18).

## The rules of `main`

- `gh api repos/ShorRP/Admin_Panel/rulesets/25946856`, read on 2026-11-12: a ruleset named `main`, `enforcement` `active`, on the default branch, with no bypass actor (`current_user_can_bypass` `never`), holding four rules: `deletion`, `non_fast_forward`, `pull_request` with no approving review required and `allowed_merge_methods` `["merge"]`, and `required_status_checks` with a strict policy, the up-to-date branch, and the two contexts `Check`, from GitHub Actions, and `Vercel`.
- The repository allows merge commits only, deletes a branch once its pull request merges, and allows no auto-merge (`allow_merge_commit` true, `allow_squash_merge` and `allow_rebase_merge` false, `delete_branch_on_merge` true, `allow_auto_merge` false, the same read). #100 set the ruleset and the merge settings on 2026-10-27, and #9 added the `Vercel` status the same day (`gh api repos/ShorRP/Admin_Panel/rulesets/25946856`, `updated_at` 2026-10-27).
- Why each rule: a pull request with no approval, since Gilles works alone; `Check` green on a branch up to date with `main`, so that the merge commit has the tree CI tested; Vercel's status, which proves the build with Preview's variables, on Vercel's Node and the pnpm `packageManager` names (**Previews**).
- The organization's other owners could lift the ruleset (inferred), so that only Gilles, or an agent running `deliver-epic` or `deliver-backlog`, merges stays a convention (`CLAUDE.md`, **Commits, PRs, issues**).
- GitHub's page on rulesets names only GitHub Team and Enterprise (https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets, read 2026-10-25), yet the organization's `free` plan (`gh api orgs/ShorRP`) took this one once the repository was public. While it was private, GitHub refused it with an HTTP 403, "Upgrade to GitHub Pro or make this repository public" (checked 2026-10-23), and `gh api repos/ShorRP/Admin_Panel/rulesets` listed it on 2026-10-27.

## CI

- `.github/workflows/ci.yml`, read on 2026-11-12: one job, `Check`, with `timeout-minutes: 15`, `permissions: contents: read` and a concurrency group per pull request that cancels the run it replaces, run on every pull request and every push to `main`; it runs on `ubuntu-latest` and names its actions by major tag, which #95 changes. The file is the source for its steps.
- A public repository's standard runners cost nothing (https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions, read 2026-10-25), and what a larger runner costs is in `docs/costs.md`, **GitHub**.
- `actions/setup-node` reads Node from `engines.node` through `node-version-file`, with `check-latest` (its README and `docs/advanced-usage.md`, read 2026-10-25). That version comes from the manifest of `actions/node-versions` first, which can lag Node's own releases: on 2026-10-29, CI ran 24.22.1 (run 40898070133), while https://nodejs.org/dist/index.json listed 24.22.2, of 2026-10-27.
- The end-to-end step grows with every page, and the job gave up at its former 10 minutes on #394's pull request: run 42182828730, of 315 tests, was cancelled in `pnpm test:e2e` once the step had run 8 min 21 s, all that the other steps left of the 10 minutes, where the runs of 285 tests took 8 min 10 s (`main`, run 42132912057, 2026-11-06) and 7 min 58 s (run 42131672687), the other steps taking about 1 min 40 s (`gh run view <run> --json jobs`, 2026-11-06). At about 1.7 s a test on the runner's 2 workers, 315 tests need about 9 min, which the job's remaining 8 min 20 s could not hold, hence the 15 minutes of `.claude/rules/ci.md`, **CI**.
- On 2026-10-27, the `apt-get` of `playwright install --with-deps` stalled on an Ubuntu mirror: it waited 9 min 35 s before the job's then 10-minute timeout cancelled it (run 40483910314), and 8 min 36 s on another run (run 40486946538), where the tests then took 13 s. The libraries Chromium needs were already on the runner, 8 of them in older versions, and only 9 font packages were missing (the install log of run 40483910314). Chromium runs without them: #116's first run passed end to end, with an install of 9 s (run 40488867775, 2026-10-27), which is why the step runs `playwright install chromium` alone (`.claude/rules/ci.md`, **CI**).

## Caches

- The key of the `.next/cache` step follows Next.js's guide (`node_modules/next/dist/docs/01-app/02-guides/ci-build-caching.md:73-89`), whose example is written for npm. Without that cache, `next build` prints "No build cache found" behind the `⚠` of Next.js's warnings, when it detects CI and finds no `.next/cache` (`node_modules/next/dist/build/index.js:230`).
- Playwright advises against caching its browsers in CI (https://playwright.dev/docs/ci, read 2026-10-25).
- No cache spares `pnpm audit` or `pnpm audit signatures` their call to the registry (inferred from https://pnpm.io/cli/audit, read 2026-10-25).
- GitHub evicts a cache unused for 7 days, and a repository holds 10 GB of them (https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching, read 2026-10-25).

## The contract suite in CI

- `contract.yml` does not exist yet: `gh api repos/ShorRP/Admin_Panel/actions/workflows` lists `CI` alone on 2026-11-12, and #102 is open. #102's body holds the workflow's acceptance criteria.
- `gh api repos/ShorRP/Admin_Panel/environments` lists `Preview` and `Production` on 2026-11-12, with no protection rule and no branch policy, and no `discord-contract`. The two are inferred to be the deployment environments of Vercel's GitHub App.
- GitHub Free offers environments to public repositories only (https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment, read 2026-10-25), which is why #102 waited for #100, and the repository has been public since 2026-10-27 (ADR 0007).
- The variables of the environment take the values of `.env.local`, and Gilles sets the secret through a masked prompt (#102).
- A scheduled run that fails notifies Gilles: "Notifications for scheduled workflows are sent to the user who initially created the workflow" (https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs, read 2026-10-25), and he creates the workflow (inferred).
- Against Discord, the first run of `pnpm test:contract`, with 9 tests, took 62.7 s on 2026-10-25, 48.3 s of it for the six keyword rules, which wait out 429s (#102's comment of 2026-10-25); the search tests of #383 bring it to 2 to 3 minutes (`docs/discord.md`, **The contract suite**).
- On Gilles' test Discord server, "Shor Panel Dev" held only Manage Server and View Audit Log (#10, comment of 2026-10-23); its permissions since are in `docs/discord.md`, **The application's permissions**.

## The Firewall

- One rule of the Vercel Firewall, the only one Hobby allows per project (https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting, updated 2026-08-28), set in the dashboard by #9: every path, keyed on the IP, 600 requests over a fixed window of 10 minutes, then deny.
- A Hobby project past an included limit waits 30 days (https://vercel.com/docs/plans/hobby, updated 2026-09-14), and a function invocation counts "regardless of request success or failure" (https://vercel.com/docs/functions/usage-and-pricing, updated 2026-06-16), so a script from one IP could take the panel down. Traffic the Firewall denies counts toward no usage (https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing, updated 2026-06-16).
- Attack Mode, free on every plan, answers a flood from many IPs (https://vercel.com/docs/vercel-firewall/attack-mode, updated 2026-08-11).
- The panel's code limits nothing: a write needs a session whose member holds the staff role, and Discord's 429 is handled (`.claude/rules/discord.md`, **Errors and retries**).

## Environments

- Gilles' password manager holds every value. `.env.local`, which he types through a masked prompt, holds those of "Shor Panel Dev" and of his test Discord server (#7), for `pnpm dev` and `pnpm test:contract`. CI holds none but `discord-contract`'s, and end to end runs on the placeholders of Playwright's `webServer` (`playwright.config.ts`).
- On Vercel, Preview gets "Shor Panel Dev" and the test Discord server, Production "Shor Panel" and Shor's Discord server (#9, comment of 2026-10-23), each with a `SESSION_SECRET` of its own, and Production alone `ALERT_WEBHOOK_URL` (`.claude/rules/monitoring.md`).
- Production and Preview also hold `ENABLE_EXPERIMENTAL_COREPACK=1` (Gilles, 2026-10-27, on #9), so that Vercel installs with the `pnpm@12.9.1` of `packageManager` rather than the pnpm 9 or 10 it infers from `lockfileVersion: 9.0` (https://vercel.com/docs/package-managers, updated 2026-08-11): the preview build of dfd4ddd logged "Detected ENABLE_EXPERIMENTAL_COREPACK=1 and "pnpm@12.9.1" in package.json", then "Done in 67ms using pnpm v12.9.1" (2026-10-27).
- Vercel's Development environment stays empty, since nothing runs `vercel dev` or `vercel env pull`.

## Previews

- Vercel deploys every pushed branch as a preview, under Standard Protection, which on Hobby lets in Gilles, one external user and one shareable link per account (https://vercel.com/docs/deployment-protection/usage-and-pricing, updated 2026-09-15). The first, of 600cbce on 2026-10-27, succeeded (`gh api repos/ShorRP/Admin_Panel/deployments/7359753181/statuses`), and its URL answered a visitor without a Vercel session with a `302` to Vercel's login (`curl`, 2026-10-27).
- A preview has no login by default, since Discord documents neither a wildcard redirect URI nor an endpoint that edits them (https://docs.discord.com/developers/resources/application, read 2026-10-25).
- A pull request that touches the login, the session or the headers gets one on demand. Gilles registers its branch URL, `<project>-git-<branch>-<scope>.vercel.app` (https://vercel.com/docs/deployments/generated-urls, updated 2026-09-08), in "Shor Panel Dev", and sets `DISCORD_REDIRECT_URI` for that branch alone, as Preview variables allow (https://vercel.com/docs/environment-variables, updated 2026-09-17). He tries by hand what differs only for real, cookies over `https` and the headers Vercel serves, and removes both once the pull request merges.
- Every pull request also waits for Vercel's commit status (https://vercel.com/docs/git/vercel-for-github, updated 2026-09-17), which proves the build with Preview's variables, on Vercel's Node and the pnpm `packageManager` names.
- #9 turned Vercel's bot comments off, and kept its statuses and the deployment events that put the preview's link on the pull request. The Vercel Toolbar, on by default on previews, is off there (https://vercel.com/docs/vercel-toolbar/managing-toolbar, updated 2026-08-11).
- Whether Vercel's request logs keep a login's `code` and `state` was left to the first login on a preview: #9 closed without one (`.claude/rules/nextjs.md`).

## Production

- Every merge into `main` deploys to production, Vercel's default (https://vercel.com/docs/git, updated 2026-09-18). With the up-to-date branch the ruleset requires, Deployment Checks would prove nothing more, and their page does not say Hobby has them (https://vercel.com/docs/deployment-checks, updated 2026-08-11).
- A merge that only changes docs deploys too, since a build the Ignored Build Step cancels still counts toward the deployment quotas (https://vercel.com/docs/project-configuration/project-settings, updated 2026-09-21).
- There is no version number and no tag: a deployment goes by its short commit, which an alert carries (`.claude/rules/monitoring.md`, **What an alert says**), so a fix ships with the merge into `main` that carries it.

## Rollback

- A bad production deployment is first undone with Instant Rollback, which on Hobby reaches only the deployment right before it, and which turns off the automatic assignment of production domains (https://vercel.com/docs/instant-rollback, updated 2026-07-07).
- A revert then goes through a pull request like any change, and promoting its deployment, from the dashboard or with `vercel promote`, turns that assignment back on.
- When the deployment before is bad too, the revert alone fixes it.

## Scheduled workflows

The 60 days without activity in a public repository after which GitHub turns off a scheduled workflow come from https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows (read 2026-10-25).

## The trial

- Vercel's limits page says a Hobby project connects to no repository of a Git organization, without telling public from private (https://vercel.com/docs/limits, updated 2026-09-16), while its Git page offers a public repository as the way out (https://vercel.com/docs/git, updated 2026-09-18).
- The Git page held: on 2026-10-27, Gilles' Hobby project `shor-admin-panel`, under the scope `gilles-pothieus-projects` (the `target_url` of Vercel's commit statuses), connected to this repository through Vercel's GitHub App, which ShorRP holds for selected repositories only (`gh api orgs/ShorRP/installations`), and built a preview of each pushed commit (`gh api repos/ShorRP/Admin_Panel/deployments`; #9).
- Its production builds of 779396b failed (same command), one with "Invalid environment variables" for `DISCORD_GUILD_ID`, thrown by `parseDiscordApiEnv` from `next.config.ts`, which calls it only once `VERCEL` is set: the project exposes its system variables (Gilles' build log, 2026-10-27).
- Production got its variables with #13, and the first production deployment to succeed was 8dabf13's, at 15:12 UTC on 2026-10-29, after three failed attempts (GitHub deployment 7415200822).

## CI's output

- Next.js writes a warning through `Log.warn`, behind `⚠` (`node_modules/next/dist/build/output/log.js:64`), and Node writes a process warning as `(node:<pid>) [DEP0040] DeprecationWarning: …` or `(node:<pid>) Warning: …` (Node 24.22.0, `require("punycode")` and `process.emitWarning`, 2026-10-24).
- The local build of 2026-10-24 printed no `⚠`, and neither did the same build with 20 base-nova components rendered on a page (throwaway worktree, #87). CI printed one, "No build cache found", on run 40124210901.
- A dependency's own `console.warn` follows no format: `baseline-browser-mapping` 2.11.30 writes one, with no `⚠`, once its data is two months old (`node_modules/.pnpm/baseline-browser-mapping@2.11.30/node_modules/baseline-browser-mapping/dist/index.cjs:1`).
- `pnpm install --frozen-lockfile` answered "Lockfile is up to date, resolution step is skipped" on 2026-10-24; `pnpm peers check` exists in pnpm 12.9.1 and answered "No peer dependency issues found", with the three `peerDependencyRules` of `.claude/rules/dependencies.md` (2026-10-24).
- On run 40124210901, `actions/checkout` printed its `hint:` about the default branch name, `pnpm/action-setup` v6.0.10, whose `v6` tag was stale, installed pnpm 11.19.0, switched to 12.9.1 and printed `[WARN] Detected a pnpm v10 installation layout` (#95, pnpm/action-setup#288, #289), and the runner announced that `ubuntu-latest` moves to Ubuntu 26.
