import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import jsxA11y from "eslint-plugin-jsx-a11y"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "admin-panel/jsx-a11y-recommended-rules",
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    name: "admin-panel/test-doubles",
    files: ["src/**"],
    ignores: ["src/**/*.test.*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)fake-discord$",
              message: "Only test files import the fake Discord.",
            },
            {
              regex: "(^|/)(answering-fetch|discord-api-contract)$",
              message: "Only test files import the tests' helpers.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "admin-panel/ui-imports",
    files: ["src/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/(?!ui/)",
              message: "src/ui/ imports nothing through @/ but @/ui/*.",
            },
            {
              regex: "^\\.",
              message:
                "src/ui/ imports itself through @/ui/*, never through a relative path.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/worktrees/**",
  ]),
])
