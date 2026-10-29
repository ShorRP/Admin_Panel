# Hydromel mockup captures

These captures are visual references for the redesign of #221, taken from the mockup Gilles made with Claude Design (#221). They are no specification: the decisions are on #221 and its tickets, and where a capture and a ticket differ, the ticket wins. The mockup contradicts `CLAUDE.md` in many points, which the tickets settle one by one, so the repository holds its captures rather than the mockup itself, whose generated runtime would fail `pnpm check:comments` (#223). The captures show, for one, the counter « 0/60 » in the blocked word's field, the staff filter « Tout le staff » of the audit log and the copy button beside a record's ID, all three of which #221 refuses.

## The captures

Each screen or state has a light capture, `-light.png`, and a dark one, `-dark.png`. The screens are the options of the mockup's `screen` property (M:618), and the page is the panel's page that the screen redesigns.

| Screen            | State                                                               | Page                | Light                                                      | Dark                                                     |
| ----------------- | ------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Mots interdits    |                                                                     | `/blocked-words`    | [`blocked-words-light.png`](blocked-words-light.png)       | [`blocked-words-dark.png`](blocked-words-dark.png)       |
| Journal d’audit   |                                                                     | `/audit-log`        | [`audit-log-light.png`](audit-log-light.png)               | [`audit-log-dark.png`](audit-log-dark.png)               |
| Modération        | the search « ly », which finds three accounts                       | `/records`          | [`records-light.png`](records-light.png)                   | [`records-dark.png`](records-dark.png)                   |
| Fiche             | a member, « Lyra »                                                  | `/records/{userId}` | [`record-member-light.png`](record-member-light.png)       | [`record-member-dark.png`](record-member-dark.png)       |
| Fiche             | a member timed out until 30 oct. 2026, 08:47, « Hrolf Main-de-Fer » | `/records/{userId}` | [`record-timed-out-light.png`](record-timed-out-light.png) | [`record-timed-out-dark.png`](record-timed-out-dark.png) |
| Fiche             | a banned account, « Lysanne »                                       | `/records/{userId}` | [`record-banned-light.png`](record-banned-light.png)       | [`record-banned-dark.png`](record-banned-dark.png)       |
| Fiche             | an account absent from the Discord server, « outsider »             | `/records/{userId}` | [`record-absent-light.png`](record-absent-light.png)       | [`record-absent-dark.png`](record-absent-dark.png)       |
| Déconnexion       |                                                                     | `/login/logged-out` | [`logged-out-light.png`](logged-out-light.png)             | [`logged-out-dark.png`](logged-out-dark.png)             |
| Accès refusé      |                                                                     | `/login/refused`    | [`login-refused-light.png`](login-refused-light.png)       | [`login-refused-dark.png`](login-refused-dark.png)       |
| Connexion échouée |                                                                     | `/login/failed`     | [`login-failed-light.png`](login-failed-light.png)         | [`login-failed-dark.png`](login-failed-dark.png)         |

## Where they come from

- The mockup, `Panel Shor.dc.html`, sits in the handoff folder that Claude Design produced for Gilles, under `handoff/maquette/`, on his machine and outside the repository (#221). The tickets cite its lines as `M:n`, the line `n` of that file.
- Its `palette` property was on « Hydromel » and its `navLayout` on « Sidebar », their defaults (M:618).
- It ran in the Claude app's built-in browser, the one place #223 lets it run, served by a local static server, in a window emulated at 1440 × 900 px. Light and dark come from the mockup's own toggle. Each PNG is a render of the page's DOM at scale 1, over the page's full height, and is 1425 px wide when the page has a vertical scrollbar (the agent session that ran #221's tickets, which took them on 2026-10-29). Each is 1440 × 900 px, but `audit-log` at 1425 × 1475 and `record-member` at 1425 × 1043 (the PNGs' headers, 2026-10-29).
- The accounts, the staff members, the blocked words and the dates are the mockup's sample data (M:627-660, M:673).
- In the left column of the login pages, the mockup leaves the slot of its illustration empty (`auth-art`, M:32), which #236 does not take.
