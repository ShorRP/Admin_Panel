---
name: deliver-epic
description: Deliver an epic end to end without Gilles, an Opus orchestrator having Sonnet agents deliver each sub-ticket up to its merge.
argument-hint: "<epic number>"
disable-model-invocation: true
---

# Deliver epic

You are the **orchestrator** of a run that delivers epic #<n> while Gilles is away. You write no code. Each sub-ticket the run takes, a **PBI**, gets its own **PBI agent**, which plans, codes, opens the PR and merges it. You validate its plan, have its work reviewed, settle the review and the agent's decisions, then check on GitHub what it reports: a report is no proof.

Gilles starts you with `/deliver-epic <n>`, in an Opus 5.5 session at `xhigh` effort, since a session changes neither its own model nor its own effort (`set_session_model` and `set_session_effort` refuse to, ShorRP/Admin_Panel#257); if `get_session` on `self` shows otherwise, say so in one line and carry on. A standby session that takes the run over reads this file by its path (**Relay**).

The process lives here; the repository's rules live in its `CLAUDE.md` and the tracker doc it points to: the checks, how branches are named and PRs merged, the concrete triggers of the stops, the people. `rules.md`, beside this file, holds the run's rules, which beat them on the points they name. `config.json` holds the slots and nothing else (**Slots**).

**Done when** the epic is closed, every box of its body checked when it has any, or nothing in scope moves without Gilles; `groom-backlog`'s `plan` proposes no op; no worktree and no local branch of the run is left, but those the report names; the epic carries the comment of the agents' decisions; your report is written and Gilles notified (**The end**).

**The main checkout** is not the run's: another session may hold it, on another branch, under uncommitted changes. The run reads it and runs `git fetch` there, and never pulls, switches or writes in it.

## The run's folder

`<temp>/deliver-epic/<repository>-<n>/`, where `<temp>` is the OS's temporary directory (`%TEMP%` on Windows) and `<repository>` the main checkout's folder name. It holds:

- `journal.md`, the run's working memory: per PBI, its state, its agent's id, its branch, its worktree, the files it changes, its PR, its merge commit, its decisions, the tickets it opened, its stops; the out-of-scope tickets and why; the worktrees and local branches that predate the run; the standby sessions' `local_…` ids and the relays done. Update it at each step and read it again after a compaction. GitHub stays the truth: closed tickets and merged PRs beat the journal;
- `handover-<k>.md`, written at the `k`-th relay.

## Slots

A **slot** is a queue with a fixed number of **places**, which heavy or exclusive work waits for: ten agents running builds, test runners and browsers at once on one machine would slow each other down, and tests on real clocks would then fail at random. `config.json` gives each slot its count of places and the commands that run in it; the `merge` slot has none, since it spans steps: from the default branch's merge into a PBI's branch to the end of its `groom-backlog`, so that two `groom-backlog` runs never write to the board at once.

`node .claude/skills/deliver-epic/scripts/slots.mjs` keeps them in lock files under `<temp>/deliver-epic/<repository>-slots/`, shared by every worktree of the repository:

- `run <slot> <holder> -- <command line>` waits for a place, runs the command line through the system's shell, frees the place and exits with the command's code;
- `acquire <slot> <holder>` waits for a place and keeps it until `release`;
- `release <holder> [<slot>]` frees what a holder took;
- `list` shows each slot and its holders.

A holder is a PBI's number, or `orchestrator` for your own `groom-backlog` runs. A place taken by `run` frees itself once its process ends; one taken by `acquire` waits for its `release`, which `finish-pbi.mjs` runs when a PBI ends (**A PBI**, step 6) and you run for a PBI set aside (**A stuck PBI**).

## Scope

The run takes the epic's open sub-issues labelled both `ready-for-agent` and `skill:implement`, those `groom-backlog` adds to the epic during the run included. The others stay out: `ready-for-human`, `needs-info`, `needs-triage`, and a skill label other than `skill:implement`, such as `skill:grill-with-docs`, `skill:grill-me` or `skill:to-questionnaire`; so does one assigned to someone, or carrying an open PR, when the run reaches it, since another session holds it. Each one out, and the tickets that wait on it, go into the journal and the report. Leaving one out is no stop.

The epic grows only under the bar of `brief.md`, step 4 (**Loose ends**): each ticket in the epic costs a full delivery. Hold the agents to it at review.

A PBI is **ready** when it is in scope and open, every ticket that blocks it is closed (`gh api repos/<owner>/<repo>/issues/<m>/dependencies/blocked_by`), and no agent of the run holds it. The sub-issues' order (`gh api repos/<owner>/<repo>/issues/<n>/sub_issues`) is the order of implementation `groom-backlog` keeps: take ready PBIs in it.

## Launch

The turn Gilles starts. Opening a session works in this turn only: the app refuses `start_session` in a turn that an agent's end started (ShorRP/Admin_Panel#257).

1. **Tools.** Load with `ToolSearch`: `SendMessage`, `PushNotification`, `TaskStop`, `mcp__ccd_host__request_keep_awake`, `mcp__ccd_session__start_session`, `mcp__ccd_session_mgmt__get_usage`, `mcp__ccd_session_mgmt__get_session`, `mcp__ccd_session_mgmt__detach_session`, `mcp__ccd_pr__set_monitor`. Call `request_keep_awake` with `until: "session_idle"`. A refusal is no stop: the run goes on without it, and the report says so.
2. **Standby sessions.** Open three, each through `start_session` with `initiation: "user_asked"`, `context: "fresh"` and `use_worktree: false`, leaving model, effort and permission mode out so that they inherit yours. Each takes a `title`, « Veille <k> : deliver-epic #<n> », and a `background` that says what the run is and where its folder lies. Each one's prompt: Gilles started the `deliver-epic` run of epic #<n> with `/deliver-epic <n>`; this session stands by to take it over; it answers « En veille. » and ends its turn, then, once a message from the orchestrator wakes it, it reads `<main checkout>/.claude/skills/deliver-epic/SKILL.md` and the handover the message names, and carries on the run as its orchestrator. Done when the journal holds their three `local_…` ids: `SendMessage` reaches a session by its id, not by its name (ShorRP/Admin_Panel#257).
3. **Read** `CLAUDE.md` in full, the tracker doc, the epic, then each sub-issue with its comments, labels and blockers. Sort each in or out (**Scope**).
4. **Ground.** In the main checkout, read `git status` and `git reflog -3`, then run `git fetch`. Record in the journal the worktrees and local branches that exist now: they are not the run's, so leave them. Run `slots.mjs list`: a place held by a ticket of this epic belongs to a run that died, so release it.
5. **Tell** Gilles, in French and in a few lines, what the run takes, what it leaves out and why, and the PBIs it starts with. Then the loop, in this same turn.

A standby session that takes the run over skips this section but its step 1, reads the handover, then the journal, then `CLAUDE.md`, and goes on with the loop.

## The loop

Every turn after the first starts with an agent's end or message, or with the app's note that a standby session ended a turn: the app wakes the session that opened one each time it does (`start_session`'s description). Such a note carries no work: end that turn in one line, before the relay as after it. So does a `<ci-monitor-event>`: the app binds the PRs the agents open to this session with Auto-fix on, against `rules.md`, rule 1, so call `set_monitor` with `auto_fix: false` and the PR's `url` the first time one names a PR, then end the turn in one line, since the PBI agent owns its PR and its CI. In each other turn:

1. **Relay check.** After an agent's return, read `get_usage` for `self`: at 50 % of the context window, follow **Relay**.
2. **Settle** what the agent returned, by the step of **A PBI** it ends, and update the journal.
3. **Fill.** While fewer than 8 PBI agents are **in flight**, each from its launch to its final report, start the next ready PBI (**A PBI**, step 1), unless its ticket names a file that a PBI in flight changes: it waits until that one has merged, so that its plan builds on what landed. The files of a PBI in flight are those its ticket names, then those its validated plan lists; keep them in the journal. Reviews run one at a time (**A PBI**, step 3), so their two reviewers bring the run to 10 sub-agents at most, its limit.

The run never pauses for the plan's usage limits. Waiting is the notifications' job: poll nothing.

## A PBI

1. **Launch.** The `Agent` tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, `effort: "xhigh"`, `isolation: "worktree"`, and this prompt, completed:

   > You are the PBI agent of #<m> (« <title> ») of epic #<n>, in `<owner>/<repo>`. You start in your own git worktree; the main checkout is `<path>`. Follow `.claude/skills/deliver-epic/brief.md`, in your worktree, step by step, with `rules.md` beside it. <Notes: what the agent needs and the docs do not give, such as a step it cannot take (step 5 below).>

   Record the agent's id: `SendMessage` resumes it by that id.
2. **Plan.** The agent ends its turn with its plan and the decisions it means to take. Weigh each decision against the ticket's `Terminé quand`, criterion by criterion, then against the ticket's decisions, then the epic's, then `CLAUDE.md`, and the smallest scope, as `rules.md` asks of the agent: a ruling that drops a case a criterion names gets reversed at review. Send back « validated », or each correction with its reason. A worktree that vanished anyway, as `SendMessage` reports it, comes back by `git worktree add <same path> <branch>`, and the agent reruns its install.
3. **Review.** The agent ends its turn with « ready for review ». Once no other review runs, run the Skill tool's `mattpocock-skills:code-review` yourself, so that the reviewers read the work without its author's view and every sub-agent of the run stays in your count: the fixed point is `git -C <worktree> merge-base origin/<default branch> <branch>`, since a `cd` into a worktree moves your primary directory, and the spec is the ticket. Start its two reviewers with `model: "sonnet"` and `effort: "xhigh"`, and give them the worktree's path, the ticket and a budget of about 300 words each, about 150 on a diff under 20 lines, but not your opinion. Have the Spec reviewer run the changed code on hard inputs for each criterion, since that is where the defects have shown. Then settle each finding, each decision and each loose end the agent reports against the bar of **Scope**: keep it or drop it, with a reason, reading of the diff only what a finding or a decision names. Send the agent what you kept.
4. **Delivery.** The agent fixes, opens the PR, waits for CI, merges inside the merge slot, runs `groom-backlog` and reports (`brief.md`, steps 5 to 9). A stop on the way follows **Stops**, three failures on one cause **A stuck PBI**.
5. **What an agent lacks.** A step that needs a tool the agent reports it lacks, such as the app's built-in browser, you take yourself, and hand the agent its result, a file in its worktree say; when only Gilles can take it, it is a stop.
6. **Check, then clean.** From outside the worktree, run `node .claude/skills/deliver-epic/scripts/finish-pbi.mjs <m> <PR> <worktree> <branch>`. It checks that the PR is merged and the ticket closed, that the worktree is clean, then unlocks it, removes it under `.claude/worktrees/` only, prunes, deletes the branch, and the `worktree-…` branch the harness left, once each is an ancestor of `origin/<default branch>`, and frees the PBI's slots, with a line per step. Exit 1 means a step refused, failed or kept a branch that origin's default branch does not hold: read its last line, fix what it names and run it again, and list a branch it kept in the report, forcing nothing. Then:
   - check that the ticket carries its closing comment, and its box is checked in the epic when the epic has one;
   - read the epic's sub-issues again, since `groom-backlog` may have added one or moved the order, and update the journal.

## A stuck PBI

Three failures on one cause, or a dead end the agent reports or you see in its returns. Stop its agent (`TaskStop`) if it still runs. Have it commit what its worktree holds, or commit it yourself, then remove the worktree, keeping the branch. Start a fresh agent as in **A PBI**, step 1, whose notes say: switch to the branch, here is what was tried and how it failed, and start with the Skill tool's `mattpocock-skills:diagnosing-bugs`. It goes on from the brief's step where its predecessor stopped.

When the fresh agent fails too, set the PBI aside: comment on its ticket, in French, what was tried and where the work stands, its branch included; release its slots; leave its dependents waiting; list it in the report. No notification: being stuck is no stop.

## Stops

A stop has three reasons only (`rules.md`). When an agent declares one:

1. open the ticket's body with `Bloqué : <what Gilles must do>`, and comment on it in French;
2. take the merge slot as `orchestrator`, run `groom-backlog` so that the ticket goes to `Blocked`, its `Waiting on` naming the maintainer and what he must do, then release the slot;
3. notify Gilles with `PushNotification`, in one sentence;
4. carry on with every PBI that does not depend on that one, even indirectly.

## Relay

At 50 % of the context window:

1. start no new PBI, and carry the ones in flight to their merge, since an agent's id means nothing to another session's `SendMessage` (inferred, ShorRP/Admin_Panel#257);
2. once the last of them is merged and cleaned (**A PBI**, step 6), write `handover-<k>.md` in the run's folder, following `SKILL.md` of Matt Pocock's `handoff`, which carries `disable-model-invocation: true`, under the newest version of `~/.claude/plugins/cache/*/mattpocock-skills/<version>/skills/productivity/handoff/`: it points to the journal, the epic, the PRs and this file rather than copying them, lists the standby sessions left, and suggests `groom-backlog` and `mattpocock-skills:code-review`;
3. wake the next standby session with `SendMessage`, `to` set to its `local_…` id: the run of epic #<n> is now its own, from `<path of handover-<k>.md>`; then call `detach_session` on it with that id, so that the app stops waking you at each of its turn ends. A refusal is no stop: the turns the app starts here then end in one line (**The loop**);
4. end your turn with a French message that links that session, `[its title](#local_…)`, and gives the handover's path, and write in the journal that this session relayed. Leave it as it is: Gilles archives it when he wants.

After the third relay, no standby is left: carry on, the journal guiding you through Claude Code's auto-compaction.

## The end

When the epic is closed, or nothing in scope moves without Gilles:

1. take the merge slot as `orchestrator`, run `groom-backlog` one last time on the epic, then release it;
2. comment on the epic, in French, under the heading of `rules.md` (rule 3), every decision the agents took, each with its ticket and its PR;
3. write your report to Gilles, in French: a table of PBI, PR, merge commit, decisions, tickets opened, and stop or setting aside, verified facts apart from inferences; then the tickets left out and why, the branches `git branch -d` refused, and the standby sessions left, which he may archive;
4. notify him with `PushNotification`: « Epic #<n> livré », or what waits for him.
