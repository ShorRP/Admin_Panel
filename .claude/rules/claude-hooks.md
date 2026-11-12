---
paths:
  - ".claude/settings.json"
  - ".claude/hooks/**"
---

# Gotchas of Claude Code's hooks

- Before changing `check-comments-before-pr.mjs`, read `.claude/rules/check-comments.md`, **The PR hook**: it holds what the hook recognises and why, and no read of the hook loads it.
- A hook added to `.claude/settings.json` during a session may not run in that session, though the hooks docs say direct edits to hooks in settings files "are normally picked up automatically by the file watcher" (https://code.claude.com/docs/en/hooks, read 2026-10-24). On 2026-10-24, in the desktop app's worktree session that added the format hook, neither it nor a probe hook that only appended to a file ran after a `Write`, while the format hook's command, run by hand on that file, formatted it. Check a new hook from a new session (inferred to work, not tried).
