---
paths:
  - "prettier.config.mjs"
  - ".prettierignore"
  - ".git-blame-ignore-revs"
---

# Prettier

`prettier.config.mjs` is the source of truth for the layout of every file Prettier knows: TypeScript, JavaScript, CSS, JSON, YAML and Markdown (#48, #80). Prettier and its two plugins are devDependencies, and ESLint sets no layout rule, so the repository has no `eslint-config-prettier`.

- Layout is Prettier's defaults with `semi: false` and `trailingComma: "es5"`, at width 80: those are the registry's own, so that `pnpm exec shadcn add <component> --diff`, which compares lines, shows only what the panel changed. Single quotes or a wider line would add every line that holds a string or passes 80 columns.
- **Classes** are sorted by `prettier-plugin-tailwindcss`, in Tailwind's recommended order, against `src/ui/globals.css`, in `className` and inside `cva()` and `cn()` calls (`tailwindFunctions`), which drops duplicate classes and extra whitespace. A class held in a constant outside a `cn()` is not sorted (`.claude/rules/eslint.md`, **The responsive classes**). The plugin loads last among Prettier's plugins, as its README asks.
- **Imports** are sorted by `@ianvs/prettier-plugin-sort-imports`, in the registry's order: `node:` modules, `react`, `next`, other packages, then, after a blank line, `@/` and relative paths. A side-effect import stays where it is and the imports after it are sorted, so that `import "server-only"` stays first.
- `.prettierignore` keeps out `pnpm-lock.yaml` alone. `pnpm-workspace.yaml` stays in, and joins it only if a later `pnpm add` undoes Prettier's layout there (#48).
- Code that Prettier lays out badly is reshaped, since `prettier-ignore` is a comment like any other (`CLAUDE.md`, **No comments**). `.prettierignore` and `.git-blame-ignore-revs` hold none either: `pnpm check:comments` reads both as files of `#` comments (`.claude/rules/check-comments.md`).

## Enforcement

- `pnpm format:check` runs in `ci.yml`, right after the comment check and the context budget check, and a `PostToolUse` hook formats the file a tool touched (`.claude/rules/claude-hooks.md`, **The format hook**): those two are the whole of it, with no git hook and no editor setting. A `Bash` command that rewrites files, such as `pnpm add` or `shadcn add`, escapes the hook: `pnpm format` and CI catch it.
- A reformatting of the repository is a commit of its own, such as `Tooling: format the repository with Prettier` (#80), and its SHA goes into `.git-blame-ignore-revs` in the next commit of the same PR, for GitHub's blame, and for `git blame` once `git config blame.ignoreRevsFile .git-blame-ignore-revs` is set (README). A merge commit keeps that SHA, and a rebase of a reformatting branch before its merge redoes the file with the new one. A line the reformatting created, such as a closing parenthesis split off a call, still names the reformatting in blame.
