# Costs

What each third party the panel, its CI and its tooling rely on is used for, why it cannot bill, what would make it bill, and what it can cost otherwise. The rule is in `CLAUDE.md`, **Costs** (#123). Every page below was read, and every command run, on 2026-10-27; a date after a URL is the page's own.

## Vercel

**Used for** hosting the panel, on the Hobby plan of Gilles' own account (#9): deployments from Git, functions, the Firewall's one rate-limiting rule, Attack Mode when needed, Standard Deployment Protection on previews, and runtime logs. The panel uses no database, Blob, Edge Config, Web Analytics, Speed Insights, Image Optimization, domain or integration.

**Why it cannot bill.**

- A Hobby account is "limited to the usage caps and cannot purchase additional usage" (https://vercel.com/pricing, FAQ « Can I buy additional usage? », undated). Hobby has no on-demand rate (https://vercel.com/docs/pricing, updated 2026-09-14), and "there are no billing cycles" (https://vercel.com/docs/plans/hobby, updated 2026-09-14). Spend Management "is available on Enterprise and Pro plans" (https://vercel.com/docs/spend-management, updated 2026-09-18), so the pricing FAQ's default budget of $200 for "All new teams" has nothing to spend on Hobby (inferred).
- Past an included limit, "Hobby plans will be paused" (https://vercel.com/docs/plans, updated 2026-09-18): visitors get `503 DEPLOYMENT_PAUSED` (https://vercel.com/kb/guide/why-is-my-account-deployment-blocked, dated 2025-11-03), and "in most cases" the feature comes back after 30 days (https://vercel.com/docs/plans/hobby). The products the panel leaves unused stop on Hobby rather than bill too: Image Optimization (https://vercel.com/docs/image-optimization/limits-and-pricing, updated 2026-08-11), Web Analytics (https://vercel.com/docs/analytics/limits-and-pricing, updated 2026-08-25), Speed Insights (https://vercel.com/docs/speed-insights/limits-and-pricing, updated 2026-09-23), Blob (https://vercel.com/docs/vercel-blob/usage-and-pricing, updated 2026-09-23) and Sandbox (https://vercel.com/docs/sandbox/pricing, updated 2026-09-10).
- The Firewall's features on every plan "are free to use", custom rules included (https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing, updated 2026-06-16), and Hobby gets one rate-limiting rule per project, with 1,000,000 allowed requests (https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting, updated 2026-08-28). Attack Mode "is available for free on all plans" (https://vercel.com/docs/vercel-firewall/attack-mode, updated 2026-08-11). Standard Protection is included on Hobby (https://vercel.com/docs/deployment-protection/usage-and-pricing, updated 2026-09-15).
- A card is asked for at the upgrade to Pro (https://vercel.com/docs/plans/hobby, **Upgrading to Pro**). The sign-up steps name none (https://vercel.com/docs/accounts, updated 2026-09-21), and Gilles' sign-up, on 2026-10-27, asked for none (Gilles, on #9).

**What would make it bill: a payment method.** Vercel's terms then let it charge "your credit card or other payment method on record" (https://vercel.com/legal/terms, §18.1, last updated 2026-10-19). A Hobby account can hold one:

- buying a domain asks for one, as the notification « Domain no payment source or payment failure » shows (https://vercel.com/docs/notifications, updated 2026-09-14);
- buying AI Gateway credits asks to « Choose your payment method » (https://vercel.com/docs/ai-gateway/pricing, updated 2026-09-08);
- a Marketplace integration that bills takes "a different payment method for each integration installation" (https://vercel.com/docs/integrations/create-integration/billing, updated 2026-08-28), and Vercel invoices it.

A Hobby user who bought a domain could not remove the card afterwards (https://community.vercel.com/t/unable-to-remove-credit-card-after-a-one-time-domain-purchase-hobby-plan/46716, unofficial, 2026-07-28), so a card added once may stay (inferred). With a card on file:

- a Pro team bills, whether upgraded or at the end of a trial: "Billing begins immediately after your trial ends if you have added a payment method" (https://vercel.com/docs/plans/pro-plan/trials, updated 2026-09-14);
- a domain renews every year, and "All fees are non-refundable" (https://vercel.com/legal/terms, §18.1);
- credits, add-ons and Marketplace integrations bill, which Spend Management leaves out even on Pro (https://vercel.com/docs/spend-management);
- `vercel buy` buys credits, add-ons, subscriptions and domains, and its `--yes` "skips the confirmation prompt" (https://vercel.com/docs/cli/buy, updated 2026-07-24).

A trial without a card bills nothing: "Without a payment method, your account reverts to a Hobby plan" (the trials page). The rule refuses it all the same: it is the screen where a card gets added, and it may leave a second team to merge or delete, since "Each account is limited to one team on the Hobby plan" (https://vercel.com/docs/plans/pro-plan, updated 2026-09-15; inferred).

**What it can cost otherwise: the panel's availability.**

- A limit reached pauses the panel, and in most cases the feature comes back only after 30 days (above). What happens on Hobby past the rate-limiting rule's 1,000,000 allowed requests is documented nowhere; the same pause, presumably (inferred).
- The terms keep Hobby for "your personal or non-commercial use", and let Vercel "shut down and terminate projects or deployments using the Hobby plan without notice" (§4). The fair use guidelines require Pro or Enterprise for "All commercial usage", and add that "Asking for Donations does not fall under commercial usage" (https://vercel.com/docs/limits/fair-use-guidelines, updated 2026-09-14): hence « Does Shor make money? » in `docs/agents/open-questions.md`.
- Vercel's limits page says a Hobby project connects to no organization's repository, and points to creating a team instead (https://vercel.com/docs/limits, updated 2026-09-16), whose dialog offers the Pro Trial (the trials page). On 2026-10-27, Vercel linked Gilles' Hobby project to this public repository all the same (`CLAUDE.md`, **The trial**).

## GitHub

**Used for** the repository `ShorRP/Admin_Panel`, public since 2026-10-27 (ADR 0007), owned by the organization ShorRP on GitHub Free (`gh api orgs/ShorRP`: `plan.name` `free`): issues, the project board, Actions on standard hosted runners with their cache, the ruleset on `main`, secret scanning, push protection, private vulnerability reporting and the dependency graph. Dependabot alerts come with #94, and the environment `discord-contract` with #102. `ci.yml`'s actions, `actions/checkout`, `pnpm/action-setup` and `actions/setup-node`, fetch pnpm and Node.js from their public releases (inferred).

**Why it cannot bill.**

- "GitHub Actions usage is free for self-hosted runners and for public repositories that use standard GitHub-hosted runners" (https://docs.github.com/en/billing/concepts/product-billing/github-actions). October 2026 shows it: 119 minutes on Linux, discounted in full, net $0 (`gh api organizations/ShorRP/settings/billing/usage/summary`).
- On GitHub Free, a public repository gets for free what a private one lacks: environments (https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment), rulesets (https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), secret scanning, which "runs automatically for free" there (https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning), push protection (https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) and private vulnerability reporting (https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository). Issues, Projects, the dependency graph and Dependabot alerts are free on every plan (https://github.com/pricing; the Advanced Security page).
- Without a payment method, "usage is blocked once you use up your quota" (the Actions billing page), as the billing pages of Packages (https://docs.github.com/en/billing/concepts/product-billing/github-packages), Codespaces (https://docs.github.com/en/billing/concepts/product-billing/github-codespaces) and Git LFS (https://docs.github.com/en/billing/concepts/product-billing/git-lfs) say too. ShorRP holds no payment method (inferred: `gh api repos/ShorRP/Admin_Panel/actions/cache/storage-limit` answers `402`, « Please ensure your account has a valid payment method on file to access this service. »). It also holds four budgets of $0 that stop usage, for Actions, Packages, Codespaces and Git LFS (`gh api organizations/ShorRP/settings/billing/budgets`).
- "Organizations on a GitHub Free plan cannot pay for GitHub Codespaces" (https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/choosing-who-owns-and-pays-for-codespaces-in-your-organization): a codespace bills the personal account of whoever opens it, within that account's own quota.

**What would make it bill: a payment method on ShorRP**, which any of its four owners (`gh api orgs/ShorRP/members?role=admin`) or a billing manager can add (https://docs.github.com/en/billing/reference/billing-roles). Then a $0 budget raised, deleted or set to alert only lets its product bill, and some things bill with no budget to stop them:

- a larger runner, "always charged for, even when used by public repositories" (the Actions billing page);
- an Actions cache raised above its 10 GB, billed above them (same page); the repository holds 2.9 GB in 20 caches (`gh api repos/ShorRP/Admin_Panel/actions/cache/usage`);
- Copilot seats, an upgrade to Team, or a Marketplace app on a paid plan, whose "paid subscription will start at the end of the 14-day trial" (https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-github-marketplace-for-your-organizations).

Git LFS bandwidth and storage "always count against the repository owner's account", even from a public repository (the Git LFS billing page), and so would private Packages. Going private again, which ADR 0007 allows, would put Actions on the organization's 2,000 free minutes a month, then block them.

**What it can cost otherwise.** No money. A self-hosted runner would be free today, but GitHub only postponed the charge it had announced for them (https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/, 2025-12-16); the panel uses none.

## Discord

**Used for** the panel's two applications, « Shor Panel » and « Shor Panel Dev », which Gilles owns (#7): their bot tokens on the REST API, the OAuth2 login, and the webhook of the alerts (`CLAUDE.md`, **Monitoring**); and its CDN, from which the staff's browsers load the members' avatars, with no token (`CLAUDE.md`, **Avatars**).

**Why it cannot bill.** The Developer Terms name no fee for the APIs (https://support-dev.discord.com/hc/en-us/articles/8562894815383, effective 2024-07-08). The fee Discord takes from developers is a share of what a Premium App sells (https://support-dev.discord.com/hc/en-us/articles/17299902720919, updated 2026-06-11), and monetization is something a team owner enables (https://docs.discord.com/developers/monetization/enabling-monetization); the panel sells nothing.

**What would make it bill.** Going past Discord's API limits needs "Discord's express written consent", which Discord may tie to "additional terms and/or charges" (Developer Policy, **API Limits**, https://support-dev.discord.com/hc/en-us/articles/8563934450327, effective 2024-07-08). The panel asks for none, and waits out a 429 (`CLAUDE.md`, **Retries**).

**What it can cost otherwise.** Discord "MAY CHANGE, SUSPEND, OR DISCONTINUE" its APIs, and its terms "from time to time" (the Developer Terms).

## The npm registry

**Used for** `pnpm install`, `pnpm audit` and `pnpm audit signatures`, from the public registry, with no account: the repository holds no `.npmrc`, and `ci.yml` holds no secret (`CLAUDE.md`, **CI secrets**).

**Why it cannot bill.** Public packages are ones "anyone can download and use in their own projects" (https://docs.npmjs.com/about-public-packages, edited 2023-10-23), and sharing them publicly has "no cost" (https://docs.npmjs.com/about-npm).

**What would make it bill.** Private packages, a paid npm organization, or another registry that needs a token.

## Playwright's browser

**Used for** `pnpm exec playwright install chromium`, in CI and at the desk. Playwright is Apache-2.0 (`"license"` in `node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/package.json`), and downloads its browser from Microsoft's CDN (https://playwright.dev/docs/browsers): `https://cdn.playwright.dev/dbazure/download/playwright` or `https://playwright.download.prss.microsoft.com/dbazure/download/playwright` (`node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/lib/coreBundle.js`).

**Why it cannot bill.** The download needs no account and no key: `ci.yml` runs it with no secret (`CLAUDE.md`, **CI secrets**).

**What would make it bill.** Nothing in this use; a hosted service that runs the browsers would be a new tool (`CLAUDE.md`, **A new tool**).

## shadcn/ui's registry

**Used for** `pnpm exec shadcn add` and its `--diff`, from shadcn/ui's own registry only: `components.json` sets `"registries": {}`. The code is MIT (https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

**Why it cannot bill.** The registry answers without an account: `CLAUDE.md` cites its JSON, such as https://ui.shadcn.com/r/styles/base-nova/button.json, read with no login.

**What would make it bill.** Another registry, such as `@v0`, or a private one that takes a token in its headers (https://ui.shadcn.com/docs/components-json).

## Claude Code

**Used for** writing the panel, under Gilles' own Claude subscription, a fixed price he chose; the repository's hooks and skills run on his machine.

**What would make it bill beyond that.** Usage credits, which apply to "Claude Code terminal usage" too. They bill only once someone clicks « Enable », sets up a payment method and prepays, and they take a monthly spend limit (https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans, undated).

## Planned

- **Neon**, the store ADR 0004 picks for what the panel keeps after the MVP, on an account opened at Neon rather than through the Vercel Marketplace, whose Vercel-managed integration is "Paid through Vercel" (https://neon.com/docs/guides/vercel-overview, read 2026-10-27): its entry comes before that account opens, with the first feature that stores, which the grilling of the moderation wave settles (#27).

## Outside this ledger

Gilles' machine and his password manager are his own.
