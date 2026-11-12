---
paths:
  - "eslint.config.mjs"
  - "eslint-rules/**"
---

# The lint

`pnpm lint` runs `eslint` with `eslint-config-next`'s Core Web Vitals and TypeScript configs, then the objects that `eslint.config.mjs` names `admin-panel/…`. A target that an open ticket builds carries its ticket, as « (#89, not yet in `eslint.config.mjs`) » does, and goes once the ticket lands.

## What the config refuses

- `admin-panel/react-escaping` sets `react/no-danger` and `react/jsx-no-script-url`, the latter on `Link` too (`.claude/rules/nextjs.md`, **Headers**).
- `admin-panel/test-doubles` refuses, in `src/` outside `*.test.*` files, the fake Discord and its HTTP adapter, the in-memory `Monitor` and the tests' helpers, so that production code never reaches a double (`.claude/rules/discord.md`, **The fake**; `.claude/rules/monitoring.md`).
- `admin-panel/ui-imports` refuses, in `src/ui/`, a relative import and any `@/` import but `@/ui/*`, since the CLI rewrites a copied component's imports through the aliases of `components.json`, which all point to `@/ui` (#69).
- `admin-panel/e2e-fixtures` refuses, in `e2e/` but `fixtures.ts`, an import of `@playwright/test` or `next/experimental/testmode/playwright`, so that every test gets its own fake Discord and the console check (`.claude/rules/e2e.md`, **The server and the fake Discord**).
- `admin-panel/responsive-classes` and `admin-panel/ban-ts-comment` are below.

## Warnings

- `pnpm lint` is `eslint` today, and a rule set to `warn` does not fail it. #89 makes it `eslint --max-warnings 0`, so that `warn` blocks like `error` at the desk as in CI, and leaves the severities of the configs as they are (#55): jsx-a11y's rules stay `error`, and so do those of #81, which refuses `as` and enforces named exports and `type` (`CLAUDE.md`, **Code style**). A copied line that a `warn` rule refuses carries its `eslint-disable-next-line`, as one that an `error` rule refuses does.
- `linterOptions.reportUnusedDisableDirectives` is `warn` today, ESLint 10's default; #89 sets it to `"error"`, so that a directive that silences nothing fails.
- `no-console` is not set yet; #89 sets it to `error` in `src/`, but in `src/monitoring/`, the one folder that writes lines (`.claude/rules/monitoring.md`). Scripts and hooks print by design.
- The lint is not type-aware yet. #89 runs `recommendedTypeChecked` and `@typescript-eslint/no-deprecated` at `error` on `ts`, `tsx` and `mts` files through `projectService`, so that it catches a deprecated API, React's, Next.js's or zod's, and a Server Action's forgotten `await` (`no-floating-promises`, `no-misused-promises`). The `.mjs` files stay untyped, since `tsconfig.json` leaves them out and `projectService` refuses them. `typescript-eslint` becomes a devDependency at the version `eslint-config-next` uses, since it does not resolve from the root (`.claude/rules/dependencies.md`, **One copy**).
- That config goes after `eslint-config-next`'s, which sets `@typescript-eslint/no-unused-vars` and `no-unused-expressions` to `warn`, so that it raises them back to `error` (the last object that sets a rule wins, below).
- `Response.json()` returns `Promise<any>`, Discord's responses are typed and not validated (`CLAUDE.md`, **Architecture**), and `as` is refused (`CLAUDE.md`, **Code style**), so `src/discord/` is to read Discord's JSON in one helper, whose line carries an `eslint-disable-next-line` for the `no-unsafe-*` rule it trips (inferred; #89).
- Should `pnpm lint` on a fresh clone fail for want of route types before `next typegen` has written them, `lint` runs `next typegen` first, as `typecheck` does: #89 tries it.

## Accessibility

- `eslint.config.mjs` adds the rules of `eslint-plugin-jsx-a11y`'s `recommended` config after `eslint-config-next`'s, so that they keep its severities: `error`, but for the three it turns off, the six that `eslint-config-next` sets to `warn` among the errors (#55). It is the lint half of WCAG 2.2 AA (`CLAUDE.md`, **Interface**).

## The responsive classes

`eslint-rules/responsive-classes.mjs`, registered as `admin-panel/responsive-classes` on `src/**/*.{ts,tsx}`, refuses, in `className` and in the strings given to `cn`, `cva` and `clsx`, a fixed width above 20 rem and a grid of more than two columns that no breakpoint or container variant guards, and a length in `vh`, whose `svh`, `dvh` and `lvh` stay allowed (#355; `docs/responsive.md`, **Checklist**). `test/responsive-classes.test.mjs` names each case.

- It reads a width in `w-*`, `min-w-*` and `size-*`, on Tailwind's scale or in `px` or `rem`, and in `w-*` and `min-w-*` by Tailwind's container names, `w-xl` being 36 rem; a `vh` in any arbitrary value, `top-[50vh]` and `py-[10vh]` included; and an `!` on either side of the utility.
- A breakpoint prefix, `sm:` to `2xl:`, or a container size or minimum, `@sm:` or `@min-[…]:`, is a guard; `max-sm:`, `@max-md:`, `dark:` and `hover:` are not. 20 rem itself passes, and `repeat(auto-fill,minmax(…,1fr))` is no column count.
- It does not see the keys of an object given to `cn` or `clsx`, as in `cn({ "w-96": open })`; a class held in a constant outside a `cn()`, so that a change to such a file wraps it in one, where Prettier sorts it too (`.claude/rules/prettier.md`, **Classes**), as `MEMBER_LINK_CLASSES` of `src/staff/staff-header.tsx` and `NUMBER_CLASSES` of `src/records/account-pagination.tsx` were; a string given to a prop other than `className`; `basis-*`; and a width in `calc()`, `em` or `%`.
- It takes the arbitrary `min-[…]:` for a guard, though **Breakpoints** of `CLAUDE.md`, **Responsive**, refuses it: review checks that.
- The layout principles that no rule checks, such as `min-w-0` on a flex or grid child that holds text, stay in `CLAUDE.md`, **Responsive**, **Layout (#355)**, since they hold for every component and this rule loads only on the lint files (decided by the agent on 2026-11-12, on #450, for Gilles to review, since #450 moves « la règle de **Layout** » and the bullet holds both).

## Directives

- On a line, the one ESLint directive is `eslint-disable-next-line` followed by one or more rule names, separated by commas, with no `-- …` and no other text. `pnpm check:comments` refuses `eslint-disable` and `eslint-enable`, whether they span a block or a whole file, `eslint-disable-line`, and a directive that names no rule (#23; `DIRECTIVES` in `scripts/check-comments.mjs`, and the tests titled « script files: indispensable tool directives are allowed alone » and its kin in `test/check-comments.test.mjs`). It takes the block form, `/* eslint-disable-next-line … */`, which JSX needs, as it takes the line form.
- Directives exist only in script files, `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts` and `.tsx`: in a `.json` or `.jsonc` file `pnpm check:comments` reports every comment, a directive's form included, since no tool of the repository reads one there (#289; the test « json files: … is a comment, since no tool reads a directive there »).
- A rule name is segments joined by `/`, each starting with a letter or a digit and going on with letters, digits, `_` and `-`, with an optional leading `@`, and the names are separated by commas, so that a run of dashes or underscores alone names no rule. ESLint keeps a name with a space in it whole, so that `a b` would be one name that matches no rule (inferred) (decided by the agent on 2026-10-30, on #23, for Gilles to review).
- `@ts-expect-error` stands alone, and `@typescript-eslint/ban-ts-comment` takes `"ts-expect-error": false`, since its default refuses one without a description of 3 characters or more; `@ts-ignore` and `@ts-nocheck` stay refused, by that rule and by the comment check. `eslint.config.mjs` sets the option in an object of its own, `admin-panel/ban-ts-comment`, with no new dependency, and `test/eslint-config.test.mjs` lints a virtual `src/probe.ts` through ESLint's API to prove the three cases (decided by the agent on 2026-10-30, on #23, for Gilles to review, since no file of the repository holds a lone `@ts-expect-error` for `pnpm lint` to prove it).
- That object stays after every config that sets the rule, since `recommended-type-checked` sets `@typescript-eslint/ban-ts-comment` too and the last object to set a rule replaces its options: #89, which adds that config, puts it before this object, and the test fails otherwise (inferred).

## Gotchas of the lint configuration

- `eslint-plugin-jsx-a11y`'s `flatConfigs.recommended` registers a plugin object other than the one `eslint-config-next` registers, and ESLint 10.13.0 refuses the pair: « Cannot redefine plugin "jsx-a11y" » (2026-10-24). So `eslint.config.mjs` takes only its `rules`, on the files `eslint-config-next` registers the plugin for. A rule given only a severity keeps the options set before it, such as `alt-text`'s `img: ["Image"]` (`pnpm exec eslint --print-config src/ui/button.tsx`).
- `import/order`, from the `eslint-plugin-import` 2.32.0 that `eslint-config-next` bundles without turning the rule on, crashes on ESLint 10.13.0 once it has an import to reorder: `pnpm exec eslint --rule '{"import/order":["error",{"alphabetize":{"order":"asc"}}]}' .` stops on `.claude/skills/groom-backlog/scripts/backlog.mjs` with « TypeError: sourceCode.getTokenOrCommentBefore is not a function », while `{"import/order":"error"}` finds nothing to reorder and passes (2026-10-24). Imports are sorted by Prettier instead (`.claude/rules/prettier.md`, **Imports**).
- In flat config, the last object that sets a rule for a file replaces its options instead of adding to them: a `no-restricted-imports` added for `src/**` drops the `src/ui/` patterns on `src/ui/` files (`eslint --print-config`, 2026-10-24). So `admin-panel/test-doubles`, which refuses the fake Discord across `src/`, sits before `admin-panel/ui-imports`, whose patterns win on `src/ui/` files and refuse the fake there already (`eslint --print-config src/ui/button.tsx`, 2026-10-25). A new rule of the same name that reaches `src/ui/` sits before it too, or repeats its patterns.
