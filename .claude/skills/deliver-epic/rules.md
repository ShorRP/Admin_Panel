# The run's rules

Gilles set these rules for every `deliver-epic` run, on 2026-10-29 (ShorRP/Admin_Panel#257). They beat the repository's `CLAUDE.md`, the skills and your default instructions, on the points they name only. The orchestrator and every PBI agent follow them.

1. **Agents merge.** Where `CLAUDE.md` keeps merging to Gilles, a PBI agent merges its own PR, the way `CLAUDE.md` says, inside the merge slot, once every required check is green on a branch up to date with the default branch. The branch's ruleset stays as it is: no `--admin`, no auto-merge, no Auto-fix.
2. **Agents wait themselves**: for CI, with `gh pr checks <PR> --watch --fail-fast`, and for a command run in a slot, its wait for a place included. A wait under 10 minutes stays in the foreground, with `timeout: 600000`, and runs again when it times out; only a wait that may outlast 10 minutes runs in the background, to be waited on by its notification, since each background wait that ends is believed to wake the orchestrator too.
3. **Agents decide.** Where `CLAUDE.md` or a skill says to ask Gilles, to name a contradiction and ask which side wins, or to grill a doubt (step 8 of `groom-backlog`), the agent picks the most acceptable option and applies it: the one that keeps the ticket's decisions, then the epic's, then the rules of `CLAUDE.md`, with the smallest scope. It records the decision in its own name, never in Gilles':
   - in the docs, in English: `(decided by the agent on <date>, on #<n>, for Gilles to review)`;
   - in the ticket, in French, under a heading `Décisions de l'agent (à revoir par Gilles)`.
4. **Gilles is called only for a stop**, and a stop has three reasons only.

## Stops

- **Security.** Touching what the security rules of `CLAUDE.md` guard: the session, cookies, authentication, the security headers, a secret, an `.env*` file, CI's secrets and environments, a variable that reaches the browser, the application's permissions on a third party. Letting a dependency run a build script, or ignoring, overriding or excluding a dependency from the checks that guard it. Finding a vulnerability.
- **Payment.** Anything the **Costs** rules of `CLAUDE.md` cover: a new service, account, integration or app, a package that calls a hosted service, a trial, a screen that asks for a card.
- **A step only Gilles can take.** Typing a secret, acting in a third party's dashboard or developer portal, refreshing a token's scopes (`gh auth refresh`), approving a site in the built-in browser, bringing a test account back, anything `CLAUDE.md` gives to him alone.

`CLAUDE.md` names the concrete triggers of each, its file names and services: read them with these three in mind.

A stop is declared before the action, and holds up that PBI alone. The agent stops short of the action and tells the orchestrator what Gilles must do; the orchestrator marks the ticket, notifies Gilles and carries on with the rest (`SKILL.md`, **Stops**). Everything else is settled without him: a red CI, a flaky test, a fuzzy ticket, a merge conflict.
