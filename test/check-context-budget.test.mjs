import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const SCRIPT = fileURLToPath(
  new URL("../scripts/check-context-budget.mjs", import.meta.url)
)
const BUDGET_FILE = "context-budget.json"
const SMALL_BUDGET = {
  alwaysLoaded: { bytes: 100, lines: 5 },
  scopedRule: { bytes: 50 },
}

function sized(bytes, lines) {
  const each = Math.floor(bytes / lines)
  const extra = bytes - each * lines
  return Array.from(
    { length: lines },
    (_, index) => "x".repeat(each - 1 + (index < extra ? 1 : 0)) + "\n"
  ).join("")
}

function budgetFile({ budget = SMALL_BUDGET, always = {}, scoped = {} } = {}) {
  return JSON.stringify({
    budget,
    ceilings: { alwaysLoaded: always, scoped },
  })
}

function scopedRule(body) {
  return `---\npaths:\n  - "src/**"\n---\n${body}`
}

function withRepository(files, callback, { untracked = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-context-budget-"))
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.writeFileSync(path.join(dir, file), text)
      if (!untracked.includes(file)) {
        execFileSync("git", ["add", "--", file], { cwd: dir, stdio: "ignore" })
      }
    }
    callback(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function run(dir, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

test("the always-loaded context over its byte budget fails, naming the overshoot and the files", () => {
  withRepository(
    {
      "CLAUDE.md": sized(120, 3),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /The always-loaded context is over its ceiling: 120 bytes against a ceiling of 100 \(budget 100\), over by 20\. Claude Code loads these files into every session and every sub-agent: CLAUDE\.md \(120 bytes, 3 lines\)\. Move the surplus instead of cutting it: to a \.claude\/rules\/<area>\.md scoped by paths:, to an ADR for a decision, to docs\/ behind a pointer line, or to the commit message for a trial or a ticket trail\. Delete a rule only when the code or a test already says it\./
      )
      assert.doesNotMatch(result.stdout, /lines against/)
    }
  )
})

test("the always-loaded context over its line budget fails, naming the overshoot", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 8),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /over its ceiling: 8 lines against a ceiling of 5 \(budget 5\), over by 3\./
      )
      assert.doesNotMatch(result.stdout, /bytes against/)
    }
  )
})

test("an always-loaded context within its budget passes and prints its figures", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 30 bytes, 3 lines, within budget; every scoped rule within 50 bytes\./
      )
    }
  )
})

test("the sizes of an always-loaded context at a ceiling pass and print the ceiling and the budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(120, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 120 bytes \(ceiling 120, budget 100\), 3 lines \(budget 5\)/
      )
    }
  )
})

test("a size above its ceiling fails even when the budget is passed", () => {
  withRepository(
    {
      "CLAUDE.md": sized(130, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /130 bytes against a ceiling of 120 \(budget 100\), over by 10\./
      )
    }
  )
})

test("an over-budget size with no ceiling is told to go back under its budget, not to get a ceiling", () => {
  withRepository(
    {
      "CLAUDE.md": sized(120, 3),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /has no ceiling for its bytes, so it has to go back under its budget: --write adds none\./
      )
    }
  )
})

test("a scoped rule over its byte budget with no ceiling fails and is told to go back under its budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/big.md": scopedRule(sized(40, 2)),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /\.claude\/rules\/big\.md is a rule scoped by paths: of 68 bytes against a ceiling of 50 \(budget 50\), over by 18\. A scoped rule loads whole each time its paths match\. Split it into rules each scoped by paths:, or move the surplus to an ADR for a decision, to docs\/ behind a pointer line, or to the commit message for a trial or a ticket trail\. Delete a rule only when the code or a test already says it\. \.claude\/rules\/big\.md has no ceiling, so it has to go back under its budget: --write adds none\./
      )
    }
  )
})

test("a scoped rule at its ceiling passes and is not part of the always-loaded context", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/big.md": scopedRule(sized(40, 2)),
      [BUDGET_FILE]: budgetFile({ scoped: { ".claude/rules/big.md": 68 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(result.stdout, /Always-loaded: 30 bytes \(budget 100\)/)
      assert.match(
        result.stdout,
        /\.claude\/rules\/big\.md: 68 bytes \(ceiling 68, budget 50\)/
      )
    }
  )
})

test("a scoped rule over its ceiling fails", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/big.md": scopedRule(sized(40, 2)),
      [BUDGET_FILE]: budgetFile({ scoped: { ".claude/rules/big.md": 60 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /big\.md is a rule scoped by paths: of 68 bytes against a ceiling of 60 \(budget 50\), over by 8\./
      )
    }
  )
})

test("a scoped rule within its budget passes with no ceiling", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/small.md": scopedRule(sized(20, 2)),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /within budget; every scoped rule within 50 bytes\./
      )
    }
  )
})

test("a ceiling that the size has fallen under is stale: the always-loaded context above its budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(110, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /The always-loaded context is 110 bytes, under its ceiling of 120: run pnpm check:context-budget --write to lower the ceiling, and commit context-budget\.json\./
      )
    }
  )
})

test("a ceiling that the size has fallen under is stale: the always-loaded context under its budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(90, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /The always-loaded context is 90 bytes, under its budget of 100: run pnpm check:context-budget --write to remove its ceiling, and commit context-budget\.json\./
      )
    }
  )
})

test("a stale ceiling on the lines of the always-loaded context fails too", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      [BUDGET_FILE]: budgetFile({ always: { lines: 8 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /The always-loaded context is 3 lines, under its budget of 5: run pnpm check:context-budget --write to remove its ceiling/
      )
    }
  )
})

test("a ceiling that a scoped rule has fallen under is stale, above and under the budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/above.md": scopedRule(sized(40, 2)),
      ".claude/rules/under.md": scopedRule(sized(20, 2)),
      [BUDGET_FILE]: budgetFile({
        scoped: { ".claude/rules/above.md": 90, ".claude/rules/under.md": 90 },
      }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /\.claude\/rules\/above\.md is 68 bytes, under its ceiling of 90: run pnpm check:context-budget --write to lower the ceiling, and commit context-budget\.json\./
      )
      assert.match(
        result.stdout,
        /\.claude\/rules\/under\.md is 48 bytes, under its budget of 50: run pnpm check:context-budget --write to remove its ceiling, and commit context-budget\.json\./
      )
    }
  )
})

test("a ceiling kept for a file that is gone is stale", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      [BUDGET_FILE]: budgetFile({ scoped: { ".claude/rules/gone.md": 90 } }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /\.claude\/rules\/gone\.md has a ceiling of 90, but the file is gone or is no longer scoped: run pnpm check:context-budget --write to remove its ceiling, and commit context-budget\.json\./
      )
    }
  )
})

test("--write lowers a ceiling to the size of the day", () => {
  withRepository(
    {
      "CLAUDE.md": sized(110, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 0)
      assert.match(
        written.stdout,
        /Lowered the ceiling of the always-loaded bytes from 120 to 110\./
      )
      const after = run(dir)
      assert.equal(after.status, 0)
      assert.match(
        after.stdout,
        /Always-loaded: 110 bytes \(ceiling 110, budget 100\)/
      )
    }
  )
})

test("--write removes the ceiling of a size back under the budget", () => {
  withRepository(
    {
      "CLAUDE.md": sized(90, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120, lines: 9 } }),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 0)
      assert.match(
        written.stdout,
        /Removed the ceiling of the always-loaded bytes \(now 90, within the budget of 100\)\./
      )
      assert.match(
        written.stdout,
        /Removed the ceiling of the always-loaded lines \(now 3, within the budget of 5\)\./
      )
      const after = run(dir)
      assert.equal(after.status, 0)
      assert.match(
        after.stdout,
        /Always-loaded: 90 bytes, 3 lines, within budget; every scoped rule within 50 bytes\./
      )
    }
  )
})

test("--write never raises a ceiling: a size above it still fails", () => {
  withRepository(
    {
      "CLAUDE.md": sized(130, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 1)
      assert.match(
        written.stdout,
        /130 bytes against a ceiling of 120 \(budget 100\), over by 10\./
      )
      const after = run(dir)
      assert.equal(after.status, 1)
      assert.match(
        after.stdout,
        /130 bytes against a ceiling of 120 \(budget 100\), over by 10\./
      )
    }
  )
})

test("--write adds no ceiling to a size over the budget that has none", () => {
  withRepository(
    {
      "CLAUDE.md": sized(120, 3),
      ".claude/rules/big.md": scopedRule(sized(40, 2)),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 1)
      assert.match(written.stdout, /has no ceiling for its bytes/)
      assert.match(written.stdout, /big\.md has no ceiling/)
      const after = run(dir)
      assert.equal(after.status, 1)
      assert.match(after.stdout, /has no ceiling for its bytes/)
      assert.match(after.stdout, /big\.md has no ceiling/)
    }
  )
})

test("--write lowers and removes the ceilings of scoped rules, and drops that of a gone file", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      ".claude/rules/above.md": scopedRule(sized(40, 2)),
      ".claude/rules/under.md": scopedRule(sized(20, 2)),
      [BUDGET_FILE]: budgetFile({
        scoped: {
          ".claude/rules/above.md": 90,
          ".claude/rules/under.md": 90,
          ".claude/rules/gone.md": 90,
        },
      }),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 0)
      assert.match(
        written.stdout,
        /Lowered the ceiling of \.claude\/rules\/above\.md from 90 to 68\./
      )
      assert.match(
        written.stdout,
        /Removed the ceiling of \.claude\/rules\/under\.md \(now 48, within the budget of 50\)\./
      )
      assert.match(
        written.stdout,
        /Removed the ceiling of \.claude\/rules\/gone\.md \(the file is gone or is no longer scoped\)\./
      )
      const after = run(dir)
      assert.equal(after.status, 0)
      assert.match(
        after.stdout,
        /\.claude\/rules\/above\.md: 68 bytes \(ceiling 68, budget 50\)/
      )
      assert.doesNotMatch(after.stdout, /under\.md|gone\.md/)
    }
  )
})

test("--write says so when there is nothing to lower or remove", () => {
  withRepository(
    {
      "CLAUDE.md": sized(120, 3),
      [BUDGET_FILE]: budgetFile({ always: { bytes: 120 } }),
    },
    (dir) => {
      const written = run(dir, "--write")
      assert.equal(written.status, 0)
      assert.match(written.stdout, /No ceiling to lower or remove\./)
    }
  )
})

const ALWAYS_LOADED_RULES = [
  ["has no frontmatter", "one\ntwo\n", 8, 2],
  [
    "has a frontmatter with no paths:",
    "---\ndescription: x\n---\nbody\n",
    28,
    4,
  ],
  ["has an empty paths: list", "---\npaths: []\n---\nbody\n", 23, 4],
  ["has a paths: with no value", "---\npaths:\n---\nbody\n", 20, 4],
  [
    "has a frontmatter that is not YAML",
    "---\npaths: [unclosed\n---\nbody\n",
    30,
    4,
  ],
  ["has a paths: that is a string", "---\npaths: src/**\n---\nbody\n", 27, 4],
  [
    "has a paths: that holds a number",
    "---\npaths:\n  - 12\n---\nbody\n",
    27,
    5,
  ],
  [
    "has a paths: that holds a blank string",
    '---\npaths:\n  - " "\n---\nbody\n',
    28,
    5,
  ],
]

for (const [name, text, bytes, lines] of ALWAYS_LOADED_RULES) {
  test(`a rule that ${name} counts as always loaded`, () => {
    withRepository(
      {
        "CLAUDE.md": "a\n",
        ".claude/rules/plain.md": text,
        [BUDGET_FILE]: budgetFile({
          budget: {
            alwaysLoaded: { bytes: 100, lines: 9 },
            scopedRule: { bytes: 50 },
          },
        }),
      },
      (dir) => {
        const result = run(dir)
        assert.equal(result.status, 0)
        assert.match(
          result.stdout,
          new RegExp(
            `Always-loaded: ${bytes + 2} bytes, ${lines + 1} lines, within budget`
          )
        )
      }
    )
  })
}

test("a rule with a valid paths: list in flow style is scoped", () => {
  withRepository(
    {
      "CLAUDE.md": "a\n",
      ".claude/rules/flow.md": '---\npaths: ["src/**", "docs/**"]\n---\nbody\n',
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 2 bytes, 1 line, within budget/
      )
    }
  )
})

test("a file in CRLF counts as it does in LF, and its frontmatter is read", () => {
  withRepository(
    {
      "CLAUDE.md": "a\r\nb\r\n",
      ".claude/rules/crlf.md":
        '---\r\npaths:\r\n  - "src/**"\r\n---\r\nbody\r\n',
      [BUDGET_FILE]: budgetFile({
        budget: {
          alwaysLoaded: { bytes: 100, lines: 5 },
          scopedRule: { bytes: 30 },
        },
        scoped: { ".claude/rules/crlf.md": 33 },
      }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 4 bytes \(budget 100\), 2 lines/
      )
      assert.match(
        result.stdout,
        /\.claude\/rules\/crlf\.md: 33 bytes \(ceiling 33, budget 30\)/
      )
    }
  )
})

test("a file that git does not track is not measured", () => {
  withRepository(
    {
      "CLAUDE.md": "a\n",
      ".claude/rules/local.md": sized(90, 3),
      "docs/CLAUDE.md": sized(90, 3),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 2 bytes, 1 line, within budget; every scoped rule within 50 bytes\./
      )
    },
    { untracked: [".claude/rules/local.md", "docs/CLAUDE.md"] }
  )
})

test("the CLAUDE.md of the .claude folder counts as always loaded", () => {
  withRepository(
    {
      "CLAUDE.md": "a\n",
      ".claude/CLAUDE.md": "bb\ncc\n",
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 8 bytes, 3 lines, within budget/
      )
    }
  )
})

test("the CLAUDE.md of a subfolder is a scoped file with the budget of a scoped rule", () => {
  withRepository(
    {
      "CLAUDE.md": "a\n",
      "docs/CLAUDE.md": sized(60, 2),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /docs\/CLAUDE\.md is a CLAUDE\.md of a subfolder of 60 bytes against a ceiling of 50 \(budget 50\), over by 10\. A CLAUDE\.md of a subfolder loads whole each time Claude works under its folder\. Split it into rules each scoped by paths:, or move the surplus to an ADR/
      )
      assert.match(result.stdout, /Always-loaded: 2 bytes/)
    }
  )
})

const IMPORT_BUDGET = budgetFile({
  budget: {
    alwaysLoaded: { bytes: 100, lines: 20 },
    scopedRule: { bytes: 50 },
  },
})

test("a file imported by @path counts as always loaded and is named after its importer", () => {
  withRepository(
    {
      "CLAUDE.md": "see @docs/a.md\n",
      "docs/a.md": sized(40, 2),
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 55 bytes, 3 lines, within budget/
      )
    }
  )
  withRepository(
    {
      "CLAUDE.md": "see @docs/a.md\n",
      "docs/a.md": sized(90, 2),
      [BUDGET_FILE]: budgetFile(),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /105 bytes against a ceiling of 100 \(budget 100\), over by 5\. Claude Code loads these files into every session and every sub-agent: docs\/a\.md \(imported by CLAUDE\.md, 90 bytes, 2 lines\); CLAUDE\.md \(15 bytes, 1 line\)\./
      )
    }
  )
})

test("an import is followed up to four hops, relative to the file that imports", () => {
  withRepository(
    {
      "CLAUDE.md": "@docs/a.md\n",
      "docs/a.md": "@b.md\n",
      "docs/b.md": "@c.md\n",
      "docs/c.md": "@d.md\n",
      "docs/d.md": "@e.md\n",
      "docs/e.md": "ee\n",
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 35 bytes, 5 lines, within budget/
      )
    }
  )
})

test("a path in inline code or in a code block is not an import", () => {
  withRepository(
    {
      "CLAUDE.md": [
        "quoted `@docs/a.md` and ``@docs/b.md`` here",
        "```",
        "@docs/c.md",
        "```",
        "~~~md",
        "@docs/d.md",
        "~~~",
        "@docs/e.md",
        "",
      ].join("\n"),
      "docs/a.md": "aa\n",
      "docs/b.md": "bb\n",
      "docs/c.md": "cc\n",
      "docs/d.md": "dd\n",
      "docs/e.md": "ee\n",
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 98 bytes, 9 lines, within budget/
      )
    }
  )
})

test("an @ token that names no tracked file is ignored", () => {
  withRepository(
    {
      "CLAUDE.md":
        "@types/node @everyone @/ui/* me@docs/a.md @docs/missing.md @docs/untracked.md @docs\n",
      "docs/a.md": "aa\n",
      "docs/untracked.md": "uu\n",
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 84 bytes, 1 line, within budget/
      )
    },
    { untracked: ["docs/untracked.md"] }
  )
})

test("an import whose path escapes its folder or the repository is ignored", () => {
  withRepository(
    {
      "docs/CLAUDE.md": "@../../outside.md @~/home.md\n",
      "CLAUDE.md": "a\n",
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 2 bytes, 1 line, within budget/
      )
    }
  )
})

test("a file imported twice counts once, and an escaped space belongs to the path", () => {
  withRepository(
    {
      "CLAUDE.md": "@docs/a.md @docs/with\\ space.md\n",
      ".claude/CLAUDE.md": "@../docs/a.md\n",
      "docs/a.md": "aa\n",
      "docs/with space.md": "ss\n",
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 52 bytes, 4 lines, within budget/
      )
    }
  )
})

test("a file imported by a scoped rule counts as always loaded, and the rule does not", () => {
  withRepository(
    {
      "CLAUDE.md": "a\n",
      ".claude/rules/scoped.md": scopedRule("@../../docs/a.md\n"),
      "docs/a.md": sized(20, 2),
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 0)
      assert.match(
        result.stdout,
        /Always-loaded: 22 bytes, 3 lines, within budget/
      )
    }
  )
})

test("a scoped rule that CLAUDE.md imports counts as always loaded and keeps its own budget", () => {
  withRepository(
    {
      "CLAUDE.md": "@.claude/rules/scoped.md\n",
      ".claude/rules/scoped.md": scopedRule(sized(40, 2)),
      [BUDGET_FILE]: IMPORT_BUDGET,
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 1)
      assert.match(
        result.stdout,
        /\.claude\/rules\/scoped\.md is a rule scoped by paths: of 68 bytes against a ceiling of 50/
      )
      assert.match(
        result.stdout,
        /Always-loaded: 93 bytes \(budget 100\), 7 lines \(budget 20\)/
      )
    }
  )
})

test("an unknown argument exits 2", () => {
  withRepository(
    { "CLAUDE.md": sized(30, 3), [BUDGET_FILE]: budgetFile() },
    (dir) => {
      const result = run(dir, "--fix")
      assert.equal(result.status, 2)
      assert.match(result.stderr, /unknown argument --fix/)
    }
  )
})

test("a malformed budget file exits 2 and names the problem", () => {
  withRepository(
    {
      "CLAUDE.md": sized(30, 3),
      [BUDGET_FILE]: JSON.stringify({ budget: {} }),
    },
    (dir) => {
      const result = run(dir)
      assert.equal(result.status, 2)
      assert.match(result.stderr, /context-budget\.json is malformed/)
    }
  )
})

test("a repository with no budget file exits 2", () => {
  withRepository({ "CLAUDE.md": sized(30, 3) }, (dir) => {
    const result = run(dir)
    assert.equal(result.status, 2)
    assert.match(result.stderr, /context-budget\.json not found/)
  })
})
