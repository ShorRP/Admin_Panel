# Dependencies

The evidence behind `.claude/rules/dependencies.md`: what pnpm, npm, Vercel and GitHub say or did, the trials that showed how the panel behaves, and what the repository held when each was measured. The rule says what to do; this file says how it was known. A value read from the registry or from GitHub carries its date: it can change without a commit.

The `node_modules` citations are those of the version named beside them: an update of a package re-reads the citations that name it (`.claude/rules/dependencies.md`, **Docs that name a version**).

## Who and when

- Dependabot and Renovate were set aside: neither re-reads the citations that name a version, so each of their PRs would need a session anyway. #56's decisions give the other reasons (Q9).

## Exact versions

- Without a version, `pnpm add is-number` wrote `"^7.0.0"` before `savePrefix: ""` and `"7.0.0"` after it, in a throwaway copy of the repository's package files (2026-11-02, #92). `pnpm help add` gives `^` as pnpm's default.

## Release age

- pnpm 12's `minimumReleaseAge` defaults to 1,440 minutes and stays non-strict until the setting is written down (https://github.com/pnpm/pnpm/blob/v12.9.1/pnpm/crates/config/src/registry_options.rs#L200-L212). Non-strict, when no version old enough fits, pnpm takes the young version and writes it into `minimumReleaseAgeExclude` without asking, as `pnpm add` reported doing for Next.js 16.4.3 on 2026-10-23, on npm since 13:40 UTC that day (`npm view next time`).
- Strict, it asks at a terminal and writes the exclusion only if told yes, and fails without one (https://github.com/pnpm/pnpm/blob/v12.9.1/pnpm/crates/package-manager/src/minimum_release_age.rs#L146-L191). Not tried at a terminal. Without one (`[ -t 0 ]`, 2026-11-02), `pnpm add` of a version under 7 days old failed with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` and left the three files as they were: so did `lucide-react@1.64.0`, 4 days old, which the default had let in, and `cn@0.5.2`, under a day old, in a throwaway copy of the repository's package files (2026-11-02, #92).
- A lockfile entry under 7 days old fails `pnpm install --frozen-lockfile` with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, though the lockfile is up to date: the same copy did once it held `lucide-react@1.64.0`, added under the default (2026-11-02, #92). The error's help ends on « relax the policy that flagged them » (the same run).
- CI runs that check: « ✓ Lockfile passes supply-chain policies (712 entries in 3.5s) » (run 41514393274, 2026-11-02, #92).
- pnpm records each lockfile it verified, by its hash and the policy, in `lockfile-verified.jsonl` of its cache, and answered « verified 16s ago » for a lockfile it had just checked (2026-11-02), so a local install proves a lockfile afresh only under an empty `--config.cache-dir` (inferred): the repository's 712 entries passed so (« ✓ Lockfile passes supply-chain policies (712 entries in 16.8s) », 2026-11-02, #92).
- The repository's age "never reaches `self-update`" (https://github.com/pnpm/pnpm/blob/v12.9.1/pnpm/crates/config/src/registry_options.rs#L200-L212): inferred from that comment, which #97 checks.

## Docs that name a version

- On 2026-10-25, `CLAUDE.md` and the ADRs held 42 `node_modules/…:line` citations, 33 of them into Next.js (`grep -oE 'node_modules/[^ ]+:[0-9]+' CLAUDE.md docs/adr/*.md`), and, by an agent's count, 12 short back-references to the same files and about 42 sentences that name a version.
- On 2026-11-12, `grep -rhoE 'node_modules/[^ ]+:[0-9]+' CLAUDE.md .claude/rules docs --include=*.md | wc -l` counted 108, 2 of them in the ADRs, after the split of `CLAUDE.md` (#434) had moved citations into the rules and into `docs/` (#450, comment of 2026-11-12).

## Holds

- `@babel/parser` 8.x requires Node `^22.18.0 || >=24.11.0` (`npm view @babel/parser@8 engines`, 8.0.8, 2026-10-29). CI ran 24.22.1, which 8.x accepts (run 40898070133, 2026-10-29).
- `typescript@7` on npm is the native compiler: its package exports no stable JavaScript API, only `./unstable/*`. typescript-eslint 8.72.0 accepts `typescript >=4.8.4 <6.1.0` (`npm view typescript-eslint peerDependencies`, 2026-10-23). Next.js alone would accept 7, through its `tsc` CLI (https://nextjs.org/docs/app/api-reference/config/typescript, updated 2026-08-25).
- ESLint 9.x reached end-of-life on 2026-08-06 (https://eslint.org/version-support, read 2026-10-23). `eslint-config-next` supports 10 since 16.4.0 (https://nextjs.org/docs/app/api-reference/config/eslint, updated 2026-10-15).
- GHSA-mrhx-c7xc-m3w5, against zod `<4.6.6`: every `@vercel/cli-config` pins zod 4.1.11, 0.1.0 to 0.3.3 (`npm view @vercel/cli-config@<version> dependencies.zod`, 2026-10-25), through `@vercel/functions` > `@vercel/oidc`. `.next/server` names neither package after `pnpm build` (2026-10-25).
- Corepack "is distributed with Node.js from version 14.19.0 up to (but not including) 25.0.0" (https://github.com/nodejs/corepack, README, read 2026-10-27). The line of the rule that waits on Corepack goes once Vercel's page on package managers says that it picks pnpm 12 from the lockfile itself (https://vercel.com/docs/package-managers, updated 2026-08-11).

## Node

- Vercel offers 24.x, its default, and 22.x; `engines.node` wins over the project's setting, and `>=22.0.0` deploys the latest 24.x (https://vercel.com/docs/functions/runtimes/node-js/node-js-versions, updated 2026-02-27, read again 2026-10-29). The range that `^24.0.0` replaced, `^22.13.0 || ^24.0.0 || >=26.0.0`, followed the decision of 2026-10-23 that `engines.node` is the intersection of the toolchain's ranges, which Gilles reopened on 2026-10-25, while grilling #56.
- The ranges of the toolchain on 2026-10-29 (`npm view <package> engines`): Vitest 5 `^22.12.0 || ^24.0.0 || >=26.0.0`, ESLint 10 `^20.19.0 || ^22.13.0 || >=24`, jsdom 30.1.3 `^22.22.2 || ^24.15.0 || >=26.0.0`.
- `@types/node` was 24.19.2, the latest 24.x on 2026-10-29 (`npm view @types/node time`).
- Node 24 reaches its end of life on 2028-04-30 (`schedule.json` of https://github.com/nodejs/Release, read 2026-10-25).

## Actions

- `pnpm/action-setup`'s `v6` still pointed to v6.0.10, which predates its pnpm 12 support (pnpm/action-setup#288 and #289, 2026-10-25).

## Advisories

- GitHub's dependency graph reads no lockfile of two YAML documents (https://github.blog/changelog/2026-10-20-dependabot-now-supports-npm-12-pnpm-11-and-12-and-bun-1-4/).
- A scheduled workflow notifies "the user who initially created the workflow" (https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs, read 2026-10-25).
- `pnpm audit` covers every dependency, devDependencies included, and fails on any advisory at its default level, `low` (https://pnpm.io/cli/audit, read 2026-10-25; https://github.com/pnpm/pnpm/blob/v12.9.1/pnpm/crates/cli/src/cli_args/audit.rs#L392-L402). `--ignore <GHSA>` writes under `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` (pnpm 12.9.1, 2026-10-25).

## One copy

- `eslint-config-next@16.4.3` declares `typescript-eslint` `^8.56.0` (`npm view eslint-config-next@16.4.3 dependencies.typescript-eslint`, 2026-10-25). `pnpm help dedupe` describes the check.

## Copying code from another project

- Apache-2.0 section 4(b): "You must cause any modified files to carry prominent notices stating that You changed the files" (https://www.apache.org/licenses/LICENSE-2.0.txt, read 2026-11-02).
- skymp-heavy-rp is under AGPL-3.0 (`gh api repos/vinicius3232/skymp-heavy-rp/license`, 2026-11-02).
- EsportCards has no license (`gh api repos/PothieuG/EsportCards`, 2026-11-02) and a second contributor, whose 296 commits outnumber Gilles' 289 (its `contributors`, the same day), while the 21 commits of its `.claude/skills/groom-backlog/`, the copy that was shared with the panel, are all Gilles' (its `commits?path=.claude/skills/groom-backlog`, the same day). The panel's `groom-backlog` now comes from the agent-workflow plugin.
