---
paths:
  - "eslint.config.mjs"
  - "eslint-rules/**"
---

# Gotchas of the lint configuration

- `eslint-plugin-jsx-a11y`'s `flatConfigs.recommended` registers a plugin object other than the one `eslint-config-next` registers, and ESLint 10.13.0 refuses the pair: « Cannot redefine plugin "jsx-a11y" » (2026-10-24). So `eslint.config.mjs` takes only its `rules`, on the files `eslint-config-next` registers the plugin for. A rule given only a severity keeps the options set before it, such as `alt-text`'s `img: ["Image"]` (`pnpm exec eslint --print-config src/ui/button.tsx`).
- `import/order`, from the `eslint-plugin-import` 2.32.0 that `eslint-config-next` bundles without turning the rule on, crashes on ESLint 10.13.0 once it has an import to reorder: `pnpm exec eslint --rule '{"import/order":["error",{"alphabetize":{"order":"asc"}}]}' .` stops on `.claude/skills/groom-backlog/scripts/backlog.mjs` with « TypeError: sourceCode.getTokenOrCommentBefore is not a function », while `{"import/order":"error"}` finds nothing to reorder and passes (2026-10-24). Imports are sorted by Prettier instead (**Code style**).
- In flat config, the last object that sets a rule for a file replaces its options instead of adding to them: a `no-restricted-imports` added for `src/**` drops the `src/ui/` patterns on `src/ui/` files (`eslint --print-config`, 2026-10-24). So `admin-panel/test-doubles`, which refuses the fake Discord across `src/`, sits before `admin-panel/ui-imports`, whose patterns win on `src/ui/` files and refuse the fake there already (`eslint --print-config src/ui/button.tsx`, 2026-10-25). A new rule of the same name that reaches `src/ui/` sits before it too, or repeats its patterns.
