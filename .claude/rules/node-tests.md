---
paths:
  - "test/**"
  - "scripts/**"
---

# Gotchas of the tooling's scripts and tests

- On Windows, a child process spawned with an `env` that holds no `PATH` still finds every command of the parent's `PATH`, while a `PATH` naming an empty folder hides them: a `node -e` child that ran `execFileSync("gh", ["--version"])` printed `gh version 2.101.0` under the first and threw `ENOENT` under the second (2026-11-02, #58). That libuv copies a few variables it requires, `PATH` among them, from the parent into a Windows child's environment that lacks them is inferred, not read in its code. So a test that keeps a script from reaching a command, as `backlogWithoutGh` in `test/groom-backlog.test.mjs` keeps `backlog.mjs` from GitHub, sets `PATH` to an empty folder: #58's first red run removed it, and `apply` posted its plan's one comment on #5 for real (2026-11-02).
