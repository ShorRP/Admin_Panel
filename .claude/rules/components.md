---
paths:
  - "src/**/*.tsx"
---

# The rules every component follows

`CLAUDE.md`, **Interface**, holds the principles. These are the rules every component that shows a form, a list or an account applies, which no folder's rule holds, moved here from the old **Interface** and **Responsive** of `CLAUDE.md` because a rule scoped to `src/**/*.tsx` loads wherever a component is edited (decided by the agent on 2026-11-13, on #453, for Gilles to review: #426 names no rule for them).

## Forms

- A form's client leaf calls `useActionState` with `null` as its initial state and hands `state` and `pending` to a component whose output follows from its props alone. That component always renders a `role="alert"` region for the message of `{ ok: false }`, empty for `null`, which the field points to through `aria-describedby`: a live region inserted with its text already in is announced unreliably (inferred, not checked with a screen reader). The submit button is `disabled` while `pending`.
- React resets a `<form action>` after every submission, a failed one included, so a failed write hands back each field as typed (`CLAUDE.md`, **Write results**) and the field takes it as its `defaultValue`. The reset puts the word back after a failure and empties the field after a success: inferred from the order of React's commit, and `e2e/blocked-words.test.ts` checks it.
- An action that throws under `useActionState` rejects its state, which React throws again while rendering, so `error.tsx` takes it like a failed read.
- No `required`, `maxLength` or `pattern`: the browser's bubbles would replace the domain's French message, and `maxLength` would silently cut a pasted word. The domain is the one validator, and nothing is built to work without JavaScript.
- A write that lands says so in a toast (`.claude/rules/ui-overlays.md`, **Toasts and failure messages**).

## Layout and links

- Breakpoints are Tailwind's and no other, written mobile first: the unprefixed class is the phone's. No arbitrary `min-[…]` breakpoint on the viewport; a component that must adapt to the room it is given uses a container query (`@container` and `@min-[…]:`).
- A flex or grid child that holds text takes `min-w-0`, a grid track that holds text takes `minmax(0,1fr)`, and a word that may be long, such as a name, an ID, a reason or a blocked word, takes `wrap-anywhere` or `truncate` with its whole value in `title`. Nothing scrolls the page sideways at 360 px: a wide table scrolls inside its own box. `pnpm lint` refuses a fixed width above 20 rem, a grid of more than two columns and a length in `vh` that no breakpoint or container variant guards (`.claude/rules/eslint.md`, **The responsive classes**).
- A `<Suspense>` fallback is a skeleton in the shape of what loads, through `SuspenseWithSkeleton` (`.claude/rules/ui.md`, **Avatars and skeletons**).
- An account shown by its avatar or its name links to its record for a staff member who moderates, through `recordHrefForModerator` (`.claude/rules/records.md`, **Avatars and the link to a record**).
