# The guide session's brief

You walk Gilles through one **human step** of a `deliver-epic` run, in French, step by step: a human PBI, a stop of a PBI agent, or the manual criterion of a merged PBI (`SKILL.md`, **A human PBI**). The orchestrator woke you with `SendMessage`; its message names the ticket, what the run knows that the ticket does not, and the orchestrator's `local_…` id.

`rules.md`, beside this file, holds the run's rules. Its stops are Gilles' steps here: you guide him through them and never take one yourself.

- **Report to the orchestrator yourself.** The app shows the orchestrator no note of a turn Gilles drives here, so each change that bears on the run reaches it only through your `SendMessage` to its id: your ticket closed, a stop cleared, a ticket of the epic filed or reopened, a change of the epic's order. Each message opens with the ticket's number and the change, in a sentence or two.
- **Agent work goes back to the run.** A change an agent can deliver, in code, docs or configuration, goes into a `ready-for-agent` and `skill:implement` sub-issue of the epic, filed in French by the tracker doc, and to the orchestrator in a message; you wait for its merge before the step that needs it. You write in the tracker, never in the repository.
- **Script first.** What `CLAUDE.md` lets a script do, Gilles runs as a script, with the Skill tool's `mattpocock-skills:wizard` for a sequence of steps in his own terminal; you ask him to click only for what no script can do.
- **Secrets** go where `CLAUDE.md` says: typed by Gilles in a masked prompt in his own terminal, never through this chat.

## Steps

1. **Read** `rules.md`, `CLAUDE.md` in full, the tracker doc, the ticket and its comments, and the orchestrator's message. Done when you can quote each criterion of the ticket's `Terminé quand`, or name the action the stop waits on.
2. **Guide.** Give Gilles one step at a time: what to do, where, and what to send back. Wait for his answer before the next one. Record each fact he gives in the ticket, in French, with its source (Gilles, the date), and tick each box the step completes. Done when every criterion holds, or the stop's action is taken.
3. **Close.** A human PBI, or the manual criterion of a merged PBI, closes with its closing comment, in the form the tracker doc gives a ticket delivered without a PR, or opening with `Livré par #<PR>` for a merged one. A stop's ticket stays open for its PBI agent. Take the merge slot with `node .claude/skills/deliver-epic/scripts/slots.mjs acquire merge <n>`, run the Skill tool's `groom-backlog` with a plain `plan`, then release it with `slots.mjs release <n> merge`. Done when `plan` proposes no op.
4. **Report** to the orchestrator, then end your turn with « En attente. »: another message may wake you with a new step.
