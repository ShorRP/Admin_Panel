---
paths:
  - "src/monitoring/**"
  - "src/instrumentation.ts"
---

# Gotchas of the monitoring

- `instrumentation.ts` gets its own copy of every module it imports, so an error a page or a Route Handler throws is no `instanceof` the class `instrumentation.ts` sees: on 2026-10-25, with Next.js 16.4.2 and Turbopack, a `DiscordError` thrown by a throwaway page and by a throwaway Route Handler reached `onRequestError` with `instanceof DiscordError` false, its `name` and its fields intact. Code that inspects an error there reads its fields, as `isPanelError` does.
