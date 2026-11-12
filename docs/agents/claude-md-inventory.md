# Inventaire des passages de CLAUDE.md par dossier

Mesuré sur `CLAUDE.md` de `0d4d600` par `node docs/agents/claude-md-inventory.mjs CLAUDE.md docs/agents/claude-md-inventory.md` (ticket #422, carte #421). Les tailles sont des octets UTF-8, saut de ligne compris ; une ligne est une ligne physique du fichier.

## Faits mesurés

- `CLAUDE.md` : 492126 octets, 319 lignes. Chaque paragraphe et chaque puce tient sur une seule ligne physique : le plafond de 200 lignes n'est donc pas la contrainte, les octets le sont.
- Toutes les règles de `.claude/rules/` portent un `paths:` (`head -5 .claude/rules/*.md`) : `CLAUDE.md` est seul à être toujours chargé.

### Par section

| Section | Ligne | Octets | Lignes |
| --- | ---: | ---: | ---: |
| (en-tête) | 1 | 6731 | 4 |
| How we work | 5 | 1589 | 21 |
| Language | 26 | 571 | 4 |
| No comments | 30 | 16695 | 16 |
| Facts and docs | 46 | 2694 | 11 |
| Costs | 57 | 2532 | 10 |
| Architecture | 67 | 17425 | 16 |
| Errors | 83 | 23269 | 12 |
| Testing | 95 | 80932 | 17 |
| Interface | 112 | 208999 | 38 |
| Responsive | 150 | 29750 | 17 |
| Security | 167 | 24683 | 19 |
| Monitoring | 186 | 12425 | 16 |
| Code style | 202 | 9002 | 15 |
| Warnings | 217 | 17135 | 16 |
| Dependencies | 233 | 14559 | 24 |
| Delivery | 257 | 12933 | 17 |
| Feedback loops | 274 | 4800 | 13 |
| Commits, PRs, issues | 287 | 2363 | 10 |
| Gotchas | 297 | 2561 | 10 |
| Agent skills | 307 | 17 | 2 |
| Issue tracker | 309 | 228 | 4 |
| Triage labels | 313 | 119 | 4 |
| Domain docs | 317 | 114 | 3 |

### Par sorte de passage

Somme des passages (titres et lignes vides exclus) selon la colonne « Dossiers ou chemins » des tableaux ci-dessous, qui est une attribution, pas une mesure.

| Sorte | Octets |
| --- | ---: |
| un dossier ou un chemin | 405782 |
| aucun dossier (candidat à rester) | 61857 |
| hors dépôt (Vercel, GitHub, Discord) | 15892 |
| intro de section (historique) | 5156 |
| plugin agent-workflow | 3023 |
### Par dossier

Ce qui partirait vers chaque dossier si chaque passage suivait le premier chemin de sa colonne « Dossiers ou chemins », et, pour les passages du découpage fin, les domaines estimés de leurs phrases. Ce sont des ordres de grandeur pour la liste des règles scopées, pas des tailles de règles : une règle scopée ne garde que ce qu'il faut pour écrire du code juste, la référence part dans `docs/` (carte #421, **Notes**).

| Dossier ou sorte | Octets |
| --- | ---: |
| src/ui/ | 62802 |
| aucun : reste | 55933 |
| src/staff/ | 48698 |
| src/sanctions/ | 43363 |
| aucun domaine reconnu (estimé) | 32802 |
| src/ticket-archives/ | 27912 |
| e2e/ | 24462 |
| src/blocked-words/ | 23330 |
| src/discord/ | 22473 |
| src/audit-log/ | 22100 |
| scripts/ | 19379 |
| hors dépôt | 15892 |
| src/records/ | 15467 |
| src/monitoring/ | 14529 |
| .github/ | 10393 |
| src/app/ | 8241 |
| aucun : intro de section | 5156 |
| .claude/ | 4646 |
| package.json | 4026 |
| next.config.ts | 3492 |
| src/privacy-policy/ | 3453 |
| eslint.config.mjs | 3119 |
| plugin agent-workflow : reste | 3023 |
| src/game-log/ | 2659 |
| prettier.config.mjs | 2153 |
| src/support-tickets/ | 2033 |
| eslint-rules/ | 2014 |
| src/*/env.ts | 1722 |
| pnpm-workspace.yaml | 1399 |
| src/proxy.ts | 1191 |
| tsconfig.json | 1129 |
| pnpm-lock.yaml | 708 |
| vitest.config.mts | 614 |
| src/bot-log/ | 349 |

## Passage par passage

« aucun : reste » marque un passage qui ne relève d'aucun dossier, candidat à rester toujours chargé ; « plugin agent-workflow : reste », un passage du plugin, qui reste (carte #421, **Notes**) ; « aucun : intro de section », l'introduction d'une section, qui dit qui l'a décidée et quand ; « hors dépôt », un passage qui décrit un réglage de Vercel, de GitHub ou de Discord. L'attribution est celle de l'agent, à la lecture du passage.

### (en-tête)

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 3 | (paragraphe) | 6717 | aucun : reste | description du panel, nomme chaque route de `src/app/` |

### How we work

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 7 | (paragraphe) | 129 | aucun : reste |  |
| 9 | (paragraphe) | 26 | aucun : reste |  |
| 11 | tdd | 38 | aucun : reste |  |
| 12 | diagnosing-bugs | 126 | aucun : reste |  |
| 13 | domain-modeling | 139 | aucun : reste |  |
| 14 | code-review | 84 | aucun : reste |  |
| 15 | groom-backlog | 290 | aucun : reste |  |
| 17 | (paragraphe) | 123 | aucun : reste |  |
| 19 | non-trivial change, not grilled yet → `/grill-with-docs` | 61 | aucun : reste |  |
| 20 | grilled change too big for one session → `/to-spec`, then… | 76 | aucun : reste |  |
| 21 | effort too foggy to scope → `/wayfinder` | 45 | aucun : reste |  |
| 22 | the answer lives in a teammate's head (the POs, the staff… | 95 | aucun : reste |  |
| 23 | an epic of `ready-for-agent` and `skill:implement` sub-ti… | 186 | aucun : reste |  |
| 24 | every `ready-for-agent` and `skill:implement` ticket of t… | 150 | aucun : reste |  |

### Language

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 28 | (paragraphe) | 557 | aucun : reste |  |

### No comments

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 32 | (paragraphe) | 401 | aucun : reste |  |
| 34 | (paragraphe) | 345 | aucun : reste |  |
| 36 | (paragraphe) | 1633 | `scripts/check-comments.mjs`, `.claude/hooks/`, `test/check-comments.test.mjs` |  |
| 38 | (paragraphe) | 6143 | `scripts/check-comments.mjs` |  |
| 40 | (paragraphe) | 4438 | `scripts/check-comments.mjs` |  |
| 42 | (paragraphe) | 2426 | `scripts/check-comments.mjs` |  |
| 44 | (paragraphe) | 1286 | `scripts/check-comments.mjs` |  |

### Facts and docs

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 48 | Facts apart from inferences | 211 | plugin agent-workflow : reste |  |
| 49 | Challenge with evidence | 220 | plugin agent-workflow : reste |  |
| 50 | Agent decisions | 458 | plugin agent-workflow : reste |  |
| 51 | Unrecoverable why | 239 | plugin agent-workflow : reste |  |
| 52 | Docs as you go | 597 | plugin agent-workflow : reste |  |
| 53 | Always-loaded context | 552 | plugin agent-workflow : reste |  |
| 54 | Scope | 126 | plugin agent-workflow : reste |  |
| 55 | Gotchas | 271 | plugin agent-workflow : reste |  |

### Costs

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 59 | (paragraphe) | 459 | aucun : reste | règle d'or, détail dans `docs/costs.md` |
| 61 | No way to pay | 576 | aucun : reste | `docs/costs.md` |
| 62 | A paid plan | 163 | aucun : reste |  |
| 63 | A new tool | 728 | aucun : reste | `docs/costs.md` |
| 64 | Agents | 368 | aucun : reste |  |
| 65 | Rechecked every month | 226 | aucun : reste | `docs/costs.md` |

### Architecture

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 69 | (paragraphe) | 280 | aucun : intro de section |  |
| 71 | Folders | 542 | aucun : reste | plan de `src/` |
| 72 | The Discord seam | 5175 | `src/discord/` | dont `getGuild`/`listChannels` pour `src/staff/can-view-channel.ts` |
| 73 | Entry points only wire | 1091 | aucun : reste | `src/app/`, `src/proxy.ts`, `src/instrumentation.ts` |
| 74 | The staff check | 3668 | `src/staff/`, `src/app/(staff)/` | cite `/records`, `/game-log`, `/bot-log` |
| 75 | Channel visibility | 3133 | `src/staff/can-view-channel.ts` |  |
| 76 | Writes | 420 | aucun : reste | `src/*/actions.ts` |
| 77 | Validation | 273 | aucun : reste |  |
| 78 | Components | 1067 | aucun : reste | dont `StatefulThemeToggle` de `src/staff/` |
| 79 | Caching | 1130 | `src/app/` | principe `use cache` général, détail des pages |
| 80 | `proxy.ts` | 376 | `src/proxy.ts` |  |
| 81 | Imports | 251 | aucun : reste | `tsconfig.json`, `vitest.config.mts` |

### Errors

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 85 | (paragraphe) | 174 | aucun : intro de section |  |
| 87 | Four kinds of failure | 798 | aucun : reste |  |
| 88 | `DiscordError` | 654 | `src/discord/discord-error.ts` |  |
| 89 | Retries | 1453 | `src/discord/` |  |
| 90 | Write results | 8950 | `src/blocked-words/`, `src/sanctions/` | voir le découpage fin |
| 91 | Read failures | 5445 | `src/app/error.tsx`, plusieurs domaines | voir le découpage fin |
| 92 | Error pages | 5328 | `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`, `error-notice.tsx`, `src/ui/report-channel-link.tsx` |  |
| 93 | Messages | 454 | aucun : reste |  |

### Testing

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 97 | (paragraphe) | 213 | aucun : intro de section |  |
| 99 | Layers | 683 | aucun : reste |  |
| 100 | The fake | 17069 | `src/discord/fake-discord.ts` | et les aides de test de `src/ticket-archives/`, `src/support-tickets/`, `src/game-log/`, `src/bot-log/` ; voir le découpage fin |
| 101 | The HTTP adapter | 1288 | `src/discord/http-adapter.ts` |  |
| 102 | Assertions read state | 176 | aucun : reste |  |
| 103 | Testing the staff check | 666 | `src/staff/` |  |
| 104 | The contract suite | 8489 | `src/discord/discord-api-contract.ts`, `vitest.contract.config.mts` |  |
| 105 | The real implementations | 703 | `src/discord/` |  |
| 106 | No DOM | 1549 | aucun : reste | cite `StaffHeader` de `src/staff/` |
| 107 | The theme | 4637 | `src/ui/globals.test.ts`, `src/ui/globals.css` |  |
| 108 | Testing monitoring | 1135 | `src/monitoring/` |  |
| 109 | `proxy.ts` | 815 | `src/proxy.ts`, `src/staff/redirect-without-session` |  |
| 110 | End to end | 43495 | `e2e/`, `playwright.config.ts` | fixtures et flux de chaque page ; voir le découpage fin |

### Interface

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 114 | (paragraphe) | 1812 | aucun : intro de section | pointe vers `docs/design/hydromel/` |
| 116 | Framework | 741 | aucun : reste |  |
| 117 | Styles | 517 | aucun : reste | `src/ui/globals.css` |
| 118 | Component library | 762 | `src/ui/`, `components.json` |  |
| 119 | Copied code | 2931 | `src/ui/` (composants copiés) |  |
| 120 | `src/ui/` | 9049 | `src/ui/` | voir le découpage fin |
| 121 | Theme | 34778 | `src/ui/globals.css`, `src/ui/theme.ts`, `src/staff/`, `src/app/icon.svg` | et badges de `src/records/`, notices de `src/sanctions/` ; voir le découpage fin |
| 122 | Fonts and icons | 3601 | `src/ui/globals.css` |  |
| 123 | Small screens | 1529 | aucun : reste | résumé par page des largeurs, recoupe **Responsive** |
| 124 | Navigation | 63694 | `src/staff/staff-header.tsx`, `src/app/(staff)/layout.tsx` | et pages du journal d'audit, des fiches, coût des lectures ; voir le découpage fin |
| 125 | Login pages | 4202 | `src/staff/login-notice.tsx`, `src/staff/public-page-frame.tsx`, `src/app/login/` |  |
| 126 | Privacy policy | 3095 | `src/privacy-policy/`, `src/app/privacy/` |  |
| 127 | The support tickets' page | 3332 | `src/ticket-archives/`, `src/support-tickets/`, `src/app/(staff)/support-tickets/` |  |
| 128 | The reader | 2023 | `src/ticket-archives/` |  |
| 129 | The filters | 1331 | `src/ticket-archives/` |  |
| 130 | Served | 1174 | `src/ticket-archives/` |  |
| 131 | Window | 2338 | `src/ticket-archives/` |  |
| 132 | Accounts | 1384 | `src/ticket-archives/`, `src/records/resolve-accounts.ts` |  |
| 133 | Counts | 606 | `src/ticket-archives/` |  |
| 134 | What the staff see of the counts and of the rate limit | 1369 | `src/ticket-archives/` |  |
| 135 | What the staff see past three limits | 1973 | `src/ticket-archives/` |  |
| 136 | The search's rate limit | 2472 | `src/ticket-archives/`, `src/support-tickets/` |  |
| 137 | Wording | 1270 | aucun : reste |  |
| 138 | Dates | 2234 | aucun : reste | `src/ui/paris-time`, `src/ui/paris-day.tsx` |
| 139 | Buttons | 5924 | aucun : reste | principe des variantes ; détail par domaine, voir le découpage fin |
| 140 | Forms | 24666 | `src/blocked-words/`, `src/sanctions/`, `src/ui/toast.tsx` | voir le découpage fin |
| 141 | Keeping what was typed | 554 | aucun : reste |  |
| 142 | Errors in forms | 233 | aucun : reste |  |
| 143 | No browser validation | 290 | aucun : reste |  |
| 144 | Suspense fallbacks | 9231 | squelettes de chaque domaine, `src/ui/suspense-with-skeleton` | voir le découpage fin |
| 145 | Motion | 8416 | `src/ui/globals.css`, `src/ui/toast.tsx`, `src/ui/dialog-motion.ts` | voir le découpage fin |
| 146 | Avatars | 6931 | `src/ui/member-avatar`, `src/discord/member-avatar-url.ts`, `src/records/record-href.ts` | voir le découpage fin |
| 147 | Accessibility | 4096 | aucun : reste | niveau AA ; la liste des ratios va avec `src/ui/globals.test.ts` |
| 148 | Accessibility lint | 425 | `eslint.config.mjs` |  |

### Responsive

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 152 | (paragraphe) | 993 | aucun : reste | pointe vers `docs/responsive.md` |
| 154 | Breakpoints | 745 | aucun : reste |  |
| 155 | Navigation (#356) | 1119 | `src/staff/staff-header.tsx` |  |
| 156 | Touch targets (#357 for the shared controls, #358 to #362 for the pages) | 4476 | aucun : reste | règle des 44 px ; détail de `src/ui/` et de `src/staff/` |
| 157 | Type and fields (#357) | 1635 | `src/ui/` |  |
| 158 | Layout (#355) | 2014 | `eslint-rules/responsive-classes.mjs` | et principes de mise en page |
| 159 | Forms and filters (#359, #360) | 2107 | `src/ui/filter-*`, `src/audit-log/`, `src/records/` |  |
| 160 | Dialogs and sheets (#357) | 2506 | `src/ui/dialog.tsx`, `src/ui/sheet.tsx` |  |
| 161 | The blocked words (#358) | 1507 | `src/blocked-words/`, `e2e/blocked-words-touch.test.ts` |  |
| 162 | Lists (#360, #361) | 1076 | `src/audit-log/`, `src/records/` |  |
| 163 | The support tickets' page (#385) | 826 | `src/ticket-archives/` |  |
| 164 | Fixed to an edge (#356, #357) | 1149 | `src/staff/`, `src/ui/`, `src/app/layout.tsx` |  |
| 165 | Checks (#355) | 9580 | `e2e/responsive.test.ts` |  |

### Security

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 169 | (paragraphe) | 349 | plugin agent-workflow : reste |  |
| 171 | (paragraphe) | 475 | aucun : intro de section |  |
| 173 | The session | 1127 | `src/staff/` (session) |  |
| 174 | Its lifetime | 770 | `src/staff/` (session) |  |
| 175 | OAuth2 | 1972 | `src/staff/`, `src/discord/` (OAuth), `src/app/login/` |  |
| 176 | CSRF | 623 | aucun : reste |  |
| 177 | Headers | 2422 | `next.config.ts` |  |
| 178 | Rate limiting | 1027 | hors dépôt | pare-feu Vercel |
| 179 | The application's permissions | 6548 | hors dépôt | rôles et intents Discord ; touche chaque domaine qui lit un salon |
| 180 | Secrets | 845 | aucun : reste | `server-only`, `vitest.config.mts` |
| 181 | Personal data | 470 | aucun : reste | pointe vers `docs/personal-data.md` |
| 182 | CI secrets | 1004 | `.github/workflows/contract.yml` |  |
| 183 | Configuration | 1722 | `src/*/env.ts`, `next.config.ts` |  |
| 184 | Variables | 5313 | `src/*/env.ts`, `.env.example` |  |

### Monitoring

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 188 | (paragraphe) | 486 | aucun : intro de section |  |
| 190 | Logs and the audit log | 325 | aucun : reste |  |
| 191 | What is logged | 2046 | `src/monitoring/`, `src/proxy.ts` |  |
| 192 | What is never logged | 582 | aucun : reste | ce qui ne se journalise jamais |
| 193 | Log lines | 486 | `src/monitoring/` |  |
| 194 | Alerts | 1286 | `src/monitoring/` |  |
| 195 | What an alert says | 1257 | `src/monitoring/` |  |
| 196 | Sending | 3188 | `src/monitoring/` |  |
| 197 | `src/monitoring/` | 1750 | `src/monitoring/`, `src/instrumentation.ts` |  |
| 198 | Stacks | 383 | `src/monitoring/` |  |
| 199 | No uptime probe | 420 | `src/monitoring/` |  |
| 200 | The browser reports nothing | 199 | `src/monitoring/` |  |

### Code style

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 204 | (paragraphe) | 522 | aucun : intro de section |  |
| 206 | Prettier lays out | 771 | `prettier.config.mjs`, `.prettierignore` |  |
| 207 | shadcn/ui's style | 663 | `prettier.config.mjs` |  |
| 208 | Classes | 360 | `prettier.config.mjs` |  |
| 209 | Imports | 359 | `prettier.config.mjs` |  |
| 210 | Copied code | 1879 | `src/ui/` (composants copiés) |  |
| 211 | Enforcement | 2156 | `.claude/hooks/format-after-edit.mjs`, `.github/workflows/ci.yml` |  |
| 212 | Names | 965 | aucun : reste |  |
| 213 | Exports | 571 | aucun : reste |  |
| 214 | TypeScript | 566 | aucun : reste |  |
| 215 | Module size | 173 | aucun : reste |  |

### Warnings

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 219 | (paragraphe) | 369 | aucun : intro de section |  |
| 221 | ESLint | 894 | `eslint.config.mjs` |  |
| 222 | Type-aware lint | 1800 | `eslint.config.mjs` |  |
| 223 | TypeScript's options | 1129 | `tsconfig.json` |  |
| 224 | CI's output | 1400 | `.github/workflows/ci.yml` |  |
| 225 | pnpm | 550 | `.github/workflows/ci.yml` |  |
| 226 | The tests' console | 614 | `vitest.config.mts`, `test/` |  |
| 227 | The browser's console | 5551 | `e2e/fixtures.ts` |  |
| 228 | The runner | 499 | `.github/workflows/ci.yml` |  |
| 229 | Silencing | 243 | aucun : reste |  |
| 230 | Directives | 3453 | `scripts/check-comments.mjs`, `eslint.config.mjs` |  |
| 231 | Reasons | 618 | aucun : reste |  |

### Dependencies

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 235 | (paragraphe) | 382 | aucun : intro de section |  |
| 237 | What it covers | 451 | `package.json`, `pnpm-workspace.yaml` |  |
| 238 | Who and when | 640 | `.claude/skills/update-dependencies/` |  |
| 239 | Exact versions | 861 | `package.json`, `pnpm-workspace.yaml` |  |
| 240 | Release age | 1399 | `pnpm-workspace.yaml` |  |
| 241 | Majors | 584 | `package.json` |  |
| 242 | Checks | 732 | `package.json` |  |
| 243 | Docs that name a version | 792 | `.claude/skills/update-dependencies/` | et les citations de `CLAUDE.md` et des ADR |
| 244 | Holds | 513 | `.claude/rules/dependencies.md` |  |
| 245 | Node | 1300 | `package.json` |  |
| 246 | pnpm itself | 98 | `package.json` |  |
| 247 | Actions | 555 | `.github/workflows/` |  |
| 248 | Advisories | 1452 | `.github/workflows/ci.yml`, `pnpm-workspace.yaml` |  |
| 249 | One copy | 423 | `.github/workflows/ci.yml`, `package.json` |  |
| 250 | Transitive dependencies | 313 | `pnpm-lock.yaml` |  |
| 251 | Deprecated packages | 395 | `pnpm-lock.yaml` |  |
| 252 | The registry | 252 | `src/ui/` (composants copiés) |  |
| 253 | Adding a dependency | 520 | aucun : reste | avant tout `pnpm add` |
| 254 | Copying code from another project | 2333 | aucun : reste | `THIRD_PARTY_NOTICES.md` |
| 255 | The session's PR | 545 | `.claude/skills/update-dependencies/` |  |

### Delivery

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 259 | (paragraphe) | 443 | aucun : intro de section |  |
| 261 | The repository | 2019 | hors dépôt | réglages du dépôt GitHub, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` |
| 262 | Outside contributions | 681 | aucun : reste | pointe vers `docs/agents/issue-tracker.md` |
| 263 | CI | 1206 | `.github/workflows/ci.yml` |  |
| 264 | Caches | 795 | `.github/workflows/ci.yml` |  |
| 265 | The contract suite in CI | 1089 | `.github/workflows/contract.yml` |  |
| 266 | The rules of `main` | 1122 | hors dépôt | ruleset GitHub |
| 267 | Environments | 1170 | hors dépôt | Vercel, `.env.local` |
| 268 | Previews | 1621 | hors dépôt | Vercel |
| 269 | Production | 678 | hors dépôt | Vercel |
| 270 | Rollback | 505 | hors dépôt | Vercel |
| 271 | Scheduled workflows | 387 | `.github/workflows/` |  |
| 272 | The trial | 1202 | hors dépôt | historique du projet Vercel |

### Feedback loops

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 276 | Tests: `pnpm test` runs the tooling's tests, `node --test… | 449 | aucun : reste |  |
| 277 | Contract: `pnpm test:contract` runs the `DiscordApi` cont… | 1046 | aucun : reste | `vitest.contract.config.mts` |
| 278 | End to end: `pnpm test:e2e` runs Playwright over `e2e/*.t… | 392 | aucun : reste |  |
| 279 | Typecheck: `pnpm typecheck` runs `next typegen`, which wr… | 200 | aucun : reste |  |
| 280 | Lint: `pnpm lint`, ESLint with `eslint-config-next`'s Cor… | 1170 | aucun : reste | `eslint.config.mjs` |
| 281 | Build: `pnpm build` (`next build`), which type-checks aga… | 87 | aucun : reste |  |
| 282 | Comments: `pnpm check:comments`. | 35 | aucun : reste |  |
| 283 | Format: `pnpm format` lays out the repository with Pretti… | 175 | aucun : reste |  |
| 284 | Components: `pnpm exec shadcn add <component>` copies a s… | 740 | `src/ui/`, `components.json` |  |
| 285 | CI: `.github/workflows/ci.yml` runs the comment check, th… | 486 | aucun : reste | `.github/workflows/ci.yml` |

### Commits, PRs, issues

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 289 | Commit messages read `Area: what changed`, in English. | 57 | aucun : reste |  |
| 290 | A branch is named `<area>/<subject>`: the area of the com… | 456 | aucun : reste |  |
| 291 | The user is the sole author: commits carry no `Co-Authore… | 112 | aucun : reste |  |
| 292 | Only the maintainer, Gilles (`docs/agents/issue-tracker.m… | 698 | aucun : reste |  |
| 293 | Issues, PR descriptions and comments read like a teammate… | 111 | aucun : reste |  |
| 294 | A PR that only advances a ticket names it once, as `Part … | 227 | aucun : reste |  |
| 295 | Once a PR merges, delete its local branch with `git branc… | 676 | aucun : reste |  |

### Gotchas

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 299 | (paragraphe) | 990 | aucun : reste | index des règles de `.claude/rules/` |
| 301 | Under Git Bash, write a path inside a script as `C:/Users… | 149 | aucun : reste |  |
| 302 | A U+00A0 typed into `Write` or `Edit` can land as an ordi… | 467 | aucun : reste |  |
| 303 | Several sessions can share this folder: before switching … | 174 | aucun : reste |  |
| 304 | The hooks of `.claude/settings.json` need `pnpm install` … | 223 | aucun : reste |  |
| 305 | On Windows, `git worktree remove` fails, exit code 255 an… | 544 | aucun : reste |  |

### Issue tracker

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 311 | (paragraphe) | 208 | aucun : reste | écrit par `setup-matt-pocock-skills` |

### Triage labels

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 315 | (paragraphe) | 99 | aucun : reste | écrit par `setup-matt-pocock-skills` |

### Domain docs

| Ligne | Passage | Octets | Dossiers ou chemins | Remarque |
| ---: | --- | ---: | --- | --- |
| 319 | (paragraphe) | 97 | aucun : reste | écrit par `setup-matt-pocock-skills` |

## Découpage fin des passages transverses

Estimation, pas mesure du sens, pour les passages qui parlent de plusieurs domaines (`FINE_LINES`, dans le script) : chaque passage est coupé en phrases (au point suivi d'une majuscule, et au point-virgule suivi d'une minuscule), et chaque phrase va au domaine dont les mots-clés (`DOMAINS`) y reviennent le plus souvent. Le domaine est la fonctionnalité dont la phrase parle, pas le fichier qui la porte : une phrase de **The fake** sur les bannissements compte pour `src/sanctions/`, bien que le code soit dans `src/discord/fake-discord.ts`. Une phrase qui parle de deux domaines va à un seul, et les phrases de plusieurs centaines d'octets pèsent lourd : les tickets « Ce qui reste dans CLAUDE.md » et « La liste des règles scopées et leurs `paths:` » relisent ces passages au lieu de se fier aux chiffres.

### Ligne 90, Errors : Write results (8950 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/sanctions/` | 2995 |
| aucun domaine reconnu | 2892 |
| `src/blocked-words/` | 2274 |
| `src/staff/` | 626 |
| `src/ui/` | 122 |

### Ligne 91, Errors : Read failures (5445 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ticket-archives/` | 1469 |
| `src/blocked-words/` | 849 |
| `src/monitoring/` | 641 |
| `src/app/` (pages d'erreur) | 636 |
| `src/records/` | 613 |
| `src/support-tickets/` | 432 |
| aucun domaine reconnu | 327 |
| `src/discord/` | 273 |
| `src/game-log/` | 185 |

### Ligne 100, Testing : The fake (17069 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/sanctions/` | 7711 |
| aucun domaine reconnu | 3027 |
| `src/discord/` | 2878 |
| `src/support-tickets/` | 1051 |
| `src/audit-log/` | 637 |
| `src/ticket-archives/` | 317 |
| `src/bot-log/` | 308 |
| `src/records/` | 270 |
| `src/game-log/` | 236 |
| `src/staff/` | 196 |
| `src/monitoring/` | 185 |
| `src/blocked-words/` | 171 |

### Ligne 110, Testing : End to end (43495 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/staff/` | 8895 |
| `e2e/` (infrastructure) | 7613 |
| `src/sanctions/` | 7091 |
| `src/ui/` | 4971 |
| `src/audit-log/` | 4611 |
| aucun domaine reconnu | 3268 |
| `src/ticket-archives/` | 2357 |
| `src/blocked-words/` | 1859 |
| `next.config.ts`, `src/proxy.ts` | 648 |
| `src/records/` | 576 |
| `src/app/` (pages d'erreur) | 556 |
| `src/monitoring/` | 394 |
| `src/discord/` | 286 |
| `.github/` et Vercel | 152 |

### Ligne 120, Interface : `src/ui/` (9049 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ui/` | 4914 |
| `src/blocked-words/` | 1148 |
| `src/audit-log/` | 1050 |
| `src/game-log/` | 464 |
| `src/staff/` | 444 |
| aucun domaine reconnu | 390 |
| `src/sanctions/` | 365 |
| `src/ticket-archives/` | 244 |

### Ligne 121, Interface : Theme (34778 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ui/` | 7534 |
| aucun domaine reconnu | 7462 |
| `src/sanctions/` | 6011 |
| `src/records/` | 5215 |
| `src/staff/` | 4340 |
| `src/blocked-words/` | 1863 |
| `src/audit-log/` | 1206 |
| `e2e/` (infrastructure) | 1001 |

### Ligne 124, Interface : Navigation (63694 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/audit-log/` | 12323 |
| `src/staff/` | 11472 |
| aucun domaine reconnu | 10121 |
| `src/sanctions/` | 9638 |
| `src/ui/` | 6267 |
| `src/blocked-words/` | 4375 |
| `src/records/` | 4212 |
| `src/ticket-archives/` | 2189 |
| `src/game-log/` | 1372 |
| `src/discord/` | 806 |
| `src/privacy-policy/` | 358 |
| `next.config.ts`, `src/proxy.ts` | 297 |

### Ligne 139, Interface : Buttons (5924 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ui/` | 1598 |
| `src/sanctions/` | 1479 |
| `src/staff/` | 1231 |
| aucun domaine reconnu | 897 |
| `src/app/` (pages d'erreur) | 591 |
| `src/blocked-words/` | 105 |

### Ligne 140, Interface : Forms (24666 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/sanctions/` | 6765 |
| `src/blocked-words/` | 6742 |
| `src/ui/` | 6664 |
| aucun domaine reconnu | 2529 |
| `src/monitoring/` | 645 |
| `src/staff/` | 514 |
| `src/records/` | 496 |
| `e2e/` (infrastructure) | 219 |

### Ligne 144, Interface : Suspense fallbacks (9231 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ui/` | 3602 |
| `src/blocked-words/` | 1547 |
| `src/records/` | 1412 |
| `src/staff/` | 1011 |
| `src/ticket-archives/` | 921 |
| `src/support-tickets/` | 550 |
| aucun domaine reconnu | 159 |

### Ligne 145, Interface : Motion (8416 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ui/` | 5001 |
| `src/blocked-words/` | 890 |
| `src/staff/` | 785 |
| aucun domaine reconnu | 694 |
| `src/audit-log/` | 456 |
| `src/records/` | 323 |
| `e2e/` (infrastructure) | 230 |

### Ligne 146, Interface : Avatars (6931 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/records/` | 2350 |
| `src/staff/` | 1302 |
| `src/ui/` | 1079 |
| `src/sanctions/` | 787 |
| `src/audit-log/` | 741 |
| aucun domaine reconnu | 642 |

### Ligne 184, Security : Variables (5313 octets)

| Domaine estimé | Octets |
| --- | ---: |
| `src/ticket-archives/` | 1587 |
| `.github/` et Vercel | 881 |
| `src/sanctions/` | 521 |
| `src/monitoring/` | 514 |
| `src/discord/` | 468 |
| `src/game-log/` | 402 |
| aucun domaine reconnu | 394 |
| `e2e/` (infrastructure) | 268 |
| `next.config.ts`, `src/proxy.ts` | 125 |
| `src/staff/` | 76 |
| `src/bot-log/` | 41 |
