---
status: accepted
---

# The repository is public, so that Vercel's Hobby plan can deploy it

`ShorRP/Admin_Panel` goes public. The panel is hosted on Vercel's free Hobby plan (`CLAUDE.md`, introduction), and Vercel deploys no private repository of a GitHub organization to a Hobby team, pointing to a public repository or to Pro instead (https://vercel.com/docs/git, **Using Hobby teams**, updated 2026-09-18). A public repository also gets, on GitHub Free, what a private one lacks: environments, and so a home for the contract suite's secret in CI (https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment, read 2026-10-25), a ruleset on `main`, and Actions at no cost. The panel's protection never rested on its code staying hidden, but on its secrets, which never enter the repository (`CLAUDE.md`, **Security**). Decided by Gilles on 2026-10-25, while grilling #57, for the time being: the repository may go private again, at the cost listed below.

## Considered Options

- **Moving the repository to Gilles' account**: Vercel's restriction targets organizations only, but the repository would leave ShorRP, and whether the organization's project board can hold the issues of a personal repository is unchecked (https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project names organizations only, read 2026-10-25).
- **Deploying with Vercel's CLI from GitHub Actions** (https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel, updated 2026-10-16): the repository stays private, but CI would hold a token that reads production's variables, Vercel's docs say nothing of Hobby on that path, and a prebuilt deployment lacks the system variables at build (https://vercel.com/docs/cli/deploy, read 2026-10-25), while `next.config.ts` reads `VERCEL` then (`CLAUDE.md`, **Configuration**).
- **Vercel Pro**: paid.
- **Another host**: it would reopen **Security**, **Monitoring** and **Configuration** in `CLAUDE.md`.

## Consequences

- Everything in the repository is public: its code, its history, its issues and their comments, and Actions' logs (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility, read 2026-10-25). #100 scans the history for secrets and reads the issues before the switch.
- The repository has no license, so its code can be read but not reused (inferred). `THIRD_PARTY_NOTICES.md` carries shadcn/ui's MIT notice for the code copied into `src/ui/` (#101).
- Vercel's limits page says a Hobby project connects to no repository of a Git organization, without telling public from private (https://vercel.com/docs/limits, updated 2026-09-16). #9 starts with that trial; if Vercel refuses, a short grilling picks between the first two options above, on the trial's facts.
- Going private again would cost:
  - the Hobby deployment, which Vercel refuses to a private repository of an organization, so that moving the repository, Vercel's CLI or Pro would be needed;
  - GitHub's environments, which GitHub Free offers to public repositories only, and so the contract suite's secret in CI;
  - most likely the ruleset on `main`, which GitHub refused this private repository on 2026-10-23 (`CLAUDE.md`, **Feedback loops**);
  - free Actions: a free organization's private repositories share 2,000 minutes a month (https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions, read 2026-10-25);
  - GitHub Advanced Security, such as secret scanning, which stops without a license, and the repository's stars and watchers, which GitHub erases (the visibility page above);
  - but nothing already published: GitHub moves the public forks into a network of their own (same page), and clones stay where they are.
