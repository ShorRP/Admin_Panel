---
paths:
  - "components.json"
  - "src/ui/**"
---

# Gotchas of shadcn/ui's CLI

- `shadcn init --preset nova` (shadcn 4.22.1, 2026-10-24) also wrote the button to `src/components/ui/`, a `src/lib/utils.ts`, Geist through `next/font/google` in `src/app/layout.tsx`, and `--font-sans`, `--font-heading` and `html { @apply font-sans }` in `globals.css`; #67 undid them. `shadcn add button` then left `globals.css` alone. Running `init` again, for a new preset say, would presumably redo them: inferred, not tried.
