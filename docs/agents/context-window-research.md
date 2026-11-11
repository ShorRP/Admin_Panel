# Keeping an agent's context complete and small

Research for a generic, end-of-session "context hygiene" workflow for Claude Code projects, with an appendix that applies it to this repository. Written 2026-11-05 against Claude Code docs read that day; the session ran Claude Opus 5.5.

## How to read this file

Every claim carries one of three marks:

- **[source key]**: verified in the primary source listed under **Sources**, read on 2026-11-05. A quote is in quotation marks.
- **[obs]**: observed in this repository or on this machine by the command named next to it, run on 2026-11-05 at commit `01b47ee`.
- **(inferred)**: a conclusion drawn from verified facts, not checked against a source or a trial.

### Sources

| Key        | Source                                                                                                                                                                               |
| :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[mem]`    | https://code.claude.com/docs/en/memory                                                                                                                                               |
| `[ctx]`    | https://code.claude.com/docs/en/context-window                                                                                                                                       |
| `[feat]`   | https://code.claude.com/docs/en/features-overview                                                                                                                                    |
| `[large]`  | https://code.claude.com/docs/en/large-codebases                                                                                                                                      |
| `[bp]`     | https://code.claude.com/docs/en/best-practices (the engineering post https://www.anthropic.com/engineering/claude-code-best-practices answers `308 Permanent Redirect` to this page) |
| `[skills]` | https://code.claude.com/docs/en/skills                                                                                                                                               |
| `[hooks]`  | https://code.claude.com/docs/en/hooks                                                                                                                                                |
| `[sub]`    | https://code.claude.com/docs/en/sub-agents                                                                                                                                           |
| `[cmd]`    | https://code.claude.com/docs/en/commands                                                                                                                                             |
| `[how]`    | https://code.claude.com/docs/en/how-claude-code-works                                                                                                                                |
| `[model]`  | https://code.claude.com/docs/en/model-config                                                                                                                                         |
| `[costs]`  | https://code.claude.com/docs/en/costs                                                                                                                                                |
| `[cache]`  | https://code.claude.com/docs/en/prompt-caching                                                                                                                                       |
| `[ce]`     | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents (published 2025-09-29)                                                                             |
| `[as]`     | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills (published 2025-10-16)                                                                   |
| `[spec]`   | https://agentskills.io/specification                                                                                                                                                 |
| `[sbp]`    | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices                                                                                                     |
| `[tok]`    | https://platform.claude.com/docs/en/build-with-claude/token-counting                                                                                                                 |
| `[steer]`  | https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more (dated 2026-06-18)                                                                                |
| `[wfa]`    | `C:\Users\gille\.claude\plugins\cache\claude-plugins-official\mattpocock-skills\1.3.1\skills\productivity\writing-for-agents\SKILL.md` and `SKILL-MECHANICS.md` beside it            |

## Key findings

1. Only three things are always in context: the CLAUDE.md files of the launch directory and its ancestors (with everything they `@import`), `.claude/rules/` files without `paths:`, and the first 200 lines or 25 KB of auto memory's `MEMORY.md` [mem]. Skill names and descriptions are always listed too, within a budget [skills]. Everything else loads on demand.
2. `@path` imports save nothing: "Imports help you organize a long file but don't reduce its context cost, because imported files load together with the CLAUDE.md that imports them" [mem]. Unscoped rules save nothing either: they "are loaded at launch with the same priority as `.claude/CLAUDE.md`" [mem].
3. The official size target is under 200 lines per CLAUDE.md [mem] [feat] [costs] [steer]. Line count is a weak proxy when lines are long: this repository's CLAUDE.md has 347 lines and 474,066 bytes, its longest line 59,851 characters [obs].
4. In this repository the first request of a session carried 245,149 input tokens [obs], of which the CLAUDE.md is estimated at about 159,000 (inferred, from a regression over 34 sessions). Every general-purpose subagent loads the same CLAUDE.md again [sub]; this project's transcripts hold 109 such subagents, the latest starting at 226,226 tokens [obs].
5. Path-scoped rules and nested CLAUDE.md files are the reliable way to keep area-specific knowledge out of the window: they load when Claude reads, writes or edits a matching file [mem]. They fail silently when no file is touched, when their YAML does not parse (the rule then loads as unscoped, always), when they exceed a per-file limit (truncated), and after compaction until the next matching file access [mem] [ctx].
6. A pointer in CLAUDE.md to a doc is the weakest mechanism: Claude "sees `AGENTS.md` only if it decides to open the file" [mem], and the same holds for any doc a sentence points to (inferred). Its reliability is the pointer's wording [wfa].
7. No hook event lets Claude work after a session ends: `SessionEnd` has no decision control and a 1.5 s default timeout [hooks]. End-of-session work is either a slash command the human runs, a `Stop` hook gated so it fires rarely, or a `SessionEnd` measurement surfaced by the next `SessionStart` [hooks] (the last two combinations inferred).
8. Claude Code already ships part of the audit: `/doctor` proposes trims of derivable CLAUDE.md content and offers to migrate the rest "into skills and nested `CLAUDE.md` files", and `/doctor prompt-audit` reports outdated or conflicting instructions without editing [skills] [mem]. A custom skill adds what they lack: a budget, history extraction, and a ledger that proves every removed unit landed somewhere reachable.

## 1. What loads when

### 1.1 Table

| What                                                      | When it enters context                                                                                                     | How much                                                                                                                                                                      | After compaction                                                                                  | Source          |
| :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :-------------- |
| System prompt, tool definitions, MCP tool names           | Session start                                                                                                              | MCP: "Tool names and server instructions"; "Full JSON schemas stay deferred"                                                                                                  | Still apply                                                                                       | [feat] [ctx]    |
| CLAUDE.md and CLAUDE.local.md of the launch dir and above | Launch                                                                                                                     | The whole file, "as long as the file is 4 MiB or smaller"; over 4 MiB it loads none of it                                                                                     | Project-root CLAUDE.md is "Re-injected from disk"                                                 | [mem] [ctx]     |
| Files reached by `@path` imports                          | With the file that imports them                                                                                            | Whole; recursive imports up to "a maximum depth of four hops"                                                                                                                 | With their parent                                                                                 | [mem]           |
| `.claude/rules/*.md` without `paths:`                     | Launch, "with the same priority as `.claude/CLAUDE.md`"                                                                    | Whole                                                                                                                                                                         | "Re-injected from disk"                                                                           | [mem] [ctx]     |
| `.claude/rules/*.md` with `paths:`                        | When Claude uses "the Read, Write, or Edit tool on a matching file", or views one with a Bash read such as `cat` or `head` | Whole, up to a per-file limit: 40,000 characters on a 200K window, 150,000 on a 1M window for models after Opus 4.6 and Sonnet 4.6; past it only the start, with a note       | Summarized away; reloaded "on demand"                                                             | [mem] [ctx]     |
| CLAUDE.md in a subdirectory of the launch dir             | "once Claude reads, writes, or edits another file in that subdirectory"                                                    | Same per-file limit as path-scoped rules                                                                                                                                      | Summarized away; reloaded on demand                                                               | [mem] [ctx]     |
| Auto memory `MEMORY.md`                                   | Launch                                                                                                                     | "The first 200 lines of `MEMORY.md`, or the first 25KB, whichever comes first"; topic files only when Claude reads them                                                       | "Re-injected from disk"                                                                           | [mem] [ctx]     |
| Skill listing (model-invocable skills)                    | Session start                                                                                                              | Every name; each description plus `when_to_use` "truncated at 1,536 characters"; the listing's budget "scales at 1% of the model's context window", dropping least-used first | Rebuilt and re-injected (v2.1.304 or later)                                                       | [skills] [ctx]  |
| Skill with `disable-model-invocation: true`               | Only when the human invokes it                                                                                             | Nothing until then: "Description not in context"                                                                                                                              | n/a                                                                                               | [skills] [feat] |
| Skill body                                                | When invoked by `/name` or by Claude                                                                                       | Whole `SKILL.md`, which "stays there across later turns"; linked files only when read                                                                                         | Re-attached, "keeping the first 5,000 tokens of each", 25,000 tokens in all, oldest dropped first | [skills] [as]   |
| Skills in a subdirectory's `.claude/skills/`              | "the first time Claude reads or edits a file in that subdirectory"                                                         | Listing entry                                                                                                                                                                 | n/a                                                                                               | [skills]        |
| Hook output                                               | When a hook returns text                                                                                                   | `additionalContext` and stdout "capped at 10,000 characters"; past it a file path and a 2,000-character preview                                                               | Hook text from earlier turns is summarized; `SessionStart` hooks with matcher `compact` run again | [hooks] [ctx]   |
| Subagent                                                  | When spawned                                                                                                               | Its own window: its prompt, the task message, "every level of the CLAUDE.md hierarchy the main conversation loads, including ... project rules", git status; no auto memory   | n/a                                                                                               | [sub]           |
| Built-in Explore and Plan subagents, `omitClaudeMd: true` | When spawned                                                                                                               | Without CLAUDE.md; a subdirectory's CLAUDE.md and matching path-scoped rules still load when they touch files there                                                           | n/a                                                                                               | [sub]           |

### 1.2 Token implications

- CLAUDE.md "is delivered as a user message after the system prompt", sent with every request [mem]. Prompt caching bills its re-read at the cached rate while the cache is warm; CLAUDE.md sits in the "Project context" layer, which changes when a "Session starts, or after `/clear` or `/compact`" [cache]. So a large CLAUDE.md is paid at full write price once per session, per `/clear`, per compaction and per subagent, then at the cached rate on every turn (inferred from [cache]).
- Each subagent builds its own cache: "Its first request doesn't read the parent's cache" [cache]. This session's subagent opened with 226,224 tokens written to cache and 0 read [obs: usage fields of `~/.claude/projects/C--Dev-Pero-Admin-Panel/a54f6304-…/subagents/agent-a00867a3604c91203.jsonl`].
- Size costs attention as well as money: "every line in it takes a little of Claude's attention on every task, whether it's relevant or not" [bp]; "Longer files consume more context and reduce adherence" [mem]; context rot means "the model’s ability to accurately recall information from that context decreases" as it grows [ce].
- Editing the project-root CLAUDE.md mid-session "does not invalidate the cache, but the edit also doesn't apply"; it loads on the next `/clear`, `/compact` or restart [cache]. An end-of-session edit therefore takes effect in the next session, which is also when it can be measured (inferred).
- Compaction keeps the project-root CLAUDE.md and unscoped rules, but path-scoped rules and nested CLAUDE.md files "load into message history ... so compaction summarizes them away"; "If a rule must persist across compaction, drop the `paths:` frontmatter or move it to the project-root CLAUDE.md" [ctx].
- Window size: Opus 4.7 and later "run with the 1M window by default" and compact "at about 967K tokens by default" [model].

### 1.3 Measured in this repository

- CLAUDE.md: 474,066 bytes, 73,708 words, 347 lines, longest line 59,851 characters, 51 lines over 2,000 characters [obs: `wc -c`, `wc -w`, `wc -l`, `awk 'length>2000'`].
- The first request of this session carried 245,149 input tokens: 2 uncached, 188,566 written to cache, 56,581 read from cache, for a first user message of 494 characters [obs: the `usage` of the first assistant entry of `a54f6304-f2fa-45cf-b580-05578bdfd881.jsonl`; that transcripts hold `usage` is observed, not documented].
- Across 34 main sessions on Opus 5.5 whose CLAUDE.md measured 124,020 to 474,066 bytes (its size at each session's time, from `git log -- CLAUDE.md` and `git cat-file -s`), first-request tokens grew by 0.336 tokens per byte of CLAUDE.md, intercept 80,857, R² 0.956 [obs: a throwaway Node script in the session scratchpad]. Read as a cost model, the current CLAUDE.md costs about 159,000 tokens and everything else about 81,000 (inferred: the regression also absorbs anything else that grew over those 13 days, such as skills and MCP servers). 0.336 tokens per byte, about 3 bytes per token, fits the note that models from Claude Opus 4.7 on produce "approximately 30 percent more tokens" for the same text [tok] (inferred).
- With the 967K compaction point of [model], about 16 % of the usable window is CLAUDE.md and about 25 % is spent before the first word of work (inferred arithmetic).

## 2. Mechanisms that shrink always-loaded context, ranked

Ranked by how reliably the moved knowledge still reaches Claude when a task needs it. "Saves" is what leaves the always-loaded set.

| Rank | Mechanism                                          | Saves                                          | Trigger                                                         | Reliability of the trigger                                    |
| :--- | :------------------------------------------------- | :--------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------------ |
| 1    | Enforcement: hook, deny rule, test, CI, lint rule  | The rule's whole text                          | Harness event or a check that fails                             | Deterministic [bp]                                            |
| 2    | Delete what the repo already says                  | Everything deleted                             | Claude reads the code it works on                               | High for what Claude would look up anyway [bp]                |
| 3    | Path-scoped rule (`.claude/rules/*.md` + `paths:`) | The rule until a matching file is touched      | Read, Write, Edit, Bash read of a matching file                 | Deterministic once a file is touched [mem]                    |
| 3    | Nested CLAUDE.md in a subdirectory                 | The file until a file in its folder is touched | Read, write or edit of a file in the folder                     | Same as above [mem]                                           |
| 4    | Hook that injects context when relevant            | Everything but the hook's own config           | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` | Deterministic event, but the script decides relevance [hooks] |
| 5    | Model-invoked skill                                | Body; the description stays                    | Claude matching the description, or `/name`                     | Depends on the description's wording [skills] [wfa]           |
| 6    | User-invoked skill (`disable-model-invocation`)    | Everything                                     | The human types `/name`                                         | Depends on the human remembering it [wfa]                     |
| 7    | Doc behind a pointer sentence                      | The doc minus the pointer                      | Claude decides to open it                                       | Depends on the pointer's wording [mem] [wfa]                  |
| 8    | ADR, commit message, PR, ticket, git history       | Everything                                     | Claude searches for the why                                     | Low unless a pointer or a task sends it there (inferred)      |
| n/a  | `@path` imports, unscoped rules                    | Nothing                                        | Launch                                                          | Always loaded [mem]                                           |

### 2.1 Enforcement instead of instruction

- **What it is.** "If something has to happen every time, make it a hook, a deny rule, or a managed setting. `CLAUDE.md` is for guidelines, and Claude is allowed to decide a guideline doesn't apply" [bp]. Tests, typecheck, a `Stop` hook and CI are the deterministic form of "When it's done" [bp].
- **When it fires.** On its event, "without Claude deciding"; context cost "Zero unless the hook returns output" [feat].
- **Failure modes.** A hook is maintained code and "will occasionally fire when it shouldn't"; "If you ever find yourself at forty of them, most are probably preferences" [bp]. A `prompt` or `agent` hook "asks _another model_ to decide, so it isn't deterministic either" [bp]. A rule enforced by a test still needs its _why_ somewhere: the test's name and the commit message (inferred).
- **Keeps knowledge?** Yes, as an executable check. The CLAUDE.md line can go, or shrink to the command that runs the check, which [bp] calls "the single most useful line in your `CLAUDE.md`".

### 2.2 Deleting what the code, config or tests already say

- **Rule.** "Only write down what Claude can't find by reading the repo"; the test is "Could it find this by reading the code? Would it actually go and look? If both are yes, leave it out" [bp]. "Describe your architecture and file layout in `CLAUDE.md`" is listed under advice you can stop following [bp]. `/doctor` "cuts content Claude can derive from the codebase, such as directory layouts, dependency lists, and architecture overviews, and keeps pitfalls, rationale, and conventions that differ from tool defaults" [mem].
- **Vocabulary.** A document that restates the environment is a **cache**, which earns its load "only when the lookup is expensive"; "Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses" [wfa].
- **Failure mode.** Deleting a fact whose lookup is expensive (spread over many files, or only visible by running something) makes Claude rediscover it each session [bp]. The second question, "would it actually go and look?", is the guard.

### 2.3 Path-scoped rules

- **When it loads.** On Read, Write or Edit of a matching file, or a Bash read such as `cat` or `head` on a single file [mem]. Grep and Glob are not in that list, so a search that never opens a file is inferred not to load the rule.
- **Patterns.** Relative to the directory that holds the rule's `.claude` folder; glob syntax; brace expansion bounded at 1,000 patterns per rule; a `[` that cannot be read as a bracket expression makes that pattern invalid [mem]. Paths with `(` or `)`, such as Next.js route groups, are not mentioned by the docs, so they should be avoided or checked with an `InstructionsLoaded` log (inferred).
- **Failure modes, all from [mem] and [ctx] unless marked.**
  - No matching file is touched: the rule never loads. Tasks that do not open files (planning, writing a ticket, answering a question) miss it (inferred).
  - A brand-new file: the rule arrives with the Write that creates it, after Claude chose its content (inferred from "loads when Claude uses ... Write").
  - YAML that does not parse: "Claude Code ignores the frontmatter and loads the rule as if it had no `paths`", which silently puts it back in the always-loaded set.
  - A file over the per-file limit: Claude gets "only the start of it", with a note to read the rest, and "until Claude chooses to, the later instructions aren't in its context".
  - Compaction: summarized away, reloaded only when a matching file is touched again.
  - A sibling git worktree: rules load for it only if Claude Code starts there or moves with `/cd`.
  - `paths` is the only frontmatter field read; others are ignored "without an error".
- **Observability.** The `InstructionsLoaded` hook receives `file_path`, `load_reason` (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`), `globs` and `trigger_file_path`; it cannot block or inject, it "runs asynchronously for observability purposes" [hooks]. Logging it shows which rules ever load [mem].

### 2.4 Nested CLAUDE.md files

- Same trigger and same per-file limit as path-scoped rules, keyed on the folder rather than a glob; "Directory owners maintain their own conventions; instructions are versioned with the code" [large]. Path-scoped rules suit "all conventions in one place, or the same rule applies to many scattered paths" [large].
- A nested file does not appear under **Memory files** in `/context`, "because it loads on demand rather than at launch" [mem].
- Same failure modes as 2.3 (inferred, since [mem] and [ctx] treat the two together).

### 2.5 Hooks that inject context only when relevant

- `SessionStart`: `additionalContext` is "added to Claude's context at the start of the conversation, before the first prompt"; it runs again after compaction with matcher `compact` [hooks] [ctx].
- `UserPromptSubmit`: context "alongside the submitted prompt"; default timeout 30 s, and on timeout "its output, including any `additionalContext`, is discarded" [hooks].
- `PreToolUse` and `PostToolUse`: context lands "next to the tool result" [hooks]. A `PreToolUse` hook's context therefore reaches Claude after the call ran, unless the hook blocks it (inferred).
- Cap: 10,000 characters per string; over it, a file path and a 2,000-character preview, and "Claude can read the file, but Claude Code doesn't ask it to" [hooks].
- Wording: "Write the text as factual statements rather than imperative system instructions"; text "framed as out-of-band system commands can trigger Claude's prompt-injection defenses" [hooks].
- When to prefer CLAUDE.md: "For instructions that never change, prefer CLAUDE.md" [hooks].
- **Failure modes.** The relevance test lives in a script that must be maintained; a hook that prints too often is a new always-loaded cost (inferred).

### 2.6 Skills

- **Progressive disclosure.** "At startup, the agent pre-loads the name and description of every installed skill"; the body loads when relevant; linked files "only as needed", so "the amount of context that can be bundled into a skill is effectively unbounded" [as]. The spec budgets metadata at "~100 tokens", the body at "< 5000 tokens recommended", and "Keep your main `SKILL.md` under 500 lines" [spec]; [skills] and [sbp] say the same 500 lines. "Keep file references one level deep from `SKILL.md`" [spec] [sbp].
- **When it fires.** "Claude matches your task against skill descriptions"; "If descriptions are vague or overlap, Claude may load the wrong skill or miss one" [feat]. A `paths:` field limits automatic loading to work on matching files [skills].
- **Failure modes.** Descriptions are dropped from the listing when it overflows its budget, "starting with the skills you invoke least" [skills]. After compaction only the first 5,000 tokens of a body come back, so "put the most important instructions near the top" [ctx]. The body is not re-read on later turns, so guidance must be "standing instructions rather than one-time steps" [skills]. A user-invoked skill moves the cost to the human, who "must remember it exists" [wfa].
- **Use for.** "Instructions that are procedural, like deploy workflows, release checklists, or review processes" [steer]; "a multi-step procedure" [mem].

### 2.7 Imports

- They do not shrink anything: imported files "load together with the CLAUDE.md that imports them" [mem], and each import "counts as a separate file" for the size warnings [mem].
- They only help organization, and sharing one file with other tools through `@AGENTS.md` [mem].

### 2.8 History out of CLAUDE.md: ADRs, commit messages, tickets, git log

- Zero context cost; the content survives in git (inferred).
- Claude reaches it only by searching (`git log -S`, `git blame`, a grep of `docs/adr/`), which it does when a task asks why, or when a pointer names the place (inferred). Auto memory's own rules skip "anything it can derive from the codebase" but keep "decisions that Claude can't derive from the code or git history" [mem], which treats git history as a store Claude can derive from.
- Failure mode: a rule moved out with its rationale disappears from the agent's behaviour. Only the _why_ moves to history; the _rule_ stays in an always-loaded or path-scoped place, or becomes a check (inferred).

### 2.9 Docs behind pointers

- "A `CLAUDE.md` that tells Claude in words to read `AGENTS.md`: Claude sees `AGENTS.md` only if it decides to open the file" [mem].
- "The pointer's _wording_, not its target, decides when the agent reaches the material, and how reliably. A must-have target behind a weakly worded pointer is a variance bug: sharpen the wording first, and inline the material only if sharpening fails" [wfa]. A pointer states what the material is and the **branches** that should trigger reaching it, one trigger per branch, leading word first [wfa].
- Reference files longer than 100 lines get a table of contents, since Claude "might use commands such as `head -100` to preview content" [sbp].

### 2.10 Auto memory

- Machine-local, per repository, first 200 lines or 25 KB loaded; for "corrections you give Claude, project context Claude can't derive from the code" [mem]. Not shared across machines [mem], so it cannot hold team rules (inferred).

## 3. What belongs in CLAUDE.md

### 3.1 Official guidance

- Keep "facts Claude should hold in every session: build commands, conventions, project layout, 'always do X' rules. If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule" [mem].
- Worth keeping: the exact test, typecheck and lint commands; "Places where the code is misleading"; "Decisions that aren't in the repo"; "Anything you've had to correct twice already" [bp].
- Add a line when "Claude makes the same mistake a second time", a review catches something, or you retype a correction [mem].
- Emphasis does not fix a lost line: "Either the file has grown long enough that the line gets lost, or the line is a rule that can't have exceptions, in which case it belongs in a hook" [bp].
- "Keep CLAUDE.md under 200 lines, give it an owner, and review changes to it like code" [steer]. Block-level HTML comments in CLAUDE.md "are stripped before the content is injected", for maintainer notes at no token cost [mem].

### 3.2 Decision rule

Ask, in order, of each unit (a bullet, a paragraph, or a sentence of an overlong one). The first yes decides.

1. **Must it hold every time, with no exception?** A hook, a deny rule, a test or a CI check enforces it; CLAUDE.md keeps at most the command that runs the check [bp].
2. **Can Claude find it in the repo, and would it look?** Delete it; record where it lives in the ledger (section 5.5) [bp] [wfa].
3. **Is it history or rationale**: a trial, a ticket trail, who decided and when, a version-dated observation? The _why_ goes to an ADR when it clears the ADR bar, else to the commit message, PR or ticket; the resulting _rule_, if any, continues down this list (inferred from [mem] "Decisions that Claude can't derive from the code or git history", [sbp] "Avoid time-sensitive information").
4. **Is it a multi-step procedure?** A skill; `disable-model-invocation: true` when it has side effects or only the human starts it [bp] [skills].
5. **Does it matter only when touching certain paths?** A path-scoped rule or a nested CLAUDE.md [mem] [large].
6. **Is it reference consulted sometimes** (tables, specs, catalogues)? A doc or a skill's reference file, behind a pointer whose wording names its trigger [wfa] [sbp].
7. **Is it a personal preference?** `CLAUDE.local.md` or `~/.claude/` [mem] [steer].
8. **Otherwise** it is needed in every session: keep it in CLAUDE.md, in its shortest form, with no no-ops ("an instruction the model already obeys by default pays load to say nothing") [wfa].

### 3.3 Size targets

| File                                      | Target                                                                                                       | Source                |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :-------------------- |
| Each CLAUDE.md                            | Under 200 lines; a startup warning past the recommended length, and past a combined limit across files       | [mem] [feat] [costs]  |
| Each CLAUDE.md, in bytes                  | About 20 KB, so long lines cannot game the line count: 200 lines of 100 characters                           | (inferred)            |
| Any instruction file that loads at launch | Hard limit 4 MiB, over which none of it loads                                                                | [mem]                 |
| Path-scoped rule, nested CLAUDE.md        | Under 40,000 characters on a 200K window, 150,000 on a 1M window for recent models; aim well under the first | [mem]; aim (inferred) |
| `SKILL.md`                                | Under 500 lines; body under 5,000 tokens recommended                                                         | [skills] [spec] [sbp] |
| Skill description                         | 1,024 characters in the spec; Claude Code truncates `description` plus `when_to_use` at 1,536                | [spec] [skills]       |
| `MEMORY.md`                               | 200 lines or 25 KB loaded                                                                                    | [mem]                 |

The thresholds of the startup warnings are not documented on the pages read (unverified).

## 4. Measuring the window objectively

- **`/context`** "Visualize[s] current context usage as a colored grid" with "optimization suggestions for context-heavy tools, memory bloat, and capacity warnings"; `/context all` expands the per-item breakdown and lists **Memory files** [cmd] [mem]. Its Skills row reports the listing after the budget, "so it matches what the model receives" [skills].
- **`/usage`** shows session tokens and, on subscription plans, recommendations such as "`25%  Trim ~/code/api/CLAUDE.md · 49k tokens per request`"; `f` applies some of them [costs].
- **`/doctor`** estimates the skill listing's context cost and proposes CLAUDE.md trims; **`/doctor prompt-audit [path]`** reports "instructions written for older models, references to files or commands that don't exist, and files that contradict each other" and changes nothing until asked [skills] [mem] [cmd]. **`/skill-doctor`** shows each skill's context cost and use [cmd].
- **A headless run.** `claude -p "hello" --output-format json` returns `usage`, whose `cache_creation` the docs read for cache TTLs [cache]. Summing `input_tokens`, `cache_creation_input_tokens` and `cache_read_input_tokens` of that first request gives the fixed startup context; running it before and after a change, in a scratch worktree, measures the change (inferred). `--bare` "skips hooks, skills, plugins, MCP servers, and `CLAUDE.md` files" [bp], so the difference between a normal run and a bare one bounds the cost of all of them together (inferred).
- **The token counting endpoint** `POST /v1/messages/count_tokens` counts a text under a given model's tokenizer; it is free within rate limits and returns "an **estimate**" [tok]. Count against the model in use, since recent models produce about 30 % more tokens for the same text [tok].
- **Transcripts.** Sessions are JSONL files under `~/.claude/projects/` [how]; on this machine each assistant entry holds a `usage` object [obs], which a script can regress against the CLAUDE.md size of the day, as in 1.3 (inferred method).
- **The status line** receives `current_usage` with `cache_creation_input_tokens` and `cache_read_input_tokens` per turn [cache].
- **`InstructionsLoaded`** logs which instruction files load, when and why [hooks] [mem]; a rule that never loads over many sessions is dead or mis-scoped (inferred).

## 5. A generic end-of-session context-hygiene workflow

### 5.1 Goals

- **Small:** the always-loaded set stays within a byte and line budget.
- **Complete:** every unit removed from it lands in a place the agent reaches when the unit matters, or is shown to be derivable or obsolete.
- **Safe:** the skill proposes; a human approves; nothing is committed or deleted silently.

### 5.2 Triggers: what each hook can and cannot do

| Event                | Fires                                                                 | Adds context                                     | Blocks or makes Claude continue                                                                                       | Use for hygiene                                                                                                         | Source  |
| :------------------- | :-------------------------------------------------------------------- | :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :------ |
| `SessionStart`       | `startup`, `resume`, `clear`, `compact`, `fork`                       | Yes, before the first prompt, 10,000-char cap    | No                                                                                                                    | Surface a one-line "context debt" note written by the last `SessionEnd`, only when over budget (inferred design)        | [hooks] |
| `UserPromptSubmit`   | Every prompt                                                          | Yes, beside the prompt                           | Can block the prompt                                                                                                  | None: a per-prompt cost for a per-session concern (inferred)                                                            | [hooks] |
| `PostToolUse`        | After each matching tool call                                         | Yes, next to the tool result                     | No                                                                                                                    | On `Edit` or `Write` of an instruction file, report its new size against the budget, silent otherwise (inferred design) | [hooks] |
| `Stop`               | Each time the main agent finishes responding, not on a user interrupt | `additionalContext` keeps the conversation going | `decision: "block"` or exit 2 makes Claude continue; `stop_hook_active`; overridden after 8 consecutive continuations | A gated nudge, for example once per session when instruction files changed or are over budget (inferred design)         | [hooks] |
| `PreCompact`         | Before `/compact`, auto-compaction and idle compaction                | No: `systemMessage` and `continue` discarded     | Can block compaction; blocking a compaction that recovers from a context-limit error makes the request fail           | None                                                                                                                    | [hooks] |
| `PostCompact`        | After compaction                                                      | No                                               | No decision control                                                                                                   | Log `compact_summary`, to study what compaction loses (inferred)                                                        | [hooks] |
| `SessionEnd`         | Exit, `/clear`, `/resume` switch, logout                              | No: JSON output discarded                        | No; default timeout 1.5 s, raised by a per-hook `timeout` up to 60 s or by `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`  | Run the deterministic measurement and write its report to a file (inferred design)                                      | [hooks] |
| `InstructionsLoaded` | Each instruction file load                                            | No                                               | No                                                                                                                    | Append to a load log, the evidence for dead or mis-scoped rules                                                         | [hooks] |

Two official hints point the same way: "Add a Stop hook that proposes updates: a `Stop` hook receives the path to the session transcript when Claude finishes responding, so a script can review the session and propose CLAUDE.md updates while the gap it exposed is fresh" [large]; and the rule of thumb that "Hook vs Skill" splits work that "must happen the same way every time" from work where "Claude should decide how to apply the steps" [feat].

**Recommended arrangement** (inferred from the table):

1. The audit itself is a **user-invoked skill**, `/context-hygiene`, with `disable-model-invocation: true`: it edits files, so it should run only when named [bp], and it costs no context until then [skills].
2. **Deterministic measurement** runs without Claude: a `SessionEnd` hook writes `measure.json` (sizes, budgets, new history markers since the last audit); a `PostToolUse` hook on `Edit|Write` speaks only when an instruction file crosses its budget.
3. **The nudge** is a `SessionStart` hook (matcher `startup`) that prints one factual line when `measure.json` shows the budget exceeded, such as "CLAUDE.md is 474 KB against a 20 KB budget; `/context-hygiene` proposes a split." It costs nothing when within budget.
4. **The guard against regrowth** is a test in CI that fails when CLAUDE.md passes its byte or line budget, the deterministic form of "When it's done" [bp].
5. A **`Stop` hook** that blocks every turn is avoided: it fires after every response [hooks], and an `agent` hook that judges the transcript is "experimental" and not deterministic [hooks] [bp].

### 5.3 What the skill checks

Each check has a detector a script can run, then a judgement the agent makes with evidence.

| Check                               | Script detector                                                                                                                                             | Agent judgement and destination                                                          |
| :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Budget**                          | Bytes, lines, longest line, estimated tokens of every always-loaded file: CLAUDE.md files, unscoped rules, resolved imports, `MEMORY.md`, the skill listing | Which units to move first: the largest sections that fail the decision rule's step 8     |
| **Rule-file health**                | YAML of every `paths:` frontmatter parses; every glob matches at least one tracked file; each file under the per-file limit                                 | A rule that parses wrong loads always; a glob that matches nothing never loads           |
| **History in instructions**         | Configurable markers: ticket references, ISO dates, "decided by", "trial", "probe", run IDs, `Before vX`, quoted command output                             | Step 3: the why to an ADR, commit or ticket; the rule stays                              |
| **Derivable content**               | Paths, identifiers and commands a unit names that exist in the repo (`git ls-files`, `package.json` scripts, test names)                                    | Step 2: delete with evidence `file[:line]` showing the code, config or test says it      |
| **Stale facts**                     | `file:line` citations past the file's end or to missing files; missing paths; commands absent from scripts; versions that differ from the lockfile          | Fix or delete; `/doctor prompt-audit` covers part of this [mem]                          |
| **Duplication**                     | Shingle overlap between CLAUDE.md, rules, skills, README, ADRs, glossary                                                                                    | Keep one **single source of truth** and a pointer [wfa]                                  |
| **Path-scope candidates**           | Units whose named paths cluster under one folder                                                                                                            | Step 5, with the cluster's globs                                                         |
| **Procedures**                      | Units with ordered steps, imperatives in sequence, or "run X then Y"                                                                                        | Step 4, a skill                                                                          |
| **Enforceable rules**               | "Never", "always", "must" with a checkable object                                                                                                           | Step 1, a hook, test or lint rule, when it can have no exception                         |
| **No-ops and negations**            | Generic advice ("be thorough"), prohibitions without a positive target                                                                                      | Delete a no-op; restate a prohibition positively [wfa]                                   |
| **Dead rules**                      | `InstructionsLoaded` log: rules with no `path_glob_match` over N sessions                                                                                   | Fix the globs, or delete when the area is gone                                           |
| **Process rules that drive growth** | Rules in the instructions that tell the agent to write into the instructions                                                                                | Name the contradiction with the budget and ask the owner (it is a policy, not a cleanup) |

### 5.4 Safe output

- Work on a branch, never on the default branch, and commit nothing until the human says so (inferred, matching the usual permission model of [bp]).
- Moves before deletions: a unit is cut from CLAUDE.md in the same diff that writes it to its destination, so the diff itself shows nothing vanished (inferred).
- The report lists, per destination, the units moved and the always-loaded bytes saved, then the deletions with their evidence, then the decisions only the owner can take.
- Since CLAUDE.md edits apply from the next session [cache], the report ends with the check to run there: `/context all`, and the headless measurement of 4.

### 5.5 Guaranteeing nothing is forgotten: the ledger

The ledger is a machine-checkable record with one entry per unit that left the always-loaded set.

```json
{
  "unit": "CLAUDE.md#Interface/Buttons/3:9f2c1a",
  "text": "first 200 characters of the unit",
  "disposition": "moved",
  "destination": ".claude/rules/sanctions.md",
  "reach": { "kind": "paths", "globs": ["src/sanctions/**"] },
  "evidence": null
}
```

- `disposition` is one of `moved`, `merged` (into another unit, named), `enforced` (hook, test or lint rule, named), `derivable` (evidence `file[:line]` or command), `history` (ADR, commit, PR or ticket, named), `obsolete` (evidence that what it describes is gone).
- `reach` says how the destination is reached: `always` (CLAUDE.md or an unscoped rule), `paths` (globs), `folder` (nested CLAUDE.md), `skill` (name, model- or user-invoked), `pointer` (the always-loaded line that names it), `search` (history only).

A verification script fails unless all of these hold (inferred design):

1. Every unit of the old always-loaded set is either still present (similarity above a threshold) or has a ledger entry.
2. Every `moved` or `merged` destination exists and contains the unit's text, or a rewording the agent marked as such.
3. Every `paths` reach parses as YAML and matches at least one tracked file; every rule file is under the per-file limit.
4. Every `skill` reach names a skill that exists and, if model-invoked, has a description.
5. Every `pointer` reach names a line present in an always-loaded file.
6. Every `derivable` and `obsolete` entry cites a path that exists, or a command whose output the report quotes.
7. No unit with a "never", "always" or "must" marker has `history` or `search` as its only reach: a rule may not leave behaviour for history.
8. The new always-loaded set is within budget.

Optional and costly, a behavioural spot check: for a sample of moved units, a fresh general-purpose subagent, which loads CLAUDE.md and rules as a session would [sub], is given a task that touches the unit's area and asked what applies; a miss means the reach failed (inferred). [sbp] recommends this kind of observation of a fresh instance ("Claude B") over assumptions.

### 5.6 Skeleton of the SKILL.md

```markdown
---
name: context-hygiene
description: Audit the always-loaded instructions against a budget and propose moving each oversized or misplaced unit to a hook, a path-scoped rule, a skill, an ADR or deletion with evidence, with a ledger proving every moved unit stays reachable.
disable-model-invocation: true
---

# Context hygiene

Keep the always-loaded instructions **small** and **complete**. Budgets and destinations come from `.claude/context-hygiene.json`.

1. **Measure.** Run `node ${CLAUDE_SKILL_DIR}/scripts/measure.mjs`. Done when `measure.json` lists every always-loaded file with bytes, lines, longest line and estimated tokens, and every rule file's frontmatter, globs and size.
2. **Segment.** Run `node ${CLAUDE_SKILL_DIR}/scripts/segment.mjs`, which cuts each always-loaded file into units: a bullet, a paragraph, or a sentence of a unit over 1,000 characters. Done when `units.json` exists.
3. **Classify.** Apply the decision rule of `references/decision-rule.md` to every unit, in the order it gives. Done when every unit has a disposition and, for `derivable` and `obsolete`, evidence a reader can open.
4. **Draft.** On a branch `context-hygiene/<date>`, write each unit to its destination and cut it from its source in the same change. Rules get `paths:` from the unit's path cluster. Done when the diff holds no cut without its write.
5. **Verify.** Run `node ${CLAUDE_SKILL_DIR}/scripts/verify-ledger.mjs units.json ledger.json`. Done when it exits 0.
6. **Report.** Write the report of `references/report.md`: savings per destination, deletions with evidence, and the owner's decisions. Stop there; commit only when the user says so.
7. **Next session.** Tell the user to run `/context all` and `node ${CLAUDE_SKILL_DIR}/scripts/measure.mjs --headless` in a new session, since CLAUDE.md edits apply only then.
```

Its bundle (inferred design):

- `scripts/measure.mjs`: sizes, budgets, history markers, glob matches against `git ls-files`, YAML parse of every rule, optional `--headless` run of `claude -p` to read `usage`.
- `scripts/segment.mjs`: units with stable IDs, file plus heading path plus a short hash.
- `scripts/verify-ledger.mjs`: the eight checks of 5.5.
- `references/decision-rule.md`: section 3.2, one level deep from `SKILL.md` [sbp].
- `references/report.md`: the report's shape.
- `.claude/context-hygiene.json` in the repo: budgets per file, the rules directory, the ADR directory, history markers, the tokens-per-byte figure measured as in 1.3, and paths to ignore.
- Hooks, all optional: `SessionEnd` running `measure.mjs`; `SessionStart` printing one line from `measure.json` when over budget; `PostToolUse` on `Edit|Write` of instruction files; `InstructionsLoaded` appending to a load log.

### 5.7 Relation to the built-in tools

Run `/doctor` and `/doctor prompt-audit` first: the first proposes trims of derivable content and migrations to skills and nested CLAUDE.md files, the second finds missing references and contradictions [skills] [mem]. Whether `/doctor` handles a file of hundreds of kilobytes in one pass was not tried (unverified). The custom skill then adds the budget, the history extraction, the repository's own destinations and the ledger.

## 6. Applied to this repository

### 6.1 What drives the size

- 174 occurrences of "decided by the agent", 516 of `(#`, 235 of `on #`, 671 ISO dates, 123 `node_modules/…` citations, 122 URLs [obs: `grep -o … | wc -l` on `CLAUDE.md`]. Most units carry their ticket trail, dated trials and the rationale of each decision inline.
- The repository's own rules feed this growth, and they contradict the official target. CLAUDE.md, **Facts and docs**: an agent "applies the most acceptable option and marks it `(decided by the agent on <date>, on #<n>, for Gilles to review)` in the docs"; "Docs are updated the moment they become true, in the same change"; **Gotchas**: "add one line under **Gotchas**". Against them, [mem]: "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." The **Gotchas** section is 42,095 bytes, far beyond one line per gotcha [obs]. Which wins is a decision for Gilles, to record through domain-modeling as CLAUDE.md asks; the proposal below assumes the marks move to the tickets, which the same rule already requires, and to commit messages.
- The repository forbids comments in Markdown (CLAUDE.md, **No comments**), which also rules out the stripped block-level HTML comments that [mem] offers for maintainer notes. That is a trade-off to keep in mind, not a recommendation.
- Every general-purpose subagent loads the whole file again [sub]: 109 transcripts of general-purpose subagents sit in this project's transcript directory, and none of Explore or Plan [obs: a Node script over `~/.claude/projects/C--Dev-Pero-Admin-Panel/*/subagents/*.meta.json`]. That most of them come from `deliver-epic` and `deliver-backlog` runs is likely but not checked (inferred).

### 6.2 Proposed split

Organize the moved material by **folder**, not by CLAUDE.md section, so that one rule file holds a domain's interface, errors and tests together, as co-location asks [wfa]. Globs avoid `(staff)` and `[userId]`, whose parentheses and brackets the glob reader may not take literally (inferred, see 2.3).

| CLAUDE.md section | Bytes now [obs] | Stays always-loaded (approx.)                                                                               | Goes to                                                                                                                                                                                                                                                     |
| :---------------- | --------------: | :---------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preamble          |           5,188 | 0.8 KB: what the panel is, its stack, where it runs                                                         | README for the product description; ticket trail to history                                                                                                                                                                                                 |
| How we work       |           1,589 | 1.4 KB, as is                                                                                               |                                                                                                                                                                                                                                                             |
| Language          |             571 | 0.6 KB, as is                                                                                               |                                                                                                                                                                                                                                                             |
| No comments       |          16,638 | 0.7 KB: the rule, its two exceptions, `pnpm check:comments`                                                 | `.claude/rules/check-comments.md` (`scripts/check-comments.mjs`, `test/check-comments.test.mjs`, `.claude/hooks/**`); most parser behaviour is derivable from `test/check-comments.test.mjs`                                                                |
| Facts and docs    |           1,726 | 1.2 KB, with the owner's decision on agent-decision marks                                                   |                                                                                                                                                                                                                                                             |
| Costs             |           2,532 | 0.7 KB: the golden rule and "no way to pay"                                                                 | `docs/costs.md`, already the source                                                                                                                                                                                                                         |
| Architecture      |          11,029 | 2.5 KB: folders, the Discord seam, entry points only wire, the staff check, writes, validation, components  | `.claude/rules/architecture.md` (`src/**`) for the rest                                                                                                                                                                                                     |
| Errors            |          20,014 | 0.8 KB: the four kinds, `DiscordError`, the write result's shape                                            | Domain rules below; error pages to `.claude/rules/error-pages.md` (`src/app/error*.tsx`, `src/app/global-error*.tsx`, `src/app/not-found*.tsx`)                                                                                                             |
| Testing           |          69,798 | 1.5 KB: layers, the fake, "assertions read state", where each kind of test lives                            | `.claude/rules/e2e.md` (`e2e/**`, `playwright.config.ts`); `.claude/rules/discord.md` (`src/discord/**`); flow lists derivable from `e2e/*.test.ts`                                                                                                         |
| Interface         |         181,374 | 2 KB: framework, theme tokens only, French wording, dates, buttons                                          | `ui.md` (`src/ui/**`), `staff.md` (`src/staff/**`, `src/app/login/**`, `src/proxy.ts`), `blocked-words.md`, `audit-log.md`, `records.md`, `sanctions.md`, `ticket-archives.md`, `privacy-policy.md`, each with `src/<folder>/**` and `src/app/*/<route>/**` |
| Responsive        |          28,143 | 0.8 KB: mobile first, 360 px, the 44 px touch rule                                                          | `.claude/rules/responsive.md` (`src/**/*.tsx`, `src/ui/globals.css`, `eslint-rules/**`, `e2e/responsive.test.ts`), pointing to `docs/responsive.md`                                                                                                         |
| Security          |          20,068 | 1.2 KB: no secret in logs, `server-only`, the session's shape                                               | `.claude/rules/security.md` (`next.config.ts`, `src/proxy.ts`, `src/staff/**`, `src/*/env.ts`); the variable list is in the README                                                                                                                          |
| Monitoring        |          12,291 | 0.4 KB: failures only, never personal data                                                                  | `.claude/rules/monitoring.md` (`src/monitoring/**`, `src/instrumentation.ts`)                                                                                                                                                                               |
| Code style        |           9,210 | 1 KB: names, exports, TypeScript rules review checks                                                        | Derivable from `prettier.config.mjs`, `eslint.config.mjs`, `tsconfig.json`                                                                                                                                                                                  |
| Warnings          |          17,060 | 0.8 KB: `--max-warnings 0`, console fails tests, the directive form                                         | `.claude/rules/tooling.md` (`eslint.config.mjs`, `tsconfig.json`, `.github/**`, `vitest.config.mts`)                                                                                                                                                        |
| Dependencies      |          14,427 | 0.6 KB: exact versions, release age, the pre-add check                                                      | The monthly procedure into the `update-dependencies` skill that CLAUDE.md plans (#97), absent from `.claude/skills/` today [obs: `ls .claude/skills`]; `.claude/rules/dependencies.md` (`package.json`, `pnpm-workspace.yaml`)                              |
| Delivery          |          12,923 | 0.6 KB: PR to `main`, merge commit, CI green                                                                | ADR 0007 already holds the why; `.claude/rules/delivery.md` (`.github/**`)                                                                                                                                                                                  |
| Feedback loops    |           4,549 | 2.5 KB: the commands                                                                                        |                                                                                                                                                                                                                                                             |
| Commits, PRs      |           2,363 | 1.5 KB                                                                                                      |                                                                                                                                                                                                                                                             |
| Gotchas           |          42,095 | 1.5 KB: one line each for traps of the environment, such as Windows paths, worktrees and pnpm's release age | Each code-area gotcha to its folder's rule; trial narratives to history                                                                                                                                                                                     |
| Agent skills      |             478 | 0.5 KB, as is                                                                                               |                                                                                                                                                                                                                                                             |
| **Total**         |     **474,066** | **about 24 KB**                                                                                             |                                                                                                                                                                                                                                                             |

- **After the split** (inferred): about 24 KB always loaded, roughly 8,000 tokens at 0.336 tokens per byte, against about 159,000 today; the first request of a session would fall from about 245,000 tokens to about 90,000. That is still above the 20 KB budget of 3.3: a second pass on **Feedback loops** and **Architecture** would reach it. The remaining fixed cost, about 81,000 tokens by the regression's intercept, is the system prompt, tools, skill listing and MCP servers, which `/context` breaks down.
- **Per-file limit.** The Interface section alone, 181,374 bytes, is over both on-demand limits [mem], so it must be cut into the domain files above and trimmed, or each file would load truncated.
- **Rules that load on most coding sessions** (`architecture.md` on `src/**`, `responsive.md` on `src/**/*.tsx`) still save every docs-only, ticket-only and tooling session, and every subagent that touches no such file (inferred). Keep each under about 15 KB.
- **History out, rules kept.** The "decided by the agent" marks and ticket trails move to the tickets and to commit messages; dated trials that prove a rule move to the commit that introduced the rule, or to an ADR when they clear its bar. The rule itself stays, shortened, in its rule file.
- **Enforcement already exists** for several rules: comments (`pnpm check:comments` and its PR hook), formatting (the `PostToolUse` hook), responsive classes (`admin-panel/responsive-classes`), the console in tests. Their CLAUDE.md text can shrink to the command and the exception (inferred).
- **Dependencies by command, not by path.** `pnpm add` matches no file a rule could scope, so the pre-add checklist suits a `PreToolUse` hook on `Bash` commands starting with `pnpm add` that blocks once with the checklist as its reason, since context added without blocking arrives only after the call [hooks] (inferred design).

### 6.3 Order of work

1. The owner decides the process rules of 6.1, so that new material stops landing in CLAUDE.md.
2. `/doctor prompt-audit` and `/doctor`, for stale references and derivable content.
3. Split **Interface**, **Testing** and **Gotchas** first: together 293,267 bytes, 62 % of the file [obs].
4. Add the CI size test, then the measurement hooks.

## 7. Claims not verified

- How many tokens the CLAUDE.md costs: about 159,000 is a regression estimate, not a count; `/context all` or the token counting endpoint would give the figure.
- Whether a path-scoped rule loads on Grep or Glob results: the docs list only Read, Write, Edit and Bash reads.
- Whether globs containing `(` or `)` match literally.
- Whether a rule arrives before or after Claude writes a new file's content: inferred from the docs' wording.
- The thresholds of the startup warnings about instruction file length and combined length.
- The units of the skill listing budget ("1% of the model's context window", called a character budget).
- Whether `/doctor` and `/doctor prompt-audit` handle a 474 KB CLAUDE.md in one pass.
- That transcripts hold `usage` is observed on this machine, not documented.
- The sub-agents page's section on forks, and the hooks guide page, were not read in full.
- Every design in section 5 and every figure after the split in 6.2 is inferred, untried.
