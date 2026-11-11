# When Claude Code loads a path-scoped rule

Research for #423, a child of the map #421, which splits `CLAUDE.md` into `.claude/rules/<domain>.md` files scoped by `paths:`. It answers one question: when does Claude Code load a rule of `.claude/rules/` that has a `paths:` frontmatter, and when does it not? Written 2026-11-11. The docs were read that day; the trials ran that day on Claude Code 2.1.319 (CLI, Windows 11) with the model `claude-haiku-5-5`; the transcripts quoted under **[obs]** were written the same day by Claude Code 2.1.319 (an earlier agent's trials) and 2.1.321 (the desktop app's worktree sub-agent of section 5.3).

## How to read this file

Every claim carries one of these marks:

- **[source key]**: verified in the primary source listed under **Sources**, read on 2026-11-11. A quote is in quotation marks.
- **[T1]** to **[T9]**: shown by a trial of this research, described under **Trials**.
- **[obs]**: read from a transcript or a hook log already on this machine, written by an earlier agent on this ticket; the file is named.
- **[#n]**: reported in issue n of `anthropics/claude-code` by a third party, not re-verified unless a trial is also cited.
- **(inferred)**: a conclusion drawn from the above, checked against nothing.

### Sources

| Key       | Source                                                                                                                                                                         |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[mem]`   | https://code.claude.com/docs/en/memory, sections **Path-specific rules**, **How CLAUDE.md files load**, **Troubleshoot memory issues**                                         |
| `[tools]` | https://code.claude.com/docs/en/tools-reference, sections **Edit tool behavior**, **Glob tool behavior**, **Write tool behavior**                                              |
| `[sub]`   | https://code.claude.com/docs/en/sub-agents, section **What loads at startup** and the `omitClaudeMd` row                                                                       |
| `[wt]`    | https://code.claude.com/docs/en/worktrees, sections **Isolate subagents with worktrees**, **Ask Claude to create a worktree**, **What worktrees share with the main checkout** |
| `[ctx]`   | https://code.claude.com/docs/en/context-window, section **What survives compaction**                                                                                           |
| `[hooks]` | https://code.claude.com/docs/en/hooks, section **InstructionsLoaded**                                                                                                          |
| `[log]`   | https://code.claude.com/docs/en/changelog, generated from https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md                                                     |
| `[prior]` | `docs/agents/context-window-research.md` on the branch `research/context-window` (2026-11-05), section 2.3                                                                     |

### Trials

A scratch git repository outside this repo held a root `CLAUDE.md`, one unscoped rule and one scoped rule per case, each body carrying a marker such as `TOKEN-DOCS`, plus the files the globs aim at. It had two worktrees: `.claude/worktrees/wt` inside it and `../sib` beside it. Its `.claude/settings.json` logged every `InstructionsLoaded`, `PreToolUse`, `PostToolUse`, `SessionStart` and `PreCompact` hook input to a JSON-lines file. Each trial is a headless session:

```
claude -p "<prompt>" --model haiku --setting-sources project,local --allowedTools "Read,Edit,Write,Bash,Grep,Glob,Agent,PowerShell"
```

The ground truth is the `InstructionsLoaded` log (`load_reason`, `globs`, `trigger_file_path`, and `agent_type` for a sub-agent) and the session transcript under `~/.claude/projects/`, where a loaded rule is an `attachment` entry of type `nested_memory`. The model's own list of the markers it could see only confirmed that the body reached it.

| Trial | Session | Started in             | What the prompt made Claude do                                                                                                                                                                                                                                                      |
| :---- | :------ | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1    | `3481…` | the repository root    | Read, in order: `nested/docs/b.md`, `docs/a.md`, `docs/c.md`, `deep/src/app/(staff)/p.tsx`, `src/app/(staff)/page.tsx`, `src/lib/c.js`, `src/lib/a.ts`, `src/lib/b.tsx`                                                                                                             |
| T2    | `71a1…` | the repository root    | Grep `walrus` (content, one match in `grepme/g.txt`), Grep `sub` in `subonly/` (files_with_matches), Glob `grepme/*.txt`, Glob `docs/**`                                                                                                                                            |
| T3    | `18ba…` | the repository root    | Bash, one call each: a piped `cat`, a plain `cat`, `head … 2>/dev/null`, `grep` with a match, `cd … && cat`, `sed -n '1p'`, `cat` of two files, `echo … >`, `grep` without a match; then PowerShell `Get-Content`                                                                   |
| T4    | `dba8…` | the repository root    | Write a new file `newdir/hello.md` "containing a one-line friendly greeting", and Edit `editme/e.txt` without reading it first; the rule of `newdir/**` orders a first line `HEADER-NEWDIR`                                                                                         |
| T5    | `511b…` | the repository root    | Read, one per turn: `.claude/worktrees/wt/src/app/(staff)/page.tsx`, `.claude/worktrees/wt/src/lib/a.ts`, `../sib/src/app/(staff)/page.tsx`, `../sib/src/lib/a.ts`, `../sib/docs/a.md`, `nested/anch/y.txt`, `anch/x.txt`; then five Reads in one turn, each under a different rule |
| T6    | `2f61…` | `.claude/worktrees/wt` | Read `src/app/(staff)/page.tsx`, then `src/lib/a.ts`                                                                                                                                                                                                                                |
| T7    | `5d46…` | the repository root    | One `general-purpose` sub-agent with `isolation: worktree`, which read `src/lib/a.ts`, `src/app/(staff)/page.tsx`, `docs/a.md` in its worktree, one per turn                                                                                                                        |
| T8    | `19f7…` | the repository root    | One `Explore` sub-agent, which read `subonly/s.txt`; then the main session read `subonly/t.txt`                                                                                                                                                                                     |
| T9    | `19ca…` | the repository root    | Read `docs/a.md`; resumed: read `docs/c.md`; resumed: `/compact`; resumed: read `nested/docs/b.md`                                                                                                                                                                                  |

T1 to T4 ran before 17:21 UTC, when the account reached its 5-hour usage limit; T5 to T9 ran after it lifted, from 21:06 UTC.

## The answer

| Action on a file that matches a rule's `paths:`                                                                                      | Loads the rule?                                                 | Source                       |
| :----------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :--------------------------- |
| `Read`                                                                                                                               | Yes, after the read                                             | [mem], [T1]                  |
| `Edit`, with or without a prior read                                                                                                 | Yes, after the edit                                             | [mem], [log] 2.1.288, [T4]   |
| `Write` of an existing or a new file                                                                                                 | Yes, after the write: the content is already chosen             | [mem], [log] 2.1.288, [T4]   |
| Bash `cat`, `nl`, `bat`, `batcat`, `head`, `tail`, `sed -n 'X,Yp'`, `grep`, `egrep`, `fgrep`, `rg` on one file, no pipe, no redirect | Yes, if the command printed some of the file                    | [tools], [log] 2.1.293, [T3] |
| Bash with a pipe, a redirect (`2>/dev/null` included), `cd … &&`, two files, or a write (`>`, `sed -i`)                              | No                                                              | [tools], [T3], [#96361]      |
| Bash `grep` that matches nothing in the file                                                                                         | No                                                              | [T3]                         |
| PowerShell `Get-Content`                                                                                                             | No                                                              | [T3]; the docs are silent    |
| `Grep` or `Glob` that finds the file, in any output mode                                                                             | No                                                              | [T2]; not listed in [mem]    |
| A second matching file in the same session, resumed sessions included                                                                | No, the rule is already loaded                                  | [T1], [T9]                   |
| A matching file after a compaction                                                                                                   | Yes again                                                       | [ctx], [T9], [obs]           |
| A sub-agent's `Read`, Explore included                                                                                               | Yes, into the sub-agent's context only                          | [sub], [T7], [T8], [obs]     |
| A file of a worktree under `.claude/worktrees/`, from the main session or an isolated sub-agent                                      | Yes, the main checkout's rule, matched from the worktree's root | [T5], [T7], [obs]            |
| A file of a sibling worktree outside the project root                                                                                | No                                                              | [mem], [T5]                  |

## Key findings

1. A scoped rule loads only when a file that matches it goes through `Read`, `Edit`, `Write`, or a plain single-file Bash read; never on `Grep`, `Glob`, a piped or redirected Bash command, or a PowerShell read [mem] [tools] [T2] [T3].
2. The rule arrives with the tool results, before Claude's next model request. A file created by `Write` is therefore written without the rule, which reaches Claude only for what comes after [T4].
3. Parentheses in a glob, as in `src/app/(staff)/**`, match literally; braces expand into one pattern per alternative [T1] [mem].
4. A trailing `/**` is stripped from each pattern, and a pattern left with no `/`, such as `docs` from `docs/**` or `package.json`, matches at any depth: `docs/**` loaded on `nested/docs/b.md` [T1]. A pattern with a `/` at its start or in its middle, such as `/anch/**`, `src/app/(staff)/**` or `src/lib/*.ts`, matches only from the base directory [T1] [T5] [obs].
5. An `@import` written inside a scoped rule loads at session start, whether or not the rule ever does [T1] [#102932].
6. Sub-agents, except Explore, Plan and those with `omitClaudeMd`, start with `CLAUDE.md` and the unscoped rules; every sub-agent, Explore included, loads scoped rules on its own file reads, into its own context, and the main session loads them again on its own reads [sub] [T7] [T8] [obs].
7. Files of a worktree under `.claude/worktrees/` get the main checkout's rules, matched from the worktree's root, both from the main session and from an isolated sub-agent; a session started inside that worktree uses the worktree's own rules; a sibling worktree outside the project root gets none [wt] [mem] [T5] [T6] [T7].
8. A loaded rule does not survive compaction: it is summarized away, the files re-read after the compaction do not bring it back, and it loads again on the next matching file [ctx] [T9].

## 1. Which actions load a rule

### 1.1 Read, Edit, Write

- The docs: "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file." [mem]
- `Write` and `Edit` load rules since 2.1.288 (2026-10-02): "Fixed path-scoped `.claude/rules` and nested CLAUDE.md files not loading when Write or Edit creates or changes a file in their scope (previously only Read loaded them)" [log]. Issue #96361, still open, describes the old behaviour; its comment of 2026-10-13 measured `Write` (a new file included) as loading on 2.1.296.
- [T1]: each `Read` of a matching file was followed by one `InstructionsLoaded` event with `load_reason` `path_glob_match` and the read file as `trigger_file_path`.
- [T4]: `claude-haiku-5-5` edited `editme/e.txt` without reading it, and the rule of `editme/**` loaded. Haiku 4.5, Opus 4.6 and older models must read before they edit [tools], so on those the `Read` loads it first.
- [T5]: five `Read` calls in one turn, each matching a different rule, loaded all five rules.

### 1.2 Bash

- The docs list the commands that count as a read: "`cat`, `nl`, `bat`, `batcat`, `head`, `tail`, `sed -n 'X,Yp'`, `grep`, `egrep`, `fgrep`, and `rg`, each run on one file with no pipes or redirects", and "When Claude views a file this way, Claude Code also loads any subdirectory `CLAUDE.md` and path-scoped rules that apply to that file." [tools] Since 2.1.293 (2026-10-07) [log].
- [T3] loaded: `cat bashme/x.txt`, `grep walrus grepme/g.txt` (a match), `sed -n '1p' editme/e.txt`.
- [T3] did not load: `cat bashpipe/y.txt | head -n 1`, `head -n 1 docs/a.md 2>/dev/null`, `cd src/lib && cat a.ts`, `cat subonly/s.txt subonly/t.txt`, `echo hi > newdir/w.txt`, `grep -n nomatch 'src/app/(staff)/page.tsx'`.
- [#96361] (comment of 2026-10-13, 2.1.296, macOS) adds, not re-verified here: a plain read still counts inside a `;` or `&&` list; `||`, extra flags such as `cat -A`, `grep -r`, `sed -i`, heredocs, `python -c` and `cp` load nothing.
- On macOS, Linux and WSL there is no `Grep` or `Glob` tool by default: "Claude searches with `find` and `grep` through the Bash tool instead" [tools]. On Windows both tools are in the default set.
- Issue #90450 (open) reports that auto mode tells Claude to work through Bash, which skips the loads.
- (inferred) A habit of piping every read through `head`, `cut` or `sed`, which keeps tool output small, also keeps every scoped rule out.

### 1.3 PowerShell

[T3]: `Get-Content psme/z.txt` through the PowerShell tool loaded nothing. The docs name only Bash commands [tools].

### 1.4 Grep and Glob

[T2]: neither `Grep` (content and files_with_matches modes, both with a match in a scoped folder) nor `Glob` (`grepme/*.txt`, `docs/**`) loaded a rule. The docs do not list them [mem]. This settles the item [prior] left open in its section 7.

### 1.5 Once per session

- [T1]: `docs/**` loaded once for three matching reads, and `src/lib/*.{ts,tsx}` once for `a.ts` then `b.tsx`.
- [T9]: after a `--resume`, a read of `docs/c.md` did not load the rule of `docs/**` again, which the first run had loaded.
- A compaction resets this (section 6), and each agent keeps its own count (section 4.2).

## 2. Globs

### 2.1 Parentheses

[T1]: the rule `src/app/(staff)/**` loaded on `src/app/(staff)/page.tsx`; its `globs` field read `["src/app/(staff)"]`. Parentheses are taken literally. The docs say nothing of them; they warn only about `[`: "A pattern with a `[` that can't be read as a bracket expression ... is invalid: it matches nothing" [mem].

### 2.2 Braces

- [T1]: `src/lib/*.{ts,tsx}` was reported as `["src/lib/*.ts","src/lib/*.tsx"]`, loaded on `src/lib/a.ts`, and not on `src/lib/c.js`.
- The docs: "Each brace group multiplies the number of expanded patterns ... a rule's whole `paths` list shares one budget of 1,000 expanded patterns and 4 MiB", and a pattern over that budget is used "unexpanded, and its literal braces match no files" [mem]. Re-verified from [prior].

### 2.3 Where a pattern matches

- The docs: "Each pattern is relative to the rule's base directory", which for a project rule is "the directory that contains the rule's `.claude` folder" [mem]. Their table gives `*.md` as "`.md` files anywhere under the base directory" and `/*.md` as "directly in the base directory, not in subfolders" [mem].
- [T1]: the `globs` field shows each pattern with its trailing `/**` removed (`docs/**` became `docs`). `docs` then matched `nested/docs/b.md`, while `src/app/(staff)` did not match `deep/src/app/(staff)/p.tsx`. [obs] (`trial-hooks.log` of the earlier agent): `marker.txt` matched `sub/marker.txt`; `src/lib/*.{ts,tsx}` did not match `deep/src/lib/d.ts`.
- [T5]: `/anch/**`, reported as `["/anch"]`, did not load on `nested/anch/y.txt` and loaded on `anch/x.txt`. A leading `/` anchors a one-folder pattern.
- (inferred) This is the `.gitignore` rule: a pattern with no `/` except at its end matches at any depth, one with a `/` at its start or in its middle is anchored to the base directory.
- (inferred) Of the 17 rules now on `main`, the one-segment patterns match at any depth: `.github/**`, `e2e/**`, `test/**`, `scripts/**`, `eslint-rules/**`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `components.json`, `tsconfig.json`, `next.config.ts`, `playwright.config.ts`, `.env.example`, `eslint.config.mjs`, `vitest.contract.config.mts`. The cost is a rule loaded where it was not meant, never a rule missed; `/e2e/**` would anchor one.

### 2.4 Imports inside a scoped rule

[T1]: a rule scoped to `zzz/**` whose body holds `@../../shared/imported.md` was never triggered, yet `imported.md` loaded at session start (`load_reason` `include`, `parent_file_path` the rule) and its marker reached the model. Issue #102932 (open, 2.1.302) reports the same, and a comment of 2026-10-15 on #16299 measured that the scoped rule's own body costs nothing at start while its import does.

### 2.5 Other ways a rule misbehaves

- YAML that does not parse: "Claude Code ignores the frontmatter and loads the rule as if it had no `paths`" [mem].
- Size: a rule that loads on demand and is over the per-file limit arrives cut, with a note to read the rest; the limit is 40,000 characters on a 200K window, and on a 1M window 200,000 for Opus 4.6 and Sonnet 4.6 and 150,000 for later models [mem]. Applied since 2.1.309 [mem]. Re-verified from [prior].
- `paths` is the only field read; "any other field is ignored without an error" [mem].
- Rules in an `--add-dir` directory load "except rules that set a `paths` field" [mem]; issue #106095 (open) reports they never load.

## 3. A file created by Write: before or after?

After. [T4]: the model wrote `newdir/hello.md` and edited `editme/e.txt` in one turn; the transcript holds, in order, the `Write` and `Edit` tool calls, their two results, then the `nested_memory` attachments of `new.md` and `edit.md`, then the next model request. `InstructionsLoaded` fired after both `PostToolUse` events. The file's first line was `Hello there, friendly friend! Welcome aboard.`, without the `HEADER-NEWDIR` the rule orders. The docs agree: rules "load into message history when Claude reads, writes, or edits their trigger file" [ctx].

(inferred) The first file Claude creates in an area is written blind. To have the rule in hand before writing, Claude must first read a file the rule matches, or the rule must leave a pointer line in an always-loaded place. Issue #93248 (open) asks for a trigger before the write.

## 4. Sub-agents

### 4.1 What a sub-agent starts with

- The docs: a non-fork sub-agent's initial context holds "every level of the CLAUDE.md hierarchy the main conversation loads, including `~/.claude/CLAUDE.md`, project rules, `CLAUDE.local.md`, managed policy files ... The built-in Explore and Plan agents skip this. A subagent whose definition sets `omitClaudeMd` loads only the managed policy files" [sub]. It "doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read" [sub].
- [T7], and [obs] (`6410bc47-…/subagents/agent-a6b06a28bb100979b.jsonl`, an earlier agent's trial on 2.1.319): a `general-purpose` sub-agent's first attachment of type `instructions` held the root `CLAUDE.md`, the unscoped rule and the import of a scoped rule, and no scoped rule.
- [T8]: the `Explore` sub-agent's transcript holds none of the markers of `CLAUDE.md`, of the unscoped rule or of the import.
- A fork "inherits the parent conversation and system prompt" [mem]. (inferred) It therefore carries whatever scoped rules the parent had loaded.
- (inferred) A non-fork sub-agent never starts with the scoped rules its parent loaded.

### 4.2 Scoped rules inside a sub-agent

- The docs: "For Explore, Plan, and subagents with `omitClaudeMd`, a subdirectory's `CLAUDE.md` and matching path-scoped rules still load when the subagent works with files there." [sub]
- [T8]: the `Explore` sub-agent's `Read` of `subonly/s.txt` loaded the rule of `subonly/**` (hook `agent_type` `Explore`); the main session's later `Read` of `subonly/t.txt` loaded the same rule again, this time with no `agent_type`.
- [T7], [obs] (same earlier trial): a `general-purpose` sub-agent's reads loaded the matching rules. The `nested_memory` attachments are in the sub-agent's transcript only; the parent saw a rule's marker only when the sub-agent wrote it in its answer. The hook carries `agent_type` since 2.1.288 [log].

## 5. Paths inside a git worktree

### 5.1 What the docs say

- "To have path-scoped rules load for files in a sibling git worktree, start Claude Code in that worktree or move the session there with `/cd`." [mem]
- "A subagent in its own worktree takes the instruction files it starts with from your main conversation, not from its worktree. When that worktree is in the default location under `.claude/worktrees/`, the subagent also doesn't load the `CLAUDE.md` file or `.claude/rules/` directory at the worktree's root as it reads files there, even if those differ on the worktree's branch." [wt]
- Entering a worktree with `EnterWorktree` "takes the session's working directory, write access, and project configuration such as `CLAUDE.md` and settings to that location" [wt]. In a desktop-app worktree session, "`CLAUDE.md` files and `.claude/rules/` still load from the worktree" [wt].
- Fixes in [log]: 2.1.69 (2026-03-05), "duplicate CLAUDE.md, slash commands, agents, and rules when running from a worktree nested inside its main repo"; 2.1.286 (2026-09-30), sub-agents "spawned with worktree isolation loading the project CLAUDE.md and its imports a second time from the worktree copy on their first file read".

### 5.2 What the trials show

- [T5], main session at the repository root: reading `.claude/worktrees/wt/src/app/(staff)/page.tsx` and `.claude/worktrees/wt/src/lib/a.ts` loaded the root's `.claude/rules/paren.md` and `brace.md`. Both patterns are anchored, and taken from the root these paths start with `.claude/worktrees/wt/`: Claude Code matched them from the worktree's root. The worktree's own `.claude/rules/` never loaded.
- [T5]: reading `../sib/src/app/(staff)/page.tsx`, `../sib/src/lib/a.ts` and `../sib/docs/a.md`, in a sibling worktree outside the root, loaded nothing, not even the unanchored `docs`. All three reads returned the file.
- [T6], a session started in `.claude/worktrees/wt`: it loaded the worktree's own `CLAUDE.md`, unscoped rule and, on reads, `wt/.claude/rules/paren.md` and `brace.md`; nothing from the main checkout.
- [T7], a sub-agent with `isolation: worktree`: Claude Code created `.claude/worktrees/agent-a302835080f89cbb3`; the sub-agent's reads of `src/lib/a.ts`, `src/app/(staff)/page.tsx` and `docs/a.md` there loaded the main checkout's `brace.md`, `paren.md` and `docs.md`.

### 5.3 What a real worktree sub-agent did

[obs] `C:\Users\gille\.claude\projects\C--Dev-Pero-Admin-Panel\6fe4762a-c45f-4944-aa5b-51aeefe357d5\subagents\agent-aa09c992f881b54ad.jsonl`: the earlier agent on this ticket, a `general-purpose` sub-agent with `spawnedWithWorktree: true` (its `.meta.json`), working directory `.claude/worktrees/agent-aa09c992f881b54ad`. In the table, `WT/` is that worktree and `AP/` the main checkout.

| Reads in one turn                                                                                                                                               | Rules loaded after them                                                                                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `WT/.github/workflows/ci.yml`, `WT/src/instrumentation.ts`, `AP/eslint.config.mjs`                                                                              | `AP/.claude/rules/ci.md`, `AP/.claude/rules/eslint.md`                                                  |
| `WT/package.json`, `WT/src/monitoring/monitor.ts`                                                                                                               | `dependencies.md`, `monitoring.md` (`["src/monitoring","src/instrumentation.ts"]`)                      |
| `WT/test/check-comments.test.mjs`, `WT/components.json`, `WT/.claude/hooks/format-after-edit.mjs`, `WT/src/discord/discord-error.ts`, `AP/playwright.config.ts` | `node-tests.md`, `shadcn.md`, `claude-hooks.md` (`[".claude/settings.json",".claude/hooks"]`), `e2e.md` |
| `WT/src/discord/compare-ids.ts`, `WT/e2e/audit-log.test.ts`                                                                                                     | `discord.md` (`["src/discord",…]`), `e2e.md`, `next-link-prefetch.md`, `view-transitions.md`            |

- Every rule that loaded was the main checkout's `AP/.claude/rules/…`, and anchored patterns matched worktree files (`src/monitoring`, `.claude/hooks`, `src/discord`), as in [T7].
- Two reads did not load the rule they match: `WT/src/instrumentation.ts` (listed by `monitoring.md`) and `WT/src/discord/discord-error.ts` (under `src/discord`, which loaded on the next read of the same folder). Both reads returned the file's content without error. The trials did not reproduce it: [T5] loaded five rules from five reads in one turn, and [T7] matched an anchored file pattern (`src/lib/*.ts`) in an isolated worktree. Unexplained.

## 6. Compaction

- The docs: "Project-root CLAUDE.md survives compaction: after `/compact`, Claude re-reads it from disk and re-injects it into the session. Nested CLAUDE.md files in subdirectories and rules with `paths:` frontmatter load again on demand." [mem] And: "Path-scoped rules and nested CLAUDE.md files load into message history when Claude reads, writes, or edits their trigger file, so compaction summarizes them away with everything else. If a rule must persist across compaction, drop the `paths:` frontmatter or move it to the project-root CLAUDE.md." [ctx]
- The `InstructionsLoaded` hook has a `load_reason` `compact`, which "fires when instruction files are re-loaded after a compaction event" [hooks]. [T9] logged no event with it.
- [T9]: after `/compact`, the transcript re-attached `docs/a.md` and `docs/c.md` as `file` attachments ("Claude Code re-reads up to five, most recently modified first" [ctx]) with no `nested_memory` beside them; the next `Read`, of `nested/docs/b.md`, loaded the rule of `docs/**` again.
- [obs] (the worktree sub-agent of section 5.3, entries counted from 0): `e2e.md` loaded at entry 549, the conversation compacted at entry 556, and `e2e.md` loaded again at entry 599 on the next read of a file under `e2e/`. After each compaction, an `instructions` attachment follows the `compact_boundary` entry.

## 7. Seeing what loaded

- The `InstructionsLoaded` hook gets `file_path`, `memory_type`, `load_reason` (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`), `globs` and `trigger_file_path`; it "doesn't support blocking or decision control. It runs asynchronously for observability purposes." [hooks] For a sub-agent's load it also carries `agent_type` [T7] [T8].
- In a transcript, a loaded rule is an `attachment` of type `nested_memory` whose `content` carries `path`, `globs`, `isRule: true` and the body without its frontmatter [T4].
- Issue #93094 (open) reports that `/context` does not list a scoped rule loaded mid-session.

## 8. What this means for the split of #421

All inferred from the sections above.

- A rule reaches only the agent that touches its files, and only after the first touch. Whatever must shape the first write in an area, or a ticket, a plan or a review that opens no file, stays in an always-loaded place, at least as a one-line pointer.
- Agents that read with piped Bash commands or with PowerShell never load a scoped rule. A line in the always-loaded part asking for one plain `Read` of a file in an area before working there closes the gap; [#96361] measured such a brief bringing rule loads from 5/15 to 15/15.
- A scoped rule holds no `@import`: the import loads at start for every session.
- A one-folder glob such as `e2e/**` matches every `e2e` folder at any depth. That only over-loads; `/e2e/**` anchors it if a nested folder ever shares the name.
- Globs with `(staff)` work as written; brace lists are safe under 1,000 expansions.
- Worktree agents of `deliver-epic` get the main checkout's rules, matched against their worktree's files. A rule changed on the agent's branch does not reach that agent until it is on the main checkout. A worktree created outside the project root gets no scoped rule at all.
- Each sub-agent, and the main session after it, loads a rule on its own reads: delegating a read does not put the rule in the delegating agent's context.
- After a compaction, every scoped rule must be earned again by a matching read.

## Not verified

- Why two reads in the worktree sub-agent of section 5.3 did not load their rule.
- A session moved into a worktree with `/cd` or `EnterWorktree` (only sessions started there, [T6], were tried).
- The Plan sub-agent and `omitClaudeMd` sub-agents (only Explore, [T8], was tried).
- Why no `InstructionsLoaded` event with `load_reason` `compact` fired in [T9].
