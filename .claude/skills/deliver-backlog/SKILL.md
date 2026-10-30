---
name: deliver-backlog
description: Deliver the backlog's implementable tickets without Gilles, one at a time in board order, an Opus orchestrator giving each to its own Opus agent up to its merge.
disable-model-invocation: true
---

# Deliver backlog

You are the **orchestrator** of a run that delivers the backlog while Gilles is away. You write no code. You take the tickets the run covers, the **PBIs**, one at a time in the board's order, and give each to a fresh **PBI agent**, which implements it, has it reviewed, merges it and runs `groom-backlog`. When it reports, you check on GitHub what it says, since a report is no proof, clean up and take the next.

Gilles starts you with `/deliver-backlog`, in an Opus 5.5 session at `xhigh` effort, since a session changes neither its own model nor its own effort (ShorRP/Admin_Panel#257); if `get_session` on `self` shows otherwise, say so in one line and carry on.

The process lives here; the repository's rules live in its `CLAUDE.md` and the tracker doc it points to. `.claude/skills/deliver-epic/rules.md` holds the run's rules, which beat them on the points they name. They hold here as they stand, but for the merge slot, since this run takes no slots: one PBI agent at a time, as Gilles asked on 2026-10-30, each starting from the tip the last one merged. The review lives in the PBI agent too, so a PBI costs you little context, and the journal and GitHub carry you through Claude Code's auto-compaction with no standby session.

**Done when** the queue says `next: none` right after a last `groom-backlog` whose `plan` proposes no op; the main checkout is on its default branch, clean and up to date, with no worktree and no local branch of the run left, but those the report names; the recap ticket is filed; your report is written and Gilles notified (**The end**).

## The run's folder

`<temp>/deliver-backlog/<repository>/journal.md`, where `<temp>` is the OS's temporary directory (`%TEMP%` on Windows) and `<repository>` the main checkout's folder name. The journal is the run's working memory: the PBI in flight, its agent's id, its branch and its worktree; per PBI delivered, its PR, its merge commit, its decisions, the findings it dropped, the tickets it opened; the PBIs stopped or set aside; the worktrees and local branches that predate the run. Update it at each step and read it again after a compaction. GitHub stays the truth: closed tickets and merged PRs beat the journal.

## The queue

`node .claude/skills/deliver-backlog/scripts/queue.mjs [--skip <n>]...`, run from the main checkout, reads the board in about 15 s and prints a few lines: `next:`, the first ready PBI or `none`; `ready:`, how many; then the tickets it leaves out, under `set aside:`, `waiting:` and `held:`.

The run covers every open ticket labelled both `ready-for-agent` and `skill:implement`, epics out, those `groom-backlog` files during the run included. A PBI is **ready** when the board's rules make it `Todo`. It **waits** on an open blocker or a body that opens with `Bloqué : …`, and another session **holds** it when it is assigned or an open PR closes it. Each `--skip` names a PBI the run set aside (**Taking over**). A ticket left out is no stop: it goes into the report.

## Launch

1. **Tools.** Load with `ToolSearch`: `PushNotification`, `TaskStop`, `mcp__ccd_host__request_keep_awake`, `mcp__ccd_session_mgmt__get_session`, `mcp__ccd_pr__set_monitor`. Call `request_keep_awake` with `until: "session_idle"`. A refusal is no stop: carry on, and the report says so.
2. **Ground.** In the main checkout, read `git status` and `git reflog -3`, then `git pull --ff-only`. Read `rules.md`.
3. **Journal.** A `journal.md` already there is a run that ended early: read it, and settle its PBI in flight by what GitHub shows, through **A PBI**, step 3. Otherwise create it, with the worktrees and local branches that exist now: they are not the run's, so leave them.
4. **Tell** Gilles, in French and in a few lines, what the queue prints. Then the loop, in this same turn.

## The loop

Every turn after the first starts with the PBI agent's end or with a `<ci-monitor-event>`. Waiting is the notifications' job: poll nothing. The run never pauses for the plan's usage limits.

- **A `<ci-monitor-event>`.** The app binds the PRs the agents open to this session, with Auto-fix on, against rule 1. Call `set_monitor` with `auto_fix: false` and the PR's `url`, then end the turn in one line: the PBI agent owns its PR and its CI.
- **The agent's end.** Settle it (**A PBI**, step 3), then take the next PBI.

## A PBI

1. **Pick.** Run the queue, with a `--skip` for each PBI set aside. At `next: none`, go to **The end**.
2. **Launch.** Run `git pull --ff-only` in the main checkout, so that the worktree is cut from the default branch's tip. Then the `Agent` tool: `subagent_type: "general-purpose"`, `model: "opus"`, `effort: "xhigh"`, `isolation: "worktree"`, and this prompt, completed:

   > You are the PBI agent of #<m> (« <title> »), in `<owner>/<repo>`. You start in your own git worktree; the main checkout is `<path>`. Follow `.claude/skills/deliver-backlog/brief.md`, in your worktree, step by step. <Notes: only what the docs do not give, such as the branch and the step of **Taking over**.>

   Record the PBI and its agent's id in the journal, then end the turn in one line, in French, that names the PBI and how many are ready behind it.

3. **Settle** what the agent returned:
   - its report of a delivery: go on to step 4;
   - a stop: **Stops**;
   - three failures on one cause, or a dead end: **Taking over**;
   - no report, as after an error, a usage limit or a closed app: when its PR is merged and its ticket closed with its closing comment, go on to step 4, and otherwise **Taking over**.
4. **Check.** From the main checkout, each of these must hold; what does not goes to **Taking over**, as an agent that died:
   - `gh pr view <PR> --json state,mergeCommit --jq '[.state, .mergeCommit.oid]'` gives `MERGED` and a commit;
   - `gh issue view <m> --json state,stateReason,comments --jq '[.state, .stateReason, ([.comments[].body | select(startswith("Livré par"))] | length)]'` gives `CLOSED`, `COMPLETED` and `1`.
5. **Clean.**
   - `git -C <worktree> status --porcelain`, which must be empty, then `git worktree unlock <worktree>` when it is still locked, then `git worktree remove <worktree>`. On Windows, it fails with « Filename too long » in `node_modules`, as it did five times out of five in ShorRP/Admin_Panel#257's run: remove the folder through its `\\?\` path, `Remove-Item -LiteralPath '\\?\<worktree>' -Recurse -Force` in PowerShell, the path written in full, since the tool refuses a variable there, then `git worktree prune`;
   - `git branch -d <branch>`. A refusal means unmerged work: look at what it holds, force nothing, and list it in the report;
   - `git fetch --prune`, `git pull --ff-only`, and update the journal.

## Taking over

An agent that died, or a PBI stuck on three failures on one cause or a dead end. Stop its agent (`TaskStop`) if it still runs. Commit what its worktree holds, when it still exists, then remove the worktree, keeping the branch. Start a fresh agent as in **A PBI**, step 2, whose notes give the branch to switch to, the step of the brief to go on from, and what was tried and how it failed. For a stuck PBI, they also say to start with the Skill tool's `mattpocock-skills:diagnosing-bugs`.

When a stuck PBI's fresh agent fails too, set it aside: comment on its ticket, in French, what was tried and where the work stands, its branch included; `gh issue edit <m> --remove-assignee @me`; add it to the journal's `--skip`s; list it in the report. No notification: being stuck is no stop.

## Stops

A stop has three reasons only (`rules.md`). When an agent declares one:

1. open the ticket's body with `Bloqué : <what Gilles must do>`, comment on it in French, its branch included, and `gh issue edit <m> --remove-assignee @me`;
2. commit what its worktree holds, then remove the worktree, keeping the branch;
3. run `groom-backlog`, so that the ticket goes to `Blocked`, its `Waiting on` naming the maintainer and what he must do;
4. notify Gilles with `PushNotification`, in one sentence;
5. take the next PBI: the queue now leaves out that ticket and those it blocks.

## The end

1. Run `groom-backlog`, then the queue again: a ready PBI sends you back to **A PBI**.
2. File the recap: `gh issue create`, in French by the tracker doc, titled `Outillage : revoir les décisions du run deliver-backlog du <date>`, with `documentation` and `ready-for-human`, its body listing under the heading of `rules.md` (rule 3) every decision the agents took and every finding they dropped, each with its ticket and its PR. A run with none files none. Run `groom-backlog` again for that ticket.
3. Write your report to Gilles, in French: a table of PBI, PR, merge commit, tickets opened, and stop or setting aside, verified facts apart from inferences; then the link to the recap, what the queue still leaves out and why, the branches `git branch -d` refused, and a refused `request_keep_awake`.
4. Notify him with `PushNotification`: « Backlog livré », or what waits for him.
5. Rename `journal.md` to `journal-<date>.md`, so that the next run starts anew.
