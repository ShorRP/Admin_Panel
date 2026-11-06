---
paths:
  - ".github/**"
---

# Gotchas of CI

- GitHub turns off a scheduled workflow of a public repository, as this one has been since 2026-10-27 (#100), after 60 days without activity in it (https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows, read 2026-10-25), so the daily audit and the weekly contract run would stop with no failed run to say so (inferred; **Scheduled workflows**). `gh workflow enable <workflow>` turns one back on (`gh workflow enable --help`, gh 2.101.0). The line goes if the repository goes private again.
- The `Check` job's end-to-end step grows with every page, and the job gave up at its 10 minutes on #394's pull request: run 42182828730, of 315 tests, cancelled in `pnpm test:e2e` once the step had run 8 min 21 s, all that the other steps left of the 10 minutes, where the runs of 285 tests took 8 min 10 s (`main`, run 42132912057, 2026-11-06) and 7 min 58 s (run 42131672687), the other steps taking about 1 min 40 s (`gh run view <run> --json jobs`, 2026-11-06). At about 1.7 s a test on the runner's 2 workers, 315 tests need about 9 min, which the job's remaining 8 min 20 s cannot hold, so the job's `timeout-minutes` is 15 (decided by the agent on 2026-11-06, on #394, for Gilles to review). A cancelled `Check` with `The operation was canceled.` as its last line, after `Running N tests using 2 workers`, is this limit and no hung test.
