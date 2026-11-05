---
paths:
  - ".github/**"
---

# Gotchas of CI

- GitHub turns off a scheduled workflow of a public repository, as this one has been since 2026-10-27 (#100), after 60 days without activity in it (https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows, read 2026-10-25), so the daily audit and the weekly contract run would stop with no failed run to say so (inferred; **Scheduled workflows**). `gh workflow enable <workflow>` turns one back on (`gh workflow enable --help`, gh 2.101.0). The line goes if the repository goes private again.
