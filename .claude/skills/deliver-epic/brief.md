# The PBI agent's brief

You deliver one ticket, your PBI, from its plan to its merge, for the orchestrator of a `deliver-epic` run. The orchestrator validates your plan, has your work reviewed and checks what you report. You answer it by ending your turn with the report a step asks for, and it resumes you with `SendMessage`.

`rules.md`, beside this file, holds the run's rules, its stops included, which beat `CLAUDE.md` on the points they name.

- **Your worktree** is where you work, and only there: `git rev-parse --show-toplevel` gives its path. Several sessions share the repository, so you never write in the main checkout, never switch its branch, and never touch another worktree.
- **Slots.** Your holder name is your ticket's number. A command line that starts with a command `config.json`, beside this file, lists under a slot, whatever its arguments, runs through that slot, as does any other way of running the same tool, such as `pnpm exec playwright test` for `pnpm test:e2e`: `node .claude/skills/deliver-epic/scripts/slots.mjs run <slot> <n> -- <command line>`. A command that may outlast 2 minutes, the wait for its slot included, runs in the background, and you wait for its notification.
- **No sub-agents.** You start none: the orchestrator counts every sub-agent of the run, and runs your review itself.
- **Scratch files** you write outside the worktree, such as a commit message, carry your ticket's number in their name (`commit-msg-<n>.txt`): the agents of a run share the orchestrator's scratchpad, and during ShorRP/Admin_Panel#221's run one agent committed with a message another had left there.

## Steps

1. **Read.** `rules.md`; `CLAUDE.md` in full, its **Gotchas** included; the tracker doc it points to; your ticket and its comments (`gh issue view <n> --json number,title,body,labels,comments`); the decisions of the epic. Done when you can quote each criterion of the ticket's `Terminé quand`.
2. **Prepare.** Install the dependencies as `CLAUDE.md` says. Rename your branch, `worktree-agent-…`, the way `CLAUDE.md` names branches. Assign yourself the ticket (`gh issue edit <n> --add-assignee @me`); `groom-backlog` waits for the merge slot.
3. **Plan.** End your turn with your plan, before any code: the files you will change, the tests and the seams they sit at, the docs you will update, each decision you expect to take with the option you would pick and why, and any stop you foresee. The orchestrator validates or corrects it.
4. **Implement**, by the skill that the ticket's `skill:*` label names. `skill:implement` names `implement`, which carries `disable-model-invocation: true`, so the Skill tool refuses it: read its `SKILL.md` in the plugin cache, under the newest version of `~/.claude/plugins/cache/*/mattpocock-skills/<version>/skills/engineering/implement/`, and follow it, through the Skill tool's `tdd`, without its `code-review` step, which the orchestrator runs. Update the docs in the same change, as `CLAUDE.md` says. Done when each criterion of `Terminé quand` is proved, by a test that went from red to green or by a command's output, every check that `CLAUDE.md` runs before a PR passes in the worktree, and the work is committed as `CLAUDE.md` says, unpushed. End your turn with « ready for review »: the branch, the worktree's path, each criterion with its proof, your decisions, and what you spotted and left.
5. **Fix after the review.** Fix each finding the orchestrator sends you, run the checks again and commit. A finding that turns out wrong once you look: fix the rest and say why in your report.
6. **Open the PR.** Push the branch. Write the body with the Skill tool's `mattpocock-skills:pr`, in the language `CLAUDE.md` gives PRs, with `Closes #<n>` and a section on your decisions, then run `gh pr create`.
7. **Wait for CI**, as `rules.md` says (rule 2). When it is red, read the failed log (`gh run view <run> --log-failed`) and fix. A failure that survives a first look, a flaky test included, goes through the Skill tool's `mattpocock-skills:diagnosing-bugs`: a check is never rerun before its failure is understood. Three failures on one cause, or a dead end: end your turn saying so, and the orchestrator takes it from there.
8. **Merge, inside the merge slot.** Take it with `slots.mjs acquire merge <n>`, in the background, and wait for its exit. Then:
   1. merge the default branch into yours (`git fetch`, then `git merge origin/<default branch>`), settle the conflicts, run again the checks the merge touches, and push;
   2. wait for CI as in step 7. A red that takes more than a quick fix: release the slot (`slots.mjs release <n> merge`), fix it, and take the slot again from 1;
   3. merge the PR as `rules.md` (rule 1) and `CLAUDE.md` say, and note the merge commit;
   4. run `git fetch`, then the Skill tool's `groom-backlog`, planned with `--merged <merge commit>`: the ticket's closing comment, its box checked in the epic, a ticket for each thing you spotted and left, and each doubt settled by its recommended answer, recorded as your decision (`rules.md`, rule 3). Done when `plan` proposes no op;
   5. release the slot: `slots.mjs release <n> merge`.
9. **Report**, briefly: the PR, the merge commit, the link to the closing comment, the tickets you opened, your decisions, and what remains. Leave the worktree and the local branch: the orchestrator removes them.
