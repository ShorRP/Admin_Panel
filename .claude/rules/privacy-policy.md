---
paths:
  - "src/privacy-policy/**"
  - "src/app/privacy/**"
  - "e2e/privacy-policy.test.ts"
  - "docs/personal-data.md"
---

# Privacy policy

Discord's Developer Terms ask every application for a privacy policy that its users reach easily (§5a, `docs/personal-data.md`, **What applies**), so `/privacy` stays true to the code (#186). `src/privacy-policy/privacy-policy.test.tsx` pins what it says and `e2e/privacy-policy.test.ts` who reaches it.

## Personal data

- The page says in French what **Today** of `docs/personal-data.md` says, so the two change together (#27, #186).
- That change also sets `LAST_UPDATED` in `privacy-policy.tsx` and the date that `privacy-policy.test.tsx` expects.
- Each section gives the durations of what it describes (#186).
- « Responsable et contact » keeps its placeholder, and the page names no legal basis, until « Who is responsible for the panel's personal data, and who answers requests? » is answered in `docs/agents/open-questions.md` (#186).

## The page

- `PrivacyPolicy` reads nothing from Discord and runs no staff check, so the build prerenders it whole and `proxy.ts` lets a visitor without a session through (**`proxy.ts`** of `CLAUDE.md`, #186).
- It sits in `PublicPageFrame`, the login pages' frame, with the note « Panel du staff de Shor », since the login pages' « Réservé au staff de Shor » would tell a member that the policy is not for them.
- Its `<section>`s take no name, so that they add no landmark beside the page's own.
- The headings, the day of the last update and the footer's note were the agent's to pick, since #186 lists what the page says and not its form (decided by the agent on 2026-11-02, on #186, for Gilles to review).

## Where it is linked

- `PrivacyPolicyLink` and `PublicPageFrame` link it and belong to `src/staff/`: **Navigation** and **Login pages** of `CLAUDE.md` place them.
- The error pages do not link it: they show the panel's failure and one way out of it. The « Confidentialité » link, where the navigation shows it, and its absence from the error pages were the agent's to pick (decided by the agent on 2026-11-02, on #186, for Gilles to review).
