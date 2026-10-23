---
name: groom-backlog
description: Reconcile the GitHub backlog with the work: settle the tickets the session touched, file its loose ends, then fix epics and their milestones, sub-issue and board order, labels, board Status, Priority, Waiting on, Size, blockers. Use after creating, editing, labelling, closing or re-parenting an issue; after opening or merging a PR; when starting work on an issue; after /to-tickets, /triage or /wayfinder publish; when an entry of docs/agents/open-questions.md is answered; before the final report of a session that changed the repo or leaves loose ends; or when asked to groom, sort or prioritize the backlog.
---

# Groom backlog

**Reconcile** the tracker with the work. First the backlog catches up with the session: the tickets it **touched** are closed, linked or commented, and its **loose ends** become tickets. Then the tracker follows `docs/agents/issue-tracker.md`, its single source of truth: plan, apply, plan again, until the plan is empty. The script derives every change that follows from a fact; you settle what takes judgment.

The script is `node .claude/skills/groom-backlog/scripts/backlog.mjs`, run from the repo root: `plan`, `apply <plan.json>`, `setup`, `snapshot`. `plan --merged <commit>` also relocates the `file:line` citations that merge moves, and `plan --citations` every citation that moved since it was written (**Moved citations**).

What the script applies that is specific to this repo sits in `config.json`, beside this file: the board's URL, the type labels, the milestones in order, the day closing comments became the rule, and the days before an assigned ticket goes stale. It mirrors `issue-tracker.md`: change both together.

## When

Once per burst of tracker writes: after the last one, before your final report. The `PostToolUse` hook in `.claude/settings.json` reminds you after each write; a single run at the end covers them all. A session that changed the repo or leaves loose ends runs it before its final report too, tracker writes or not.

Two moments run at once:

- **Starting work on an issue.** Assign yourself (`gh issue edit <n> --add-assignee @me`), then reconcile so it moves to In progress.
- **A PR just merged.** Its issue closes and gets its closing comment, and the tickets it blocked open up. Run `git fetch`, then plan with `--merged <merge commit>`: the open tickets whose cited lines it moves get their relocation comment.

The approval loop of `/to-tickets` waits until it publishes.

**Scope.** The plan's ops are mechanical and cover the whole board: apply them all, once you have read its relocation comments (**Moved citations**). Scope bounds the judgment work:

- **Delta**, the default: the issues you wrote to or filed, the touched tickets, their epic, their blockers and the tickets they block, and the epic's other children.
- **Sweep**, when asked or when a delta run shows drift elsewhere: every open issue.

## Steps

1. **Harvest.** Settle what this session's work means for the backlog: each touched ticket with **Touched tickets** below, then each loose end with **Loose ends**, then the structure the work calls for with **Structure**. Done when each touched ticket, loose end and structure candidate has the outcome its section gives it, or waits as a doubt for step 8.
2. **Plan.** `backlog.mjs plan` saves a snapshot (your backup) and a plan file, prints both paths, then lists the ops and the judgment items. A `setup` item means a project field is missing: run `backlog.mjs setup` once, then plan again.
3. **Judge.** Settle each in-scope judgment item with **Judgment items** below, as ops appended to the plan file's `ops` array (see **Ops**). Done when each one has an op, or a line for your report saying why it stays.
4. **Look past the script.** For each in-scope issue, run the checks of **Beyond the script** and append their ops.
5. **Apply.** `backlog.mjs apply <plan.json>` re-reads the ids, saves another backup, and prints `ok` or `FAIL` per op. A `FAIL` about a missing scope stops the run: ask the user to run `gh auth refresh -s project` (it opens a browser), then apply again.
6. **Verify.** Plan again. Done when `ops` is empty and every judgment item left is one your report explains. Otherwise, back to step 3.
7. **Report**, in French: a table of ticket / change / why, verified facts apart from inferences; the backup path; the judgment items left and why; the Sizes you set or changed, each with its old value; the touched tickets you linked, closed or commented; the tickets filed from loose ends, and the loose ends dropped and why; the epics you created.
8. **Grill the doubts.** When doubts wait, call the Skill tool for `grilling` and end the report with its first round: one question per doubt, with its facts and the recommended answer **Touched tickets**, **Loose ends** or **Structure** gives it. Ask the rounds that follow until the PO or the maintainer each doubt belongs to (`issue-tracker.md`, **People**) has settled it, carry out what they approve, then run again from step 2. Done when no doubt waits.

## Touched tickets

A **touched ticket** is a ticket the session's work bears on, still open or closed by a PR the session merged: one named in the conversation, a commit, the branch or a PR, and one whose body cites a path the session changed. For the second kind, list the paths with `git diff --name-only` over the session's commits and working tree, and search the bodies and comments that `backlog.mjs snapshot` saves.

Compare what each one asks with what the work did, and settle it by the first case that fits. **Advanced** and **Changed facts** share one comment when both apply.

1. **Delivered**: every criterion of its `Terminé quand` holds, or of its body when it has none. When an open PR carries the work, add `Closes #<n>` to its description (`gh pr edit`), and post the closing comment once the PR merges; when the work is already on `main`, close it as completed with the closing comment (`gh issue close <n> --comment`).
2. **Obsolete**: the work removed what it asks about, and a check proves it (a `grep` that finds nothing, a test, a command output). Close it as not planned, with a comment giving the proof.
3. **Advanced**: some of its criteria hold. Comment what is done and what remains, each with its source, and tick the boxes of its `Checklist` that the work completed. An epic closes only once every sub-issue is closed and every box of its body is checked (`issue-tracker.md`, **Project board**).
4. **Changed facts**: something it states no longer holds: a moved `file:line` (once merged, the plan relocates those: **Moved citations**), a refuted `Faits vérifiés`. Comment the new facts and leave the body as is, apart from a cleared outside blocker (**Outside blockers**).
5. **Unaffected**: the work only passes near it. Leave it.

A case you cannot prove from facts waits as a doubt for step 8, with the case you would pick as the recommended answer.

Whatever its case, each open touched ticket gets its Size set again, as for `outdated-size` (**Judgment items**): a comment can move its scope without editing its body, which the planner cannot see.

The **closing comment** is the ticket's record of what was delivered, in French by `issue-tracker.md`. It opens with `Livré par #<PR>` and the merge commit, then gives, each fact with its source: what changed and where (the main paths), how each `Terminé quand` criterion was proved (test counts, the check that went red), the decisions taken on the way, and what remains, linking each ticket filed for it. A ticket carries one closing comment: read its comments before writing.

## Loose ends

A **loose end** is work this session found and left undone. The conversation is the primary source; `git diff` and `git log` over the session's commits back it with facts. Look for:

- a problem spotted near the work, or a doc contradiction too large for the change (`CLAUDE.md`, **Facts and docs**);
- a `Terminé quand` criterion that a PR closing its ticket leaves unmet;
- a `TODO`, a skipped test or a workaround the diff adds;
- a code-review finding left unfixed;
- an entry this session added to `docs/agents/open-questions.md`.

Settle each one in this order:

1. **Covered.** Search as **Duplicates** does (**Beyond the script**), issues closed as not planned included. An open issue that covers it gets a comment with the new facts, when it gains any. A closed one rejected it: drop it, citing the issue.
2. **Clear.** Its facts carry a source (`file:line`, commit, command output) and you can write its `Terminé quand` without choosing for a PO or the maintainer: file it. `gh issue create`, in French by `issue-tracker.md` (**Writing an issue in French**): an area prefix, `Part of #<epic>` when it serves one, `Faits vérifiés` and `Inférences`, `Terminé quand`, `Hors périmètre`. One type label, and `ready-for-agent`, or `ready-for-human` when it takes a human (a decision, an access, a purchase).
3. **Doubt.** Anything else waits for the grilling of step 8. What the doubt is about picks the recommended answer:
   - whether it deserves a ticket, or what done means → file it, fold it into #n, or drop it;
   - a term missing from `GLOSSARY.md` or clashing with it → settle the term with `domain-modeling` during the grilling, as `/triage` does, then file it;
   - bigger than one ticket, too foggy to scope, or waiting on a teammate's answer → the user-run skill `CLAUDE.md` maps it to (**How we work**), run while this conversation still holds the context;
   - a module with no good seam → `/improve-codebase-architecture`.

Written from a branch, a ticket or a comment cites that branch's lines. Each of its lines that cites a `file:line` names the pushed commit those lines are read on (``Branche `feature/login`, commit db69a39.``), so the plan reads them there rather than on the day's `main` (**Moved citations**).

## Structure

A **structure candidate** is a milestone, a label or an epic that the tracker lacks and the session's work calls for. Its signals: a word a PO or the maintainer used to sort or sequence the work; a sequence of steps a PO or the maintainer described; new tickets sharing something no field expresses.

- **Epic**: create it yourself whenever **Epic membership** (**Beyond the script**) calls for one.
- **Milestone**: open tickets wait on a step in time that no milestone names yet, such as Shor's launch or an event the staff announce.
- **Label**: a filter needs a distinction that the title prefix, the milestone, Priority and the epics leave unexpressed (`issue-tracker.md`, **Labels**).

A milestone or a label changes the tracker's conventions, so it waits as a doubt for step 8. Its recommended answer is one of two:

- the new milestone or label: its name, its description, its place among the existing ones, and the tickets it takes;
- the field that already carries the distinction, when one fits.

Once a PO accepts a milestone, or the maintainer a label, create it, record it in `issue-tracker.md` and `config.json` in a PR of its own, then give it to its tickets.

## Judgment items

- **`missing-type`**: read the ticket and add one type label (`issue-tracker.md`, **Labels**). Epics carry one too.
- **`missing-priority`**: set `Priority` by the definitions in `issue-tracker.md`, **Project board**. The milestone and the epic's other children are evidence.
- **`missing-size`**, **`outdated-size`**: read the ticket up to its `Terminé quand` and set `Size` by the scale in `issue-tracker.md`, **Project board**. `outdated-size` flags a Size set before the ticket's body last changed: set it again even when the estimate stays, since `apply` dates every Size it sets and that date settles the item. Epics take none.
- **`missing-next-ticket`**: an open epic the plan does not close has no open child, against the rule of `issue-tracker.md` (**Project board**, Status), so the board shows neither its next step nor the right priority. That step is the first unchecked line of its checklist, which the item quotes, or, with none, what the epic's goal still lacks: settle it as a loose end (**Loose ends**), under the epic. A line whose ticket already closed only needs its box checked. Once the step has its ticket, put the `#n` at the head of its checklist line with `gh issue edit` (`- [ ] #12 : Mots interdits : …`). An epic whose goal looks met waits as a doubt, with closing it as the recommended answer.
- **`waiting-on`**: a `needs-info` ticket. Read its latest comments and write, in French, who is awaited and for what (`staff : IDs du serveur et du rôle staff`).
- **`state-conflict`**: keep the state the latest comment supports, remove the others.
- **`wontfix-open`**: close as not planned, unless a comment says why it stays open.
- **`stale`**: in progress, no PR, no activity for `staleDays` (`config.json`). Report it; leave it as is.
- **`unlinked-pr`**: when the PR delivers a ticket, add `Closes #<n>` to its description (`gh pr edit`). A PR that closes nothing stays as is.
- **`unresolved-citation`**: a `file:line` the content alone cannot place. Settle it by **Moved citations**.
- **`missing-closing-comment`**: a ticket closed as completed since `closingCommentSince` (`config.json`, the day this tracker started) has none. Two kinds keep their record elsewhere: an epic in its children, a wayfinder ticket in its resolution comment (`issue-tracker.md`, **Wayfinding operations**). It was closed outside a session, a PR merged on GitHub for one, so no delta names it: settle it whatever the scope. Write its closing comment (**Touched tickets**) from the merged PR and its commits, in French by `issue-tracker.md`, as a `comment` op. `gh issue view <n> --json closedByPullRequestsReferences` names the PR, `gh pr view <PR> --json mergeCommit,commits,body` gives the rest.

## Moved citations

Tickets cite their facts as `file:line`, and a merge that adds or removes lines moves them. With `--merged` or `--citations`, the plan reads every citation of the open tickets, body and comments, on the commit its line names (`commit db69a39`), or else on the `main` of the day it was written, an edited text dating each citation by the edit that added it. A commit named for another reason, such as the one that introduced a passage, therefore goes on a line without citations. A list `file:a,b-c` counts one citation per line and range. It follows the lines through the diffs, and gives each ticket whose lines moved one `comment` op, each line checked identical at its new place. A later citation of the same lines, an arrow from the old lines to the new, or an arrow to « supprimé », settles the older ones, so a run never proposes a move twice. A `--merged` run only reports the citations its merge moves or breaks, those of a file it adds included: read on a branch's commit, they are followed to `main`; read on the day's `main`, they come out absent. One already lost before the merge waits for `--citations`.

- **Read each relocation comment against its ticket before applying.** The excerpt closing each line is the first line found there. A citation written against another tree (a branch, another ticket's line numbers) without naming its commit reads the wrong lines: drop that line from the op and settle the citation as below.
- **`unresolved-citation`**: rewritten, found more than once, deleted, absent from the commit it was read on, or naming a commit this clone lacks (`git fetch` first). Read the lines and find where they went. Add `` - `file:a-b` → `:c-d` `` and what changed to the ticket's `comment` op, or to a new one, so the next plan reads the old lines as relocated. A passage gone for good gets `` - `folder/file:a-b` → supprimé `` (or `supprimée`, `supprimés`, `supprimées`) and what removed it: the plan reads no lines for it, so its numbers may name other lines today. The arrow covers the one citation or list `file:a,b-c` right before it, and the folder is needed once the file is deleted.

## Beyond the script

- **Epic membership.** An orphan joins the epic whose goal it serves (`addSubIssue`). Create an epic when three or more open tickets share a goal without one, or when `/to-tickets` publishes a batch from one spec; an epic has two children at least. To create one: `gh issue create` with the `epic` label and a type label, a French title with its area prefix, a body stating the goal; then `addSubIssue` for each child.
- **Order within a milestone and a priority.** The script sorts by milestone, then by Priority, and keeps the existing order inside each. There, put first what unblocks the most tickets, then the cheap fixes before the large efforts. Use `moveSubIssue` and `moveItem`. When an epic's body lists its children in order, update it in the same run.
- **Milestone.** Give each ticket the milestone of the step that waits on it (`issue-tracker.md`, **Milestones order the work**): `MVP`, or none when no step does. The script rolls an epic's milestone up from its children, never a ticket's.
- **Title.** A French area prefix: `Connexion : …`, `Mots interdits : …`.
- **Outside blockers.** A ticket blocked by something outside the tracker (a staff answer, loanspac, the VPS admins, an entry of `docs/agents/open-questions.md`) opens its body with `Bloqué : …`; one blocked by another ticket gets `addBlockedBy`. When an outside blocker clears, rewrite the line as `Débloqué : …`.
- **Duplicates.** For a ticket created in this burst, search the open issues for the same concept, by glossary term (`GLOSSARY.md`) as well as by wording. Close the newer one as not planned only when both ask for the same thing, with a comment pointing to the other; otherwise link them in a comment.

## Guardrails

- Before moving or relabelling what looks misplaced, find why it is there: a `## Décisions` section, a comment, `issue-tracker.md`. A recorded decision of a PO or the maintainer beats these rules: report the conflict instead of changing it.
- Delete nothing: no issue, label or field.
- Comment, in French (`issue-tracker.md`, **Writing an issue in French**), only when a ticket enters `Blocked` or `needs-info` (what is awaited, from whom), when a Priority it already had changes, or when the session's work brings it new facts or closes it (**Touched tickets**, **Loose ends**). A first Priority, a Size and mechanical changes go without comment.

## Ops

JSON objects in the plan's `ops` array, applied in order. `why` is optional and shows in the log.

| `op` | Fields |
|---|---|
| `addToProject` | `issue` |
| `setField` | `issue`, `field` (`Status`, `Priority`, `Waiting on`, `Size`), `value` (`null` clears it) |
| `addLabel`, `removeLabel` | `issue`, `label` |
| `ensurePartOf` | `issue`, `parent` |
| `addSubIssue` | `parent`, `child` (moves it from another parent) |
| `moveSubIssue` | `parent`, `child`, `after` (an issue number, or `null` for first) |
| `moveItem` | `issue`, `after` (an issue number, or `null` for the top) |
| `addBlockedBy`, `removeBlockedBy` | `issue`, `blocker` |
| `closeIssue` | `issue`, `reason` (`COMPLETED` or `NOT_PLANNED`) |
| `setMilestone` | `issue`, `milestone` (a title, or `null`) |
| `setTitle` | `issue`, `title` |
| `comment` | `issue`, `body` |
