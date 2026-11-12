---
paths:
  - ".claude/settings.json"
  - ".claude/hooks/**"
---

# Gotchas of Claude Code's hooks

- Before changing `check-comments-before-pr.mjs`, read `.claude/rules/check-comments.md`, **The PR hook**: it holds what the hook recognises and why, and no read of the hook loads it.
- A hook added to `.claude/settings.json` during a session may not run in that session, though the hooks docs say direct edits to hooks in settings files "are normally picked up automatically by the file watcher" (https://code.claude.com/docs/en/hooks, read 2026-10-24). On 2026-10-24, in the desktop app's worktree session that added the format hook, neither it nor a probe hook that only appended to a file ran after a `Write`, while the format hook's command, run by hand on that file, formatted it. Check a new hook from a new session (inferred to work, not tried).

## The format hook

- `.claude/hooks/format-after-edit.mjs`, a `PostToolUse` hook of `.claude/settings.json` on `Edit|Write`, formats the file the tool touched. It calls Prettier from the project's root, `CLAUDE_PROJECT_DIR`, since Prettier resolves a plugin's package name from the working directory (decided by the agent on 2026-11-12, on #450, for Gilles to review, since the code of the hook sits in `.claude/hooks/` and `.claude/rules/prettier.md` is scoped to Prettier's files alone).
- That root is where the session started, and a session that enters a worktree keeps it (https://code.claude.com/docs/en/hooks), so such a session's edits in the worktree, which the main checkout's `.gitignore` lists, go unformatted until `pnpm format` (inferred from the code).
- It leaves alone a file outside the project, one that `.gitignore` or `.prettierignore` lists, and one Prettier does not know, and exits 2 on a file Prettier cannot parse, so that Claude reads why (`test/format-after-edit.test.mjs`).
