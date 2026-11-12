---
paths:
  - "scripts/check-comments.mjs"
  - "test/check-comments.test.mjs"
---

# The comment check

`pnpm check:comments` (`scripts/check-comments.mjs`) keeps the repository free of comments (`CLAUDE.md`, **No comments**). `test/check-comments.test.mjs` names each case a reader handles, and a `:n` below is a line of it. The runs behind the limits and the quotes of the docs the readers follow are in `docs/check-comments.md`: read it before changing how a file type is read.

## What it checks

- It checks every tracked or untracked, non-ignored file of the repository that holds the folder it runs from, so a subfolder or a worktree checks its own repository (`repositoryRoot`, `repositoryFiles`; `:199`). It reports `file:line:column snippet`, exits 1 on a comment, a file it cannot parse or a file of an unknown type, and exits 2 outside any repository, with one line that names the folder (`:181`).
- `familyOf` picks the reader from the extension, or from the name: script files (`.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`, through `@babel/parser`, which leaves alone the tool directives of `DIRECTIVES`; `CLAUDE.md`, **Directives**), JSON (`.json`, `.jsonc`), CSS (`.css`, `.scss`), markup (`.html`, `.htm`, `.svg`, `.xml`), Markdown (`.md`), SQL (`.sql`), YAML (`.yml`, `.yaml`), Python (`.py`), PowerShell (`.ps1`), and the files with `#` comments: `.toml`, `.sh`, `.env*`, `.gitignore`, `.gitattributes`, `.prettierignore`, `.git-blame-ignore-revs`, `.npmrc`, `.editorconfig` and `Dockerfile`.
- `.sh`, `.toml` and `.env*` files have a reader of their own, since a string, a here-document or a quoted value can run over many lines and hold a `#` that is no comment (#33). YAML goes through its parser first, which masks a quoted scalar that runs over many lines; the other files with `#` comments are read line by line, where a quote ends with its line (`hashComments`).
- A file of any other type is reported as « unknown file type » until the script reads it or lists it as commentless: `COMMENTLESS_EXTENSIONS` lists the images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.ico`, `.bmp`) and the fonts (`.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`), `COMMENTLESS_FILES` `pnpm-lock.yaml`. It does not tell text from binary, so a new type of either fails the check until it is listed (decided by the agent on 2026-10-30, on #22, for Gilles to review).
- A file the reader cannot follow to its end is reported as « cannot be parsed », never skipped, so that the rest of a file is never hidden: a Markdown code fence or YAML header, a Python `'''` or `"""`, a SQL `'` or `"` string, a PowerShell `<#`, `'`, `"` or here-string, a shell or TOML quote, a shell here-document, `$(` or backtick substitution that never closes (`:475`, `:1047`, `:1453`).
- The footer counts the comments, the files it cannot parse and the files of an unknown type, each on a line of its own, none for a count of 0, and gives the advice to move the why elsewhere only when it found a comment. The PR hook's refusal asks to remove each comment, to fix each file that cannot be parsed, and to teach the check each unknown file type or list it as a type without comments, since it quotes all three kinds of line (decided by the agent on 2026-10-30, on #299, for Gilles to review; `:135`, `:240-280`).
- Where only the language's own parser could tell a comment from text, the check reports the doubtful `#` and accepts the false positive, so that it shows where a missed comment would hide.

## Markdown

- A fenced code block (three backticks or `~~~`) and an inline code span are code, not comments, so a passage may quote `<!-- -->` in either. An indented code block is not recognised, so a comment in one is reported, and a line that opens an HTML comment ends an inline code span, as a blank line does (decided by the agent on 2026-10-30, on #22, for Gilles to review).
- A link definition whose destination is `#` or `<>` and that carries a title, such as `[//]: # (why)` or `[comment]: # "why"`, is a comment, since it shows nothing in a rendering and its title is all it holds; an ordinary definition is not (inferred, not checked against CommonMark's specification). It is reported when it fills a line, after a quote or list marker too, and right after a line of a paragraph, where CommonMark would render it as text (inferred; `:1268-1330`). So `[top]: # "Top"` is a false positive.
- A definition cut over several lines, with its destination or its title on the next line, its title across lines, or a `\]` in its label, goes unreported (decided by the agent on 2026-10-30, on #297, for Gilles to review).
- The YAML header is the lines between a `---` on the very first line and the next `---` line, provided that at least one of them is a `key:` line (`yamlHeaderOf`; `:1140-1266`). A header is read as a `.yml` file is, so a `#` there is a comment. A header that is not valid YAML, such as a `description` holding `work: settle`, is read line by line with its quotes ignored, rather than reported as unparsable: a `#` after a space counts as a comment there even inside quotes, a false positive (`:1247`).
- A file that opens with a `---` rule, holds a line such as `Note: text` and has a second `---` further down is read as a header, and the same file without a second one is reported as unparsable, the price of telling a header from a rule by its `key:` line (inferred from the code) (decided by the agent on 2026-10-30, on #298, for Gilles to review).

## SQL

- `--` and `/* */` are comments. A `$$…$$` or `$tag$…$tag$` body is read as SQL up to its closing delimiter, the first one after the opening one, with the tag case sensitive, as PostgreSQL ends the string there (`docs/check-comments.md`, **SQL**), so its comments are reported and a nested body with another tag is read to its own delimiter (`:428-639`).
- A `'` or `"` left open in a body, and a delimiter never closed, make the file unreadable: write a text with a lone apostrophe as a `'don''t'` string, not `$$don't$$` (#309). A `$` opens no delimiter right after an identifier character, nor as a parameter, `$1`, nor without a closing `$` (`:641`).
- The check reads only the character before the `$`, where PostgreSQL's lexer follows whole identifiers (decided by the agent on 2026-10-30, on #309, for Gilles to review).

## Shell

- `$((…))` and `((…))` are skipped as arithmetic, so that their `<<` is a shift and not a here-document (decided by the agent on 2026-10-30, on #33, for Gilles to review).
- The reader follows `$(…)` and backtick substitutions, even inside double quotes, `${…}` as one unit, `$$` as one token, and the patterns of a `case` inside a `$(…)`, so that a `)` or a `#` there neither ends the substitution early nor counts as a comment; a `'` in a `${…}` opens a quote even inside double quotes (`:798-970`). Each construct was checked against bash (`bash -n`, then `bash -c`; `docs/check-comments.md`, **Shell**): prove a new one the same way.
- A `case` is followed where a command starts: at the start of a file or substitution, after a newline, `;`, `&`, `|`, `(` or `)`, after a `{` or a `!` followed by a blank, and after `time`, `then`, `do`, `else`, `elif`, `if`, `while`, `until` and the `in` that opens a `case` (`SHELL_KEYWORD`, `followShellKeyword`; `:853-901`) (the words that start a command decided by the agent on 2026-10-30, on #302, for Gilles to review).

## TOML and `.env*`

- In TOML, any `#` outside a string is a comment, so `a = 1#c` is reported (decided by the agent on 2026-10-30, on #33, for Gilles to review). A `"""` or `'''` string runs over many lines, and a `"` or `'` one must close on its line, or the file is unreadable. `#!` is a comment there and in `.env*`.
- In a `.env*` file, a quote (`"`, `'` or a backtick) opens a value only right after `KEY=`, `export KEY=` or `KEY: `, and closes where the `LINE` expression of dotenv 17.4.2 closes it (`dotenvValueEnd`), so a quoted value may run over many lines and a quote anywhere else is a plain character: the `#` of `KEY=a "b # c"` is reported (decided by the agent on 2026-10-30, on #33, for Gilles to review). A `#` starts a comment at the start of a line, after whitespace or right after a closing quote: `KEY=a #b` and `KEY="a"#b` hold one, `KEY=a#b` none.
- A quote that never closes in a `.sh` or `.toml` file makes the file unreadable rather than hiding the rest of it, as for YAML, while in a `.env*` file it is a plain character, as dotenv takes it, and the lines after it are still read (decided by the agent on 2026-10-30, on #33, for Gilles to review; `:1047`).

## PowerShell

- Any `#` outside a string is a comment, but for one escaped with a backtick, and `<# #>` too: telling a bare word from an expression takes PowerShell's own parser, so `echo a#b` is reported, and so is `$s = "a $("b # c") d"`, where a subexpression holds quotes, both false positives (decided by the agent on 2026-10-30, on #22, for Gilles to review).

## Known limits

- The `)` of the first pattern of a `case` that the reader does not take for one ends a `$(…)` inside double quotes early, and the comments after it, up to the closing quote, are missed, where the same without quotes reports them. Three forms do it, all valid in bash: a `case` after a word the reader does not know to leave a command starting, such as the `-p` of `time -p`; a pattern spelled `case` with a blank after it; and a pattern spelled `esac` in parentheses, `(esac)`. A redirection before `case` is a syntax error in bash, so it is no fourth form. They stay unfixed, since telling a pattern from a command takes a state that follows each `;;`, for forms nothing in the repository meets (decided by the agent on 2026-10-30, on #302, for Gilles to review; the runs are in `docs/check-comments.md`, **Shell**).
- Neither `$[…]` nor `.envrc` is read as shell (decided by the agent on 2026-10-30, on #33, for Gilles to review). The old arithmetic `$[…]` opens a here-document with its `<<`, which never closes, so a `.sh` file that holds `x=$[1 << 2]` is reported unreadable, which shows. A `.envrc` stays on the `.env*` reader, since `familyOf` and `hashFileComments` take every name that starts with `.env`, though direnv loads it into a bash sub-shell: the `#` of a here-document in it is reported, and a comment inside a `KEY="$(…)"` that spans lines is missed.
- Inside double quotes the reader takes `$$` for one token with no claim of exactness. The repository holds no `.sh`, `.toml` or `.envrc` file and its `.env.example` has no comment, so none of this shows today (`docs/check-comments.md`, **Shell**, **Limits**).

## The PR hook

`.claude/hooks/check-comments-before-pr.mjs`, which `.claude/settings.json` registers as a `PreToolUse` hook on `Bash` and `PowerShell` calls, runs the check before a PR is created and denies the call with the report when the check exits 1, or with its reason when it cannot run; a call it cannot read is denied too (`:25`, `:49-98`).

- It recognises `gh pr create` and its alias `gh pr new` with the repository chosen by `-R` or `--repo`, before `pr` or between `pr` and the verb, in every spelling gh takes (`CREATE_PR`, `REPO_FLAG`; `docs/check-comments.md`, **The PR hook**). Any other verb passes.
- It recognises them too when a backslash, or a backtick for PowerShell, at the end of a line splits the command, since it joins those lines before it looks (`LINE_CONTINUATION`; `:100`; the PowerShell backtick is inferred from PowerShell's rule, not tried; decided by the agent on 2026-10-30, on #293, for Gilles to review).
- It runs the check from the `cwd` of its input, which follows Claude into a worktree, while `$CLAUDE_PROJECT_DIR`, where the hook's own copy of the script sits, stays at the project root where the session started (https://code.claude.com/docs/en/hooks), so a PR from a worktree gets that worktree checked (inferred from those docs and from tests in temporary repositories, since no session in a worktree has tried it; `:118`).
- From a folder in no repository it refuses the PR, since it has nothing to check, rather than check the repository of its own copy (decided by the agent on 2026-10-30, on #19, for Gilles to review; `:160`).
