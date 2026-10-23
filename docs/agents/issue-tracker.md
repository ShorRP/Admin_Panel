# Issue tracker: GitHub

Issues for this repo live as GitHub issues in `ShorRP/Admin_Panel`, on the **Admin Panel** project board of the ShorRP organization (https://github.com/orgs/ShorRP/projects/1). Use the `gh` CLI for all operations.

The board covers this repository only. What the panel needs from ShorBot, from the staff or from the VPS admins is an outside blocker (**Blockers** below); an issue goes to `ShorRP/ShorBot` only with loanspac's agreement, since it is their repository.

## People

Roles as Gilles stated them on 2026-10-23:

- **The POs**, Lyra-Gates (`Lyra-Gates`) and Anaisenkit, decide what the panel does and in what order: the MVP's content, a Priority the rules below leave open or one they want changed, new milestones, and what done means for a feature. Either of them can decide. When they disagree, they settle it between themselves, and the ticket waits with `PO : arbitrage` in **Waiting on**. Anaisenkit also brings the staff's needs, and develops on Shor too.
- **The maintainer**, Gilles (`PothieuG`), decides how: the stack, the ADRs, Sizes, labels and the tracker's other conventions. Only the maintainer merges into `main` (`CLAUDE.md`, **Commits, PRs, issues**).
- **loanspac** (`LoanSpac`), also called Spar or Spac, develops ShorBot and owns its API (ADR 0003).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). The child's body still opens with `Part of #<parent>`, which skills read.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Writing an issue in French

Issues are written in French: title, body and comments. Everything else (code, docs, commits, PRs) stays English (`CLAUDE.md`, **Language**).

- **Verbatim**: code spans and blocks, paths and `file:line`, identifiers, commands, URLs, SHAs, `#n` refs, label names, and every quoted string (UI text, a source passage), whatever its language.
- **Domain terms** follow `GLOSSARY.md`. In French prose: Blocked word → « mot interdit », Audit log → « journal d'audit », Admin Panel → « le panel », Discord server → « le serveur Discord », Warning → « avertissement », Staff, Bot and Whitelist keep their names.
- **Titles** keep an area prefix, in French: `Connexion : …`, `Mots interdits : …`, `Journal d'audit : …`, `Avertissements : …`, `Discord : …`, `Hébergement : …`, `Produit : …`, `Outillage : …`, `Tests : …`, `CI : …`, `Dépôt : …`, `Docs : …`.
- **Facts and inferences** sit under `Faits vérifiés` and `Inférences`, marked `[F]` / `[I]`. Other recurring headings: `Questions ouvertes`, `Terminé quand`, `Hors périmètre`, `Décisions`, `Checklist`.
- **Parsed text stays English**, because skills read it back: the `Blocked by: #<n>` and `Part of #<n>` lines, the `commit <sha>` that names the tree of a line's `file:line` citations (groom-backlog, **Moved citations**), and the wayfinder map's Notes / Decisions-so-far / Fog headings.

## Organizing the tracker

- **Epics.** A parent issue groups its children as native GitHub sub-issues and carries the `epic` label. The epic takes no triage state; its children do. List the epics with `gh issue list --label epic`.
- **Blockers.** Record a blocker between two issues as a native dependency (the command is under **Wayfinding operations**), not only in prose. Prose is for blockers outside the tracker, such as a staff answer, loanspac, the VPS admins or an open question: the body opens with `Bloqué : …`, which the board's Status reads. When that blocker clears, the line becomes `Débloqué : …`.
- **Open questions** stay in `docs/agents/open-questions.md`. A ticket blocked by one quotes it, and takes `needs-info` only when nothing in it can move until the answer arrives.
- **Milestones order the work.** One milestone so far (decision of 2026-10-23):
  - `MVP`: what the staff need to use the panel for the first time. That is the staff login, the blocked words, the audit log, and what puts them in service: the panel's Discord application, the Vercel project and the first production deploy.

  A ticket tied to no step, such as tooling, tests, debt or a feature after the MVP, takes no milestone. An epic takes the earliest milestone among its open children. A new milestone waits for a step the staff announce, such as Shor's launch.
- **Labels.** Each issue carries one type label: `enhancement`, `bug` or `documentation`. Unless it is an epic, it also carries one triage state, from the five roles in `triage-labels.md`. Epics carry `epic` instead of a triage state, and a type label like any issue. There are no area labels: the title prefix already names the area. No label repeats a milestone either.
- **The planner mirrors these lists.** `.claude/skills/groom-backlog/config.json` holds the board's URL, the type labels and the milestones in order: change it together with this file.
- **Board workflows.** The project's built-in workflows live under its **⋯** menu → **Workflows**. The maintainer turns them on or off by hand: the GraphQL API reads their `enabled` flag, and its only mutation for them is `deleteProjectV2Workflow` (`gh api graphql -f query='{__schema{mutationType{fields{name}}}}'`, 2026-10-23). The states below were read on 2026-10-23 with `gh api graphql -f query='query{organization(login:"ShorRP"){projectV2(number:1){workflows(first:30){nodes{name enabled}}}}}'`. That query lists only the workflows ever configured, and shows neither the auto-add filter nor the Status a workflow sets: those, and the state of the three it omits (Code changes requested, Code review approved, Auto-archive items), come from the maintainer's settings. So `enabled` alone proves little: on 2026-10-23 the auto-add filter held a stray `label:` qualifier, and no new or edited issue reached the board for over an hour while the API showed the workflow on. Once the filter was fixed, `github-project-automation` added #25 three seconds after an edit of its body; a label change a minute after the fix had added nothing, for a reason left unchecked.
  - **On**: Auto-add to project, on `ShorRP/Admin_Panel` with the filter `is:issue is:open`; Auto-add sub-issues to project; Item closed (`Done`); Pull request linked to issue (`In progress`); Item reopened (`Todo`). GitHub Free allows a single auto-add workflow (https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically, read 2026-10-23), so its filter alone decides what the board holds: issues, and no pull requests. `Done` and `In progress` match **Status** below, except that a linked PR also marks a blocked ticket `In progress` until `groom-backlog` puts it back to `Blocked`; a PR rarely closes a blocked ticket. A reopened issue gets `Todo`, which `groom-backlog` then corrects, rather than keeping `Done`.
  - **Off**: Item added to project fires on every new issue, so it would set `Todo` on each blocked or untriaged one, those `groom-backlog` files included; and since workflows run asynchronously, it could overwrite the Status `groom-backlog` has just set (inferred, not observed). Auto-close issue: Status follows from facts and never causes them, and this workflow would close a ticket dragged to `Done`, with no closing comment. Pull request merged, Code changes requested and Code review approved act only on pull requests, and the board holds none. Auto-archive items: the board holds some twenty items, and `backlog.mjs` reads an issue's board items with `includeArchived: false`, so how it would treat a reopened archived issue is unchecked.
- **Project board.** The `groom-backlog` skill (`.claude/skills/groom-backlog`) keeps the rules below true.
  - **Status** follows from facts. `Done`: closed. `Blocked`: someone other than the agent must act first, because of `needs-triage`, `needs-info`, an open blocker, or a body opening with `Bloqué : …`. `In progress`: assigned, or an open PR closes it. `Todo`: the rest, `ready-for-human` included. An issue the board has just added has no Status until `groom-backlog` runs (**Board workflows**). An epic follows its children: `In progress` once one is closed or in progress, `Blocked` when every open one is, and `Done` when all are closed and its body holds no unchecked task-list box (`- [ ]`), at which point it closes too. Until it is done, an epic keeps an open child for its next step; `groom-backlog` flags an epic without one.
  - **Waiting on**, a text field, says in French who or what a `Blocked` ticket waits for: `#12`, `mainteneur : triage`, `PO : contenu du MVP`, `staff : IDs du serveur et du rôle staff`. It stays empty otherwise.
  - **Priority.** `P0`: production broken, a security hole exposed, or a ticket that blocks two or more open tickets. `P1`: needed for the MVP, or the next step of an active epic. `P2`: later, comfort, or debt without a deadline. An epic takes the highest priority of its open children. A PO may set another Priority; agents keep it and comment when they change one.
  - **Order.** The board and each epic's sub-issues sort by milestone, then by Priority, with tickets without a milestone last. Within a milestone and a priority, what unblocks the most comes first, then cheap fixes before large efforts.
  - **Size** estimates the effort to reach the ticket's `Terminé quand`, decisions and review included. `XS`: a few lines, under an hour. `S`: one file or a handful of strings, half a day. `M`: a module and its tests, or a scoped investigation, one or two days. `L`: several modules or a migration, several days. `XL`: over a week, which usually means the ticket should become an epic. Agents set it on a ticket that has none, never on an epic, and never overwrite one: the maintainer corrects it.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far. The answer opens with `## Décisions`, `## Réponse` or `## Résolution`: it is the ticket's record, in place of the closing comment `groom-backlog` asks of a delivered ticket.
