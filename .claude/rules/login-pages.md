---
paths:
  - "src/staff/login-*"
  - "src/staff/logged-out*"
  - "src/staff/public-page-frame.tsx"
  - "src/app/login/failed/**"
  - "src/app/login/logged-out/**"
  - "src/app/login/refused/**"
  - "e2e/login.test.ts"
---

# The login pages

`/login/logged-out`, `/login/refused` and `/login/failed`, which a member reaches with no session (#10, #236). Their texts are in `logged-out.tsx`, `login-refused.tsx` and `login-failed.tsx`, and their tests and `e2e/login.test.ts` name each case. The mockup's lines and the measures behind a choice are in `docs/staff.md`, **The login pages**, and the responsive details in `docs/responsive.md`, **Pages**. The session and the callback that lead here are in `.claude/rules/staff.md`.

## The frame

- The three pages share `LoginNotice`, which lays out the right column of the mockup's login screen alone, centered, at most 672 px wide (`max-w-2xl`), with a 16 px gutter under `sm` and the mockup's 48 px from `sm` up, and without its left column, the empty slot of the site's illustration, which the panel does not take since it must not look like the site (#221, #236) (decided by the agent on 2026-10-29, on #236, for Gilles to review).
- The column fills the screen's height: on top, a bar with the logo, « Shor » in letter-spaced capitals in the headings' font and the theme toggle (`.claude/rules/staff-theme-toggle.md`); in the middle, a `<main>` that takes the height the bar and the footer leave and centers in it, against the column's left edge, a block at most 400 px wide: the logo again, the overline « Panel du staff · Skyrim Roleplay », an `h1` in the headings' font, 38 px under `sm` and 46 px from it (#362), a sentence in `muted-foreground`, the rule with a diamond and the page's buttons; in its `<footer>`, the note `LoginNotice` gives `PublicPageFrame`, « Réservé au staff de Shor », then « Confidentialité », `PrivacyPolicyLink`'s link to the privacy policy, which does not prefetch, and a link « shor-rp.fr » to https://shor-rp.fr, a plain `<a>` with `target="_blank"` and `rel="noopener noreferrer"` before an `ExternalLink` icon, `aria-hidden`, all in `muted-foreground`, wrapping onto a second line where the screen is too narrow, since the mockup's `--fg3` would miss 4.5:1 (#221) (decided by the agent on 2026-10-29, on #236, for Gilles to review, for the block that keeps to the column's left edge, the logo before « Shor » and the `ExternalLink` icon).
- The top bar and the footer are `PublicPageFrame`'s, which the privacy policy shares so that both read alike (#186). The footer's links take 44 px on a touch screen and the footer centers its items (`docs/responsive.md`, **Pages**; #362).
- The top bar is a `<div>` rather than a `<header>`, whose `banner` the login flows of `e2e/login.test.ts` read as the staff's bar, which a login page lacks (decided by the agent on 2026-10-29, on #236, for Gilles to review).
- The « shor-rp.fr » link opens a new tab and has no `sr-only` text saying so (`docs/staff.md`, **The login pages**; decided by the agent on 2026-10-29, on #236, for Gilles to review).
- The link to « #créer-ticket » of `/login/failed` and of the error pages opens a new tab and has no such text either; `/login/failed` names it as a link, in place of « le salon du staff sur Discord » (`.claude/rules/ui.md`, **The report channel's link**, #61).
- The tab titles stay « Déconnexion », « Accès refusé » and « Connexion échouée », though the first page's `h1` changed (decided by the agent on 2026-10-29, on #236, for Gilles to review).

## Buttons

- A login page's main action is `default`, « Se connecter avec Discord », « Se reconnecter » or « Réessayer » (#221, #236); `outline` is for the « Se déconnecter » of `/login/refused`, beside its « Se reconnecter » (#236). `LoginLink`, in `login-link.tsx`, gives the `default` link to `/login` that each of the three pages draws (#236).
- The buttons are 40 px high, as the mockup draws them, through `LOGIN_ACTION_CLASS`, in `login-notice.tsx`, which `cn` merges over the copied Button's default size, so that the Button does not change, and which keeps the Button's own `touch:h-11`, so that the buttons take 44 px on a touch screen (#362) (decided by the agent on 2026-10-29, on #236, for Gilles to review).
- `LOGIN_ACTION_CLASS` also makes the buttons fill the width of the block of at most 400 px that holds them under `sm`, the log-out button inside its `<form>` included, and not the column's (`docs/responsive.md`, **Pages**, for the classes and the measure; #362).
