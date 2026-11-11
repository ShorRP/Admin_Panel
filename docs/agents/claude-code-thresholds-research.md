# Claude Code's size thresholds for instruction files

Research for #424, a child of the map #421. Question: what size thresholds does Claude Code apply to `CLAUDE.md` and to `.claude/rules/` files, and what do its tools do with a file past them?

Researched on 2026-11-11 against Claude Code **2.1.319** (the build installed here; the changelog's latest entry was 2.1.322). Every figure carries its source. Lines marked **(inference)** are reasoning from those facts, not facts.

## Sources

| Key          | Source                                                                                                                                                                                                                                                                                                                                                             |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[mem]`      | https://code.claude.com/docs/en/memory, sections "Write effective instructions", "Import additional files", "Path-specific rules", "My CLAUDE.md is too large", "Claude ignores the end of my subdirectory CLAUDE.md", fetched 2026-11-11                                                                                                                          |
| `[tools]`    | https://code.claude.com/docs/en/tools-reference, "Read tool behavior" › "Large files", fetched 2026-11-11                                                                                                                                                                                                                                                          |
| `[err]`      | https://code.claude.com/docs/en/errors.md, "Prompt is too long", fetched 2026-11-11                                                                                                                                                                                                                                                                                |
| `[ts]`       | https://code.claude.com/docs/en/troubleshooting, "Auto-compaction stops with a thrashing error", fetched 2026-11-11                                                                                                                                                                                                                                                |
| `[cw]`       | https://code.claude.com/docs/en/context-window.md, "What survives compaction", fetched 2026-11-11                                                                                                                                                                                                                                                                  |
| `[mc]`       | https://code.claude.com/docs/en/model-config.md, "Extended context", "Default auto-compact thresholds", "Set the auto-compact window", fetched 2026-11-11                                                                                                                                                                                                          |
| `[cl]`       | https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md, fetched 2026-11-11; entries cited by version                                                                                                                                                                                                                                           |
| `[bin]`      | The Claude Code 2.1.319 native binary (`~/.local/bin/claude.exe`, 344,807,072 bytes), whose bundled JavaScript was searched by literal string. Minified names below hold for this build only; the literals to search for are given so a later build can be re-checked                                                                                              |
| `[gh-2766]`  | https://github.com/anthropics/claude-code/issues/2766 (2025-06-30, closed as not planned)                                                                                                                                                                                                                                                                          |
| `[gh-22364]` | https://github.com/anthropics/claude-code/issues/22364 (2026-02-01, closed as not planned)                                                                                                                                                                                                                                                                         |
| `[gh-85489]` | https://github.com/anthropics/claude-code/issues/85489 (2026-08-10, open)                                                                                                                                                                                                                                                                                          |
| `[ctx]`      | `/context` output saved in two Admin Panel session transcripts under `~/.claude/projects/`, sessions `13830a68…` (2026-11-05T16:47Z) and `ff029ea2…` (2026-11-05T23:38Z), model `claude-opus-5-5`                                                                                                                                                                  |
| `[tx]`       | Admin Panel session transcripts `6fe4762a…` and `9712b338…` of 2026-11-11, model `claude-opus-5-5`: `message.usage` of the first assistant entry and `compactMetadata` of each compaction entry                                                                                                                                                                    |
| `[measure]`  | A Node script run on 2026-11-11 over `CLAUDE.md` and `.claude/rules/*.md` of `origin/main` at c663d86: bytes on disk, UTF-16 length, code points, newlines, CRLF, frontmatter `paths:`                                                                                                                                                                             |
| `[trial]`    | Two headless runs, `claude -p … --debug-file` with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` (so `L` = 40,000), in scratch folders outside the repo, on 2026-11-11: one with a 4,300,010-byte `CLAUDE.md`; one on Opus 5.5 with a 44,032-character `CLAUDE.md` made of this repo's own text and a 45,137-character path-scoped rule, each with a sentinel line at its end |
| `[prior]`    | `docs/agents/context-window-research.md` on the branch `research/context-window`                                                                                                                                                                                                                                                                                   |

## Answer in brief

1. Claude Code has one **per-file limit** `L` and one **combined limit** `T`, both in characters and both scaled to the session model's context window: `L = max(40,000, round(W × 0.05 × c))` and `T = max(120,000, L)`, where `W` is the context window in tokens and `c` is Claude Code's characters-per-token figure for the model, 4 for models up to Opus 4.6, Sonnet 4.6 and Haiku 4.5, 3 for later ones [bin]. That gives `L` = 40,000 and `T` = 120,000 on a 200K window, and `L` = `T` = 150,000 on a 1M window for Opus 4.7 and later, such as the Opus 5.5 these sessions run [bin] [mem].
2. At startup, and in `/status`, Claude Code **warns** about each launch-loaded file over `L`, and about the launch-loaded files that are each within `L` when together they pass `T` [mem] [bin]. Each `CLAUDE.md`, unscoped rule and `@path` import counts as a separate file [mem]. A path-scoped rule gets no startup warning, since it does not load at launch (inference from [bin]).
3. A file that loads **at launch** (root `CLAUDE.md`, `CLAUDE.local.md`, unscoped rules, their imports) is **loaded whole**, however far past `L`, up to 4 MiB; a file over 4,194,304 bytes is **skipped entirely** [mem] [bin] [trial].
4. A file that loads **on demand** (a path-scoped rule, a subdirectory `CLAUDE.md`, their imports) is **truncated** past `L`: Claude receives its start, cut at a line end, then a note telling it to Read the rest. That holds since v2.1.309 [mem] [cl] [bin] [trial].
5. Claude Code counts **UTF-16 code units of the text after the YAML frontmatter and block HTML comments are removed**, not bytes, lines or tokens. The 4 MiB skip is the only threshold in bytes [bin]. No threshold counts lines: the 200 lines are a recommendation of the docs [mem].
6. `/doctor` is a prompt that the model runs in the current session: it proposes trims of checked-in `CLAUDE.md` files, prioritizing files near the warning threshold [mem] [bin]. It has no special handling of a file of half a megabyte.
7. The Read tool's limits do not apply to loading: they apply when Claude reads an instruction file itself. A whole-file Read over 256 KB is refused, so this repo's `CLAUDE.md` (492,126 bytes) can only be read in pages or with `allow_large` [tools] [measure].
8. With today's settings this repo's sessions cannot work for long: they start at about 254,000 tokens and compact at about 267,000, a margin of about 13,000 tokens that one or two tool results fill, which explains the "Autocompact is thrashing" of 2026-11-11 [tx] (inference from the figures).

## 1. The thresholds

| Threshold            | Applies to                                              | Figure                                                                                                                                 | How it is counted                                                                                                                       | Past it                                                                                            | Source              |
| :------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :------------------ |
| Per-file limit `L`   | Each instruction file, at launch and on demand          | 200K window: 40,000. 1M window: 200,000 on Opus 4.6 and Sonnet 4.6, 150,000 on later models                                            | UTF-16 code units of the content after BOM, frontmatter and block HTML comments are removed; trimmed of outer whitespace when on demand | At launch: startup and `/status` warning, file still loaded whole. On demand: only the start loads | [mem] [bin]         |
| Combined limit `T`   | Launch-loaded files that are each within `L`            | 200K window: 120,000. 1M window: 200,000 on Opus 4.6 and Sonnet 4.6, 150,000 on later models                                           | Sum of the same per-file counts, leaving out every file over `L`                                                                        | Startup and `/status` warning only                                                                 | [mem] [bin]         |
| Size cap             | Every instruction file read from disk, imports included | 4,194,304 bytes (4 MiB); a file of exactly 4 MiB still loads                                                                           | Bytes on disk (`totalBytes > 4194304`)                                                                                                  | File skipped, none of it loads                                                                     | [mem] [bin] [trial] |
| Recommended length   | Each `CLAUDE.md`                                        | "target under 200 lines per CLAUDE.md file"                                                                                            | Lines, as advice only: no code path read compares lines                                                                                 | Nothing automatic                                                                                  | [mem] [bin]         |
| Import depth         | `@path` imports                                         | "a maximum depth of four hops"                                                                                                         | Hops                                                                                                                                    | Deeper imports do not load                                                                         | [mem]               |
| `MEMORY.md` load     | Auto memory's index only                                | First 200 lines or 25 KB, whichever comes first                                                                                        | Lines and bytes                                                                                                                         | The rest is not loaded                                                                             | [mem]               |
| Read tool            | Claude reading any file itself                          | 25,000 tokens per call (`CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`), whole-file refusal over 256 KB, `allow_large: true` since v2.1.296 | Tokens per call, bytes per file                                                                                                         | `PARTIAL view` or an error asking for `offset` and `limit`                                         | [tools]             |
| Skill listing budget | Names and descriptions of skills                        | `floor(W × c × 0.01)` characters, e.g. 30,000 on a 1M window with `c` = 3; each description capped at 1,536 characters                 | Characters                                                                                                                              | Descriptions truncated, warning `Skill listing over budget`                                        | [bin]               |

How the figures come out of the code [bin]:

- The per-file limit is built from the literals `w9o=0.05` and `b9o=40000`: `Math.max(40000, Math.round(window * 0.05 * bytesPerToken(model)))`. The window falls back to `200000` when the model's is unknown.
- `bytesPerTokenForModel` returns 4 for `claude-3-*`, `claude-opus-4-0` to `claude-opus-4-6`, `claude-sonnet-4-0` to `claude-sonnet-4-6` and `claude-haiku-4-5`, and 3 for every other model.
- The combined limit is `Math.max(120000, perFileLimit)`, from the literal `T9o=120000`.
- The window is the model's context window. The auto-compact window (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`, `autoCompactWindow`) does not enter it. The one override found is `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, read only while `DISABLE_COMPACT` is set.
- The model is the session's main model (`mainLoopModel`), so the same files give different limits on a 200K and on a 1M session.

History [cl]: until v2.1.169 the startup warning used a fixed 40,000 characters ("Large CLAUDE.md will impact performance (44.2k chars > 40.0k)" [gh-22364]; "(9.0m chars > 40.0k)" for a 9-million-character import [gh-2766]). v2.1.169: "The 'CLAUDE.md is too long' warning threshold now scales with the model's context window". v2.1.281: the startup notice also counts "instruction files together, so many mid-sized files and @-imports are caught". v2.1.309: "a nested CLAUDE.md over the size limit now loads only its start".

## 2. The startup warnings

Exact wording in 2.1.319 [bin], numbers formatted like `150.0k`:

- Startup banner, per file over `L`: `<path> is over the <L>-char limit (<n> chars) · /memory to free up context`.
- Startup banner, combined: `<k> instruction files add up to <total> chars, over the <T>-char total limit · largest: <path> (<n>), … · /memory to free up context`, naming the three largest.
- `/status`, per file: `Large <path> will impact performance (<n> chars > <L>)`.
- `/status`, combined: `Instruction files will impact performance: <k> files, <total> chars in total > <T>`.

The docs say the same in prose: "If one of your instruction files is over the recommended length, you see a warning at startup and when you run `/status`. You also see a warning when files that are each within that length add up past a combined limit at session start. Each CLAUDE.md, rules file, and `@path` import counts as a separate file." [mem]

Which files are counted [bin]:

- Files of type User, Project, Local and Managed among those loaded at launch. Auto memory's `MEMORY.md` is left out; it has its own limit.
- User-scope files count with the project's: `~/.claude/CLAUDE.md` and `~/.claude/rules/` add to the combined total. A check in this repository's CI sees only the project's share.
- The combined sum leaves out each file already over `L`. A single oversized `CLAUDE.md` therefore gets the per-file warning, and the combined warning then depends on the other files only.
- Path-scoped rules load only when a matching file is touched, so they are not in the launch list and get no startup warning (inference from the loader, which keeps rules with globs out of the launch load). Past `L`, they are truncated instead (section 3). The docs' note says as much: "Keep each path-scoped rules file within its own per-file size limit, because Claude receives only the start of a file that's over it." [mem]

The same figures applied to this repository at c663d86 [measure]:

| File                                 |         Bytes |  UTF-16 units | Newlines | Longest line | Against `L` = 150,000 (Opus 5.5, 1M) | Against `L` = 40,000 (200K) |
| :----------------------------------- | ------------: | ------------: | -------: | -----------: | :----------------------------------- | :-------------------------- |
| `CLAUDE.md`                          |       492,126 |       489,440 |      319 |       63,168 | 3.3 times over: warned, loaded whole | 12.2 times over             |
| `.claude/rules/game-log.md` (scoped) |        25,356 |        25,169 |       70 |        2,085 | Within                               | Within                      |
| `.claude/rules/bot-log.md` (scoped)  |        14,855 |        14,752 |       53 |        1,368 | Within                               | Within                      |
| The 15 other scoped rules            | 515 to 12,361 | 515 to 12,314 |  9 to 40 |  up to 5,378 | Within                               | Within                      |

Facts from the same measurement: no rule lacks `paths:`, so `CLAUDE.md` is the whole project share of the always-loaded context; no file has a CRLF line end; the eight `@` tokens of `CLAUDE.md` are `@everyone` mentions, not imports of existing files.

## 3. Past a threshold: loaded whole, truncated or skipped

**At launch: whole, up to 4 MiB.** "Claude gets the whole of each CLAUDE.md file that loads at launch, as long as the file is 4 MiB or smaller. Claude Code skips a file over 4 MiB and loads none of it." [mem] The loader reads at most 4,194,304 + 1 bytes and returns `skipped` when the file is larger [bin]. The trial confirmed it: a 4,300,010-byte `CLAUDE.md` left this line in the debug log, twice, and nothing in the session [trial]:

```text
[DEBUG] [CLAUDE.md] skipping <path>\CLAUDE.md: not a regular file or exceeds 4194304 byte limit
```

That run's model call did not go through (the subscription's usage limit had been reached at the time), so it shows the skip but not what the model saw. The second trial loaded a 44,032-character `CLAUDE.md`, over `L` = 40,000: the model quoted its last line, so the file arrived whole [trial]. No user-facing message for the skip was found in the code; it records a telemetry event `file_skipped_special_or_oversize` [bin] (inference: the skip is silent outside `--debug`).

**On demand: the start only.** "When a subdirectory `CLAUDE.md` or a rules file that loads on demand is over a per-file size limit, Claude receives only the start of it. That part ends with a note telling Claude to read the rest with the Read tool, and until Claude chooses to, the later instructions aren't in its context." [mem] It covers subdirectory `CLAUDE.md` and `CLAUDE.local.md` files and their imports, rules in a subdirectory's `.claude/rules/`, and path-scoped rules of the project or of `~/.claude/rules/` [mem]. In the code [bin]:

- The content, trimmed, is cut at the last newline before `L`.
- The cut text gets the note `> Only the start of this file is shown. For the rest, call Read on <path> with offset=<line> and a limit.`
- The file is marked as a partial view, so Write will not overwrite it until Claude has read it all (v2.1.312 [cl]).
- Managed files are exempt.

The trial confirmed it [trial]. After one Read of a matching file, the 45,137-character rule reached the model as a `nested_memory` attachment of 40,238 characters: its first 39,992 characters, ending at a line end, then the note. The model saw the rule's first line, not its last, and quoted the note: `Only the start of this file is shown. For the rest, call Read on <path>\.claude\rules\big.md with offset=522 and a limit.`

**Compaction.** "Project-root CLAUDE.md and unscoped rules" are "Re-injected from disk" after compaction, whole; nested `CLAUDE.md` files and path-scoped rules reload on demand [cw].

**A flagged variant, off by default.** 2.1.319 holds a second cut, for launch-loaded Project files, that runs only when the experiment flag `tengu_temporal_haven` is on (default off) and only in non-interactive sessions [bin]. It triggers when all instruction files together pass half the auto-compact window converted to characters, and its note reads `This session's instruction files are too long together to send whole.` [bin]. Whether the flag is on for any account is not visible from here (inference: treat it as absent).

## 4. What is measured, for `pnpm check:context-budget`

Facts [bin] [mem]:

- The thresholds compare `content.length`, a JavaScript string length, so UTF-16 code units.
- `content` is the file decoded as UTF-8, with a leading BOM removed, the YAML frontmatter removed and block-level HTML comments stripped. Auto memory gets further processing.
- The frontmatter parser removes only the BOM and does not normalize line ends, so a CRLF counts as two units (inference from the code: no file here has one).
- On demand, the content is also trimmed before the comparison.
- The docs tell users to check with `wc -m`, which counts code points. Code points and UTF-16 units differ only for characters outside the Basic Multilingual Plane, such as most emoji, which count 2 in UTF-16 (inference).
- Bytes count only for the 4 MiB skip. Tokens count nowhere in these thresholds: `c` converts the context window into characters, not the file into tokens.

Inferences for the check's design:

- A file's UTF-8 byte count is never below its UTF-16 length: each UTF-16 unit takes at least one byte, and a surrogate pair, two units, takes four bytes. A budget in bytes is therefore stricter than Claude Code's own count. The targets of #421 (20,000 bytes and 200 lines always loaded, 15,000 bytes per scoped rule) sit well under Claude Code's smallest figures, 40,000 per file and 120,000 combined, so a file within them never triggers a warning or a cut on any model.
- Counting the raw file, frontmatter included, overcounts by the frontmatter's length, which errs on the safe side. Matching Claude Code exactly needs the frontmatter and block HTML comments removed and, for scoped rules, a trim.
- The always-loaded set the check should sum is root `CLAUDE.md`, `.claude/CLAUDE.md` if present, `CLAUDE.local.md` if tracked, every `.claude/rules/**/*.md` without `paths:`, and every file they `@import`, to four hops. Each import counts as its own file.
- The real cost is in tokens, and `/context` measured this repo's `CLAUDE.md` at about 2.8 to 2.9 characters per token on Opus 5.5 (section 8), close to Claude Code's own `c` = 3. 20,000 bytes therefore cost at most about 7,000 tokens.

## 5. What `/doctor` does with an oversized `CLAUDE.md`

Facts:

- "The `/doctor` checkup proposes trims for a checked-in CLAUDE.md: it cuts content Claude can derive from the codebase, such as directory layouts, dependency lists, and architecture overviews, and keeps pitfalls, rationale, and conventions that differ from tool defaults." [mem]
- "The `/doctor` checkup flags oversized memory files and unused extensions" [err].
- The check was added in v2.1.206; `/doctor prompt-audit` in v2.1.283 [cl].
- In 2.1.319, `/doctor` is a bundled prompt command: it returns a prompt the model works through in the current conversation, with eleven checks [bin].
- Check 3, "trim derivable content from checked-in CLAUDE.md files", tells the model: "Prioritize files at or near the large-CLAUDE.md warning threshold". It describes that threshold as "roughly 5% of the model's context window in characters, with a floor of ~40,000 chars". It also asks to "state in the report which files trip it before vs after the proposed cuts" and to "Quote each removed block verbatim in the proposal" [bin].
- That wording is looser than the code: the code multiplies 5% of the window in tokens by `c`, which gives 150,000 characters, not 50,000, on a 1M window for later models.
- Check 4 proposes moving the content that survives check 3 into nested `CLAUDE.md` files and skills, and applies nothing before confirmation [bin].
- `/doctor prompt-audit` runs through the bundled `claude-api` skill and reports "instructions written for older models, references to files or commands that don't exist, and files that contradict each other", changing nothing until asked [mem].

Not tried: running `/doctor` on this repository costs a full session, and the account's usage limit was reached during this research. Inferences:

- `/doctor` does not truncate or refuse a 480 KB `CLAUDE.md`. The file is already in context, and to quote or re-read parts of it the model goes through the Read tool, whose whole-file refusal over 256 KB forces paged reads (section 6).
- Its proposal, with every removed block quoted verbatim, would be of the order of the file itself.
- Run in a session that compacts at about 267,000 tokens and starts at about 254,000 (section 8), it would run out of room before finishing. Run in a session with the default 1M window, it has room.

## 6. The Read tool's part

The Read tool does not take part in loading instruction files: the launch and on-demand loaders read the file themselves, with the 4 MiB cap and the limit `L` [bin]. Its limits apply when Claude reads such a file on purpose: to finish a truncated rule, to edit `CLAUDE.md`, or for `/doctor`. "By default one call returns at most 25,000 tokens, or the value you set in `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`, and refuses a whole file over 256 KB, so Claude reads a larger file in pages with `offset` and `limit`. On Claude Code v2.1.296 or later it can instead read the whole file, or a long line range, in one call by setting `allow_large: true`" [tools]. This repo's `CLAUDE.md`, at 492,126 bytes, is over 256 KB [measure]. Its longest line, 63,168 characters, is about 21,000 tokens at `c` = 3, so a page of a few lines can already near the 25,000-token cap (inference).

## 7. `@path` imports

- Imports "load together with the CLAUDE.md that imports them", so they "don't reduce its context cost" [mem].
- Each import counts as a separate file for `L` and adds its own length to the combined total [mem] [bin].
- Each imported file is read with the same 4 MiB cap, and imports nest to four hops [bin] [mem].
- A path in backticks or in a fenced code block is not imported [mem].
- An import of a launch file is loaded whole at launch. An import of an on-demand file is cut past `L` [mem].

## 8. Can a session work with this always-loaded context?

Facts:

- `/context` on 2026-11-05, Opus 5.5, 1M window, auto-compact window 1M: "Memory files: 174.3k tokens (17.4%)" and "176k tokens (17.6%)", "1 file", largest `CLAUDE.md`, total at session start 208.9k and 210.7k tokens [ctx].
- `CLAUDE.md` then held 503,478 and 489,100 UTF-16 units at the latest commit of local `main` before each run (af6a885, de51791), so about 2.8 to 2.9 characters per token. The working copy may have differed from those commits, since the larger file gave the smaller count (inference).
- On 2026-11-11 the first request of two Admin Panel sessions carried 254,520 and 253,521 input tokens [tx].
- The project settings at c663d86 set `CLAUDE_CODE_AUTO_COMPACT_WINDOW` to `300000` (`.claude/settings.json`), added by 0b55ef6 on 2026-11-11 [measure]. That variable takes precedence over the command, the flag and the `autoCompactWindow` setting [mc].
- The two sessions compacted automatically 21 and 13 times. Each compaction started at 266,916 to 276,162 tokens and left 13,588 to 24,741 tokens of conversation. Session `6fe4762a…` stopped four times on "Autocompact is thrashing", from 16:53Z; session `9712b338…` once, at 15:39Z [tx].
- Without that variable, models with a native 1M window, Opus 4.7 and later among them, compact at about 967K tokens [mc].
- The docs name this case: when "the other rows together are larger" than `Messages`, "what loads at session start leaves too little room to work in, so trim what loads at startup" [ts].
- Issue [gh-85489] reports the same loop from instruction files re-injected after each compaction and is open. A comment of 2026-10-28 points to that paragraph of the docs.

Inferences:

- A compaction window of 300,000 tokens with a reserve of about 33,000 (the "Autocompact buffer" `/context` showed on 1M [ctx]) puts the trigger near 267,000, which matches the observed starts.
- With about 254,000 tokens fixed, re-injected after every compaction [cw], a session has about 13,000 tokens to work in. One file read or one subagent report fills that, so "refilled to the limit within 3 turns" three times in a row follows.
- On the default 1M window the same session has about 700,000 tokens of room and works, at the cost of sending about 175,000 tokens of `CLAUDE.md` with every request.
- On a 200K window, through `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`, a model with a native 200K window, or a fallback from 1M to 200K (v2.1.286 [cl]), the fixed context alone passes the window. The first request then fails with "Prompt is too long", which a single exchange cannot compact [err].
- Every subagent starts with the same instruction files, so each starts at the same fixed cost and under the same compaction window when the variable is in its environment [prior] (it cites the sub-agents docs).

## 9. The claims of `[prior]` §7, re-verified

| Claim left unverified in `[prior]` §7                                                          | Verdict on 2026-11-11                                                                                                                                                                                                                                                                                                                                                                    |
| :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `CLAUDE.md` costs about 159,000 tokens (a regression estimate)                             | **Does not hold as a count.** `/context` reported 174.3k and 176k tokens for that one file on 2026-11-05 [ctx], for 489,100 to 503,478 UTF-16 units. For today's 489,440 units, expect about 170,000 to 176,000 tokens on Opus 5.5 (inference).                                                                                                                                          |
| Whether a path-scoped rule loads on Grep or Glob results                                       | **Still unverified.** The docs still name only "the Read, Write, or Edit tool" and Bash commands that view a single file, such as `cat` or `head` [mem]; v2.1.293 fixed the Bash case [cl]. Left to the sibling ticket on scoped-rule loading.                                                                                                                                           |
| Whether globs containing `(` or `)` match literally                                            | **Still unverified.** The docs cover braces, with a shared budget of 1,000 expanded patterns and 4 MiB per rule, and the escaping of `[` [mem], nothing on parentheses. Left to the sibling ticket.                                                                                                                                                                                      |
| Whether a rule arrives before or after Claude writes a new file's content                      | **Still unverified**: the docs say the rule loads when Claude uses Write on a matching file [mem], not at which point of the call. Left to the sibling ticket.                                                                                                                                                                                                                           |
| The thresholds of the startup warnings on instruction file length and combined length          | **Settled**, sections 1 and 2: `L` and `T` above, from the code [bin], with the per-file figures matching the docs [mem]. The docs still give no figure for the startup warnings themselves, only for the on-demand cut, but the code uses the same function for both.                                                                                                                   |
| The units of the skill listing budget ("1% of the model's context window", a character budget) | **Settled: characters.** The budget is `floor(W × c × 0.01)` characters, with `skillListingBudgetFraction` replacing 0.01 and `SLASH_COMMAND_TOOL_CHAR_BUDGET` replacing the whole figure. Each description plus `when_to_use` is capped at `skillListingMaxDescChars`, default 1,536 [bin]. For example 30,000 characters on a 1M window at `c` = 3, 8,000 on a 200K window at `c` = 4. |
| Whether `/doctor` and `/doctor prompt-audit` handle a 474 KB `CLAUDE.md` in one pass           | **Not tried**, see section 5. Facts that bear on it: both run as prompts in the current session [bin] [mem], and Read refuses a whole file over 256 KB [tools]. Inference: one pass is possible on a 1M compaction window, not on today's 300,000.                                                                                                                                       |
| That transcripts hold `usage` is observed, not documented                                      | **Holds as an observation**, again on 2026-11-11: assistant entries carry `message.usage`, and compaction entries carry `compactMetadata` with `preTokens` and `postTokens` [tx]. No page read for this ticket documents the transcript format.                                                                                                                                          |
| The sub-agents page's section on forks, and the hooks guide, were not read in full             | **Unchanged**: outside the question of #424, not read.                                                                                                                                                                                                                                                                                                                                   |
| Every design in `[prior]` §5 and every figure after the split in §6.2 is inferred, untried     | **Unchanged**: outside the question of #424.                                                                                                                                                                                                                                                                                                                                             |

## 10. Not verified here

- The startup banner and `/status` lines were read in the code, not seen on screen. An interactive session was not started for this research.
- The trials ran on a 200K window only; the 150,000 figure of a 1M window comes from the docs and the code.
- `content.length` counting a CRLF as two units is read from the code, not tried.
- Whether `tengu_temporal_haven` is on for any account.
- The token count of today's `CLAUDE.md`: the figures of section 8 date from 2026-11-05.
