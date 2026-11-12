# The comment check

The reference behind `.claude/rules/check-comments.md`: what the PR hook was tried against, the page of PostgreSQL the SQL reader follows, the bash runs behind the shell reader and its limits, the dotenv expression the `.env*` reader copies, and what the repository held when each was measured. The rule says what to do; this file says how it was known.

The `node_modules` citations are those of dotenv 17.4.2 and `@next/env` 16.4.2: an update of a package re-reads the citations that name it (**Docs that name a version** of `CLAUDE.md`).

## The PR hook

- `.claude/settings.json` registers the hook on every `Bash` and `PowerShell` call (`matcher: "^(Bash|PowerShell)$"`), so a PowerShell call reaches it, and `LINE_CONTINUATION` of `.claude/hooks/check-comments-before-pr.mjs` joins a backtick that ends a line, PowerShell's continuation, as well as a backslash. The PowerShell backtick is inferred from PowerShell's rule for a line continuation, and was not tried.
- gh 2.101.0 answered `gh pr view` with each of the five spellings `-R o/r`, `-R=o/r`, `-Ro/r`, `--repo o/r` and `--repo=o/r`, before `pr` and between `pr` and the verb, and `gh pr create --help` lists `-R, --repo` under « INHERITED FLAGS » (2026-10-30, #293). `CREATE_PR` and `REPO_FLAG` of the hook take each of them in both places.
- The hook runs the check from the `cwd` of its input, which follows Claude into a worktree, while `$CLAUDE_PROJECT_DIR`, where the hook's own copy of the script sits, stays at the project root where the session started (https://code.claude.com/docs/en/hooks, read 2026-10-30). No session in a worktree has tried it; the tests that make a temporary repository stand for one.

## Markdown

- The reading of a link definition with a `#` or `<>` destination and a title as a comment, and of one right after a line of a paragraph as a comment where CommonMark would render it as text, is inferred and was not checked against CommonMark's specification.
- At `ef968f8`, on 2026-10-30, ten tracked files opened with a YAML header, the three `SKILL.md` of `.claude/skills/` and the seven ADRs (`git ls-files '*.md'` and the first line of each file). Nine of the ten headers parsed as YAML. `groom-backlog`'s `SKILL.md` did not, its `description` holding `work: settle`, and `parseAllDocuments` of `yaml` 2.9.1 answered `BLOCK_AS_IMPLICIT_KEY` (a throwaway script over those ten headers, 2026-10-30). That copy was shared with EsportCards and could not change, until the agent-workflow plugin replaced it on 2026-11-10. This is why a header that is not valid YAML is read line by line rather than reported as unparsable. On 2026-11-12, 35 tracked Markdown files opened with `---`, the 10 ADRs and the 25 rules with their `paths:` (the first line of each file).

## SQL

PostgreSQL's page on lexical structure (https://www.postgresql.org/docs/current/sql-syntax-lexical.html, read 2026-10-30) is what the SQL reader follows:

- §4.1.2.2: a backslash escapes only in an `E'…'` string, as PostgreSQL has read it since 9.1.
- §4.1.2.4: a dollar-quoted string ends at the first closing delimiter after the opening one, with the tag case sensitive, as PostgreSQL ends the string there. PostgreSQL asks a dollar-quoted string that follows a keyword or an identifier to be separated from it by whitespace. And "single quotes can be used without needing to be escaped" in a body, which is why `$$don't$$` is valid SQL and is reported as unreadable all the same (#309): the reader reads the quotes of a body as it reads them elsewhere.

## Shell

Two kinds of run back the shell reader, and each bullet says which. A **bash** run says what bash does: GNU bash 5.3.15, `bash -n`, then `bash` or `bash -c`, on 2026-10-30 (#302). A **check** run says what the reader reports: `checkFile`, on the same day. The tests of `test/check-comments.test.mjs` hold the check's side of each.

- **Bash**: `y='a)b'; x="$(echo ${y#a)} # hidden`, a line break, `)"; printf '[%s]\n' "$x"` prints `[b]`, so the `)` of `${y#a)}` does not end the `$(…)` and the `#` after it is a comment; `printf '[%s]\n' ${y:-a # b}`, with `y` unset, prints `[a]`, `[#]` and `[b]`, so the `#` after a blank inside `${y:-a # b}` is no comment.
- **Bash**: `echo $${x # c}` exits 0 and prints the process ID then `{x`, so the `{` after `$$` opens no parameter and a `#` after a blank is a comment, and `x="$(echo $${y # c`, a line break, `)"` leaves `x` ending in `{y`. `x="$${y # c"` passes `bash -n` and fails at run time on a bad substitution, which is why the reader makes no claim of exactness for `$$` inside double quotes, where it takes it for one token too.
- **Bash**: `"${y:-'}"` and a `${y` that never closes exit 2 on `unexpected EOF while looking for matching`. **Check**: the reader reports such a file unreadable.
- **Bash**: `case case in case) echo pattern;; esac` prints `pattern`, so a pattern spelled `case` with no blank after it is a pattern. **Check**: `echo case a in b)` opens no `case`.
- The three limits. **Check**: each is missed by the reader. `x="$(time -p case a in a) echo ;; # hidden\n esac)"` reports nothing, with `\n` for a line break, where the same without the double quotes reports the comment; `x="$(case case in\n case ) echo p ;; # hidden\n esac)"` is missed because the reader takes the pattern `case ` for the start of a second `case`; and a pattern `(esac)` is missed because the reader takes it for the end of the first `case`, so that the `)` of the next pattern ends the substitution. **Bash**: all three are valid: `x="$(time -p case a in a) echo t;; esac)"; printf '[%s]\n' "$x"` prints `[t]`, `x="$(case case in`, a line break, ` case ) echo p ;;`, a line break, ` esac)"; printf '[%s]\n' "$x"` prints `[p]`, and a pattern `(esac)` runs. A redirection before `case`, as in `>/dev/null case a in a) echo t;; esac`, is a syntax error in bash, so it is no fourth form.
- **Check**: `x=$[1 << 2]` opens a here-document with its `<<`, which never closes, so the reader reports the `.sh` file unreadable.

## `.env*` and `.envrc`

- The `LINE` expression of dotenv 17.4.2 is at `node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js:38`. The bundle of `@next/env` 16.4.2, `node_modules/.pnpm/@next+env@16.4.2/node_modules/@next/env/dist/index.js`, holds the same expression, compared by a script on 2026-10-30, and its body is the bundle's again on 2026-11-12. `dotenvValueEnd` closes a quoted value where that expression does, backtracking to an escaped quote when the first closing quote has a tail the expression refuses.
- direnv loads a `.envrc` into a bash sub-shell (https://direnv.net/man/direnv.1.html, read 2026-10-30). The check keeps it on the `.env*` reader, since `familyOf` and `hashFileComments` take every name that starts with `.env` (`scripts/check-comments.mjs:97` and `:556`, which were `:84` and `:414` at 80cc714).

## What the repository holds

- On 2026-10-30, `git ls-files` listed no `.envrc`, `.sh` or `.toml` file, and the one `.env.example` had no comment. On 2026-11-12 it lists no `.sh`, `.toml`, `.sql`, `.py`, `.ps1` or `.envrc` file either, and `.env.example` is the only `.env*` file, with no comment (`pnpm check:comments` passes), so the limits of the shell, TOML and `.env*` readers show nothing today.
