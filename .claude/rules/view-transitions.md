---
paths:
  - "src/**/*.tsx"
  - "src/ui/globals.css"
  - "e2e/**"
---

# Gotchas of React's view transitions

What React DOM `19.3.0-canary-278794d7-20261002`, the one Next.js 16.4.2 runs the App Router on, does to a `<ViewTransition>`, which every component that uses one must plan for. The trials and the line numbers are in `docs/ui.md`, **View transitions**; an update of Next.js tries each line again (`.claude/rules/dependencies.md`, **Docs that name a version**).

- A `<ViewTransition>` that a transition leaves unchanged is hidden by an animation of no duration and `fill: "forwards"` on its `::view-transition-group`, which stays in `document.getAnimations()`, finished, once the transition has ended. A `<ViewTransition>` in a layout that stays mounted, such as one around the header's name and its skeleton, so leaves one more finished animation behind at each navigation, where the current section's bar, which every navigation moves, and the blocked words' tiles, in a page, left none: a new `<ViewTransition>` in `src/app/(staff)/layout.tsx` needs the same check (#139, #166).
- A `<Suspense>` that reveals after a client navigation hides the page's own `<ViewTransition>` the same way, through an animation that outlives the transition and keeps the page's group at `opacity: 0` when a later navigation makes it exit, so that the page then vanishes rather than fading out (inferred, #212).
- React marks a `<ViewTransition>` as updated whenever a prop of an element inside it changes, not only when it moves, and one whose `update` names a class then gets the browser's default crossfade of its old and new snapshots, under reduced motion too, where `globals.css` stops only the groups: an `update` that moves elements names a class whose rules show the new snapshot at once, `slide-into-place` of `src/ui/globals.css` (seen on an add, inferred on a removal, #166).
- React animates the `enter` or `exit` of a `<ViewTransition>` only when no DOM element sits between it and the top of what a commit inserts or deletes, so that a `<ul>` that renders only with items starts no transition for its first item added or its last removed: render the `<ul>` while the list is empty (#138).
