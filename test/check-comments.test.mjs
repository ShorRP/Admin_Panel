import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  checkFile,
  checkRepository,
  familyOf,
  findComments,
} from "../scripts/check-comments.mjs"

const HOOK = fileURLToPath(
  new URL("../.claude/hooks/check-comments-before-pr.mjs", import.meta.url)
)
const SCRIPT = fileURLToPath(
  new URL("../scripts/check-comments.mjs", import.meta.url)
)
const runHook = (input) =>
  spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" })

test("the PR hook refuses a call it cannot read", () => {
  const result = runHook("not json")
  const output = JSON.parse(result.stdout).hookSpecificOutput
  assert.equal(output.permissionDecision, "deny")
  assert.match(output.permissionDecisionReason, /could not read this call/)
})

function withTemporaryRepository(files, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-comments-"))
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    for (const [file, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.writeFileSync(path.join(dir, file), text)
    }
    callback(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const hookInput = (command, cwd) =>
  JSON.stringify({ cwd, tool_name: "Bash", tool_input: { command } })

for (const command of [
  "gh pr create --fill",
  "gh pr new --fill",
  "gh -R o/r pr create --fill",
  "gh --repo o/r pr new --fill",
  "gh --repo=o/r pr create",
  "gh -R=o/r pr create",
  "gh -Ro/r pr create",
  "gh pr -R o/r create",
  "gh -R a/b pr -R c/d new",
]) {
  test(`the PR hook refuses \`${command}\` when the session's repository holds a comment`, () => {
    withTemporaryRepository(
      { "dirty.js": "export const a = 1 // why\n" },
      (dir) => {
        const result = runHook(hookInput(command, dir))
        const output = JSON.parse(result.stdout).hookSpecificOutput
        assert.equal(output.permissionDecision, "deny")
        assert.match(output.permissionDecisionReason, /dirty\.js:1:20 \/\/ why/)
      }
    )
  })

  test(`the PR hook lets \`${command}\` through when the session's repository holds no comment`, () => {
    withTemporaryRepository({ "clean.js": "export const a = 1\n" }, (dir) => {
      const result = runHook(hookInput(command, dir))
      assert.equal(result.status, 0)
      assert.equal(result.stdout, "")
    })
  })
}

for (const command of [
  "gh pr view 3",
  "gh -R o/r pr view 3",
  "gh --repo=o/r pr list --state open",
  "gh -R o/r issue create --title x",
  "gh -R o/r pr checkout new",
]) {
  test(`the PR hook lets \`${command}\` through without a word, though the session's repository holds a comment`, () => {
    withTemporaryRepository(
      { "dirty.js": "export const a = 1 // why\n" },
      (dir) => {
        const result = runHook(hookInput(command, dir))
        assert.equal(result.status, 0)
        assert.equal(result.stdout, "")
      }
    )
  })
}

test("the PR hook refuses a PR whose command a line continuation splits, in bash or in PowerShell", () => {
  withTemporaryRepository(
    { "dirty.js": "export const a = 1 // why\n" },
    (dir) => {
      for (const command of [
        "gh \\\n  -R o/r \\\n  pr create",
        "gh pr \\\r\n  new --fill",
        "gh `\n  pr create",
      ]) {
        const result = runHook(hookInput(command, dir))
        assert.notEqual(result.stdout, "", JSON.stringify(command))
        const output = JSON.parse(result.stdout).hookSpecificOutput
        assert.equal(output.permissionDecision, "deny", JSON.stringify(command))
      }
    }
  )
})

test("the PR hook checks the repository that holds the session's folder, a subfolder included", () => {
  withTemporaryRepository(
    {
      "dirty.js": "export const a = 1 // why\n",
      "packages/app/clean.js": "export const b = 2\n",
    },
    (dir) => {
      const result = runHook(
        hookInput("gh pr create", path.join(dir, "packages", "app"))
      )
      const output = JSON.parse(result.stdout).hookSpecificOutput
      assert.equal(output.permissionDecision, "deny")
      assert.match(output.permissionDecisionReason, /\ndirty\.js:1:20 \/\/ why/)
    }
  )
})

test("the PR hook refuses a PR from a folder that is in no repository, since it has nothing to check", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-comments-"))
  try {
    const result = spawnSync(process.execPath, [HOOK], {
      input: hookInput("gh pr create", dir),
      encoding: "utf8",
      env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) },
    })
    const output = JSON.parse(result.stdout).hookSpecificOutput
    const reason = output.permissionDecisionReason
    assert.equal(output.permissionDecision, "deny")
    assert.match(reason, /could not run/)
    assert.match(reason, /no git repository found from /)
    assert.ok(reason.includes(path.basename(dir)))
    assert.doesNotMatch(reason, /pnpm install/)
    assert.doesNotMatch(reason, /\n\s+at /)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the script, run in a folder that is in no repository, fails with one line that names the folder", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-comments-"))
  try {
    const result = spawnSync(process.execPath, [SCRIPT], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) },
    })
    assert.equal(result.status, 2)
    assert.equal(result.stdout, "")
    assert.equal(result.stderr.trimEnd().split("\n").length, 1)
    assert.match(result.stderr, /^no git repository found from /)
    assert.ok(result.stderr.includes(path.basename(dir)))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the script checks the repository that holds the folder it runs from, a subfolder included", () => {
  withTemporaryRepository(
    {
      "dirty.js": "export const a = 1 // why\n",
      "packages/app/clean.js": "export const b = 2\n",
    },
    (dir) => {
      const cwd = path.join(dir, "packages", "app")
      const refused = spawnSync(process.execPath, [SCRIPT], {
        cwd,
        encoding: "utf8",
      })
      assert.equal(refused.status, 1)
      assert.match(refused.stdout, /^dirty\.js:1:20 \/\/ why$/m)
      fs.writeFileSync(path.join(dir, "dirty.js"), "export const a = 1\n")
      const accepted = spawnSync(process.execPath, [SCRIPT], {
        cwd,
        encoding: "utf8",
      })
      assert.equal(accepted.status, 0)
      assert.equal(accepted.stdout, "")
    }
  )
})

const texts = (text, file) =>
  findComments(text, file).map((range) => text.slice(range.start, range.end))

test("script files: line, block and doc comments are found", () => {
  const source = [
    "// header",
    "const a = 1 // trailing",
    "/* block */",
    "/** doc */",
    "export const b = a",
  ].join("\n")
  assert.deepEqual(texts(source, "src/a.ts"), [
    "// header",
    "// trailing",
    "/* block */",
    "/** doc */",
  ])
})

test("script files: comment markers inside strings, templates and regexes are code", () => {
  const source = [
    "const url = 'https://example.com/a'",
    "const query = `// not a comment ${url} /* nor this */`",
    "const pattern = /https:\\/\\/[^/]+\\/\\/x/",
    "export { query, pattern }",
  ].join("\n")
  assert.deepEqual(texts(source, "src/a.mjs"), [])
})

test("script files: a JSX comment is found, a shebang is not", () => {
  const source = [
    "#!/usr/bin/env node",
    "export const A = () => <div>{/* hidden */}</div>",
  ].join("\n")
  assert.deepEqual(texts(source, "src/a.tsx"), ["/* hidden */"])
})

test("script files: indispensable tool directives are allowed alone", () => {
  const source = [
    '/// <reference types="next" />',
    "// eslint-disable-next-line no-console",
    "console.log(1)",
    "// eslint-disable-next-line react-hooks/rules-of-hooks, @typescript-eslint/no-unsafe-assignment",
    "use(1)",
    "export const A = () => <div>{/* eslint-disable-next-line @next/next/no-img-element */}</div>",
    "// @ts-expect-error",
    'const n: number = "x"',
    "await import(/* @vite-ignore */ n)",
    "await import(/* webpackIgnore: true */ n)",
  ].join("\n")
  assert.deepEqual(texts(source, "src/a.tsx"), [])
})

const refusedDirectives = (reason, comments) => {
  for (const comment of comments) {
    test(`script files: ${comment} is a comment, ${reason}`, () => {
      assert.deepEqual(texts(`${comment}\nexport const a = 1\n`, "src/a.ts"), [
        comment,
      ])
    })
  }
}

refusedDirectives("since a directive is allowed only alone", [
  "// @ts-expect-error wrong on purpose",
  "// eslint-disable-next-line no-console -- why",
  "// eslint-disable-next-line no-console why",
])

refusedDirectives("since the check never allows that directive", [
  "// @ts-ignore",
  "// @ts-nocheck",
  "/* eslint-disable */",
  "/* eslint-disable no-console */",
  "/* eslint-enable */",
  "// eslint-disable-line no-console",
])

refusedDirectives("since a rule name starts with a letter or a digit", [
  "// eslint-disable-next-line",
  "// eslint-disable-next-line --",
  "// eslint-disable-next-line -",
  "// eslint-disable-next-line ---",
  "// eslint-disable-next-line _",
  "// eslint-disable-next-line no-console, --",
  "// eslint-disable-next-line plugin/-",
])

test("json files: comments are found, valid json has none", () => {
  assert.deepEqual(texts('{ "a": "http://x" }', "tsconfig.json"), [])
  assert.deepEqual(texts('{\n  // why\n  "a": 1\n}', "tsconfig.json"), [
    "// why",
  ])
})

test("css, markup and sql comments are found outside strings", () => {
  assert.deepEqual(texts('a { content: "/* no */" } /* yes */', "app.css"), [
    "/* yes */",
  ])
  assert.deepEqual(texts("<p>x</p><!-- yes -->", "page.html"), ["<!-- yes -->"])
  assert.deepEqual(texts("select '--no' -- yes\n/* also */", "q.sql"), [
    "-- yes",
    "/* also */",
  ])
})

test("hash files: a # comment is found, a # inside a value or quotes is not", () => {
  const yaml = [
    "# header",
    "name: CI # trailing",
    "url: https://example.com/#anchor",
    'run: echo "# not a comment"',
    "label: 'a # b'",
    "title: it's fine # still a comment",
  ].join("\n")
  assert.deepEqual(texts(yaml, ".github/workflows/ci.yml"), [
    "# header",
    "# trailing",
    "# still a comment",
  ])
  assert.deepEqual(texts("# why\nKEY=value", ".env.example"), ["# why"])
  assert.deepEqual(texts("# why\nnode_modules/", ".gitignore"), ["# why"])
  assert.deepEqual(texts("# why\npnpm-lock.yaml\n", ".prettierignore"), [
    "# why",
  ])
  assert.deepEqual(
    texts(
      "# why\n4658adc4658adc4658adc4658adc4658adc4658a\n",
      ".git-blame-ignore-revs"
    ),
    ["# why"]
  )
})

test("hash files: a shebang is allowed on the first line of a shell script, a #! anywhere else is a comment", () => {
  assert.deepEqual(texts("#!/usr/bin/env bash\necho hi\n", "run.sh"), [])
  assert.deepEqual(texts("echo hi\n#!/usr/bin/env bash\n", "run.sh"), [
    "#!/usr/bin/env bash",
  ])
  assert.deepEqual(texts("#! why\nkey: 1\n", "x.yml"), ["#! why"])
})

test("yaml files: a quoted string spanning several lines is a value, up to its closing quote", () => {
  assert.deepEqual(texts('key: "a\n  # b"\n', "x.yml"), [])
  assert.deepEqual(texts("key: 'a\n  # b' # why\nnext: 1", "x.yml"), ["# why"])
  assert.deepEqual(texts('key: !!str "a\n  # b"\n', "x.yml"), [])
  assert.deepEqual(texts("key: 'it''s\n  # b'\n", "x.yml"), [])
})

test("yaml files: a quote outside a quoted string hides no comment", () => {
  assert.deepEqual(texts("note: the '90s\n# why\nnext: 1 # also\n", "x.yml"), [
    "# why",
    "# also",
  ])
  assert.deepEqual(texts("note: rock 'n roll # why\n", "x.yml"), ["# why"])
  assert.deepEqual(texts("{a: rock 'n, b: 'roll'} # why\n", "x.yml"), ["# why"])
  const workflow = [
    "steps:",
    "  - run: |",
    '      node -e "',
    "        1",
    '      "',
    "  # why",
    '  - run: echo "done"',
  ].join("\n")
  assert.deepEqual(texts(workflow, "ci.yml"), ["# why"])
})

test("hash files other than yaml: every quote ends with its line", () => {
  assert.deepEqual(texts('"odd name\n# why\n', ".gitignore"), ["# why"])
  assert.deepEqual(texts("[*]\nx = 'a\n# why\n", ".editorconfig"), ["# why"])
  assert.deepEqual(texts("GREETING='hello\n# why\nOTHER=1\n", ".env"), [
    "# why",
  ])
  assert.deepEqual(texts('python -c "\nprint(1)\n"\n# why\n', "run.sh"), [
    "# why",
  ])
})

test("files without comments, or of a kind the check skips, report nothing", () => {
  assert.equal(familyOf("README.md"), null)
  assert.equal(familyOf("pnpm-lock.yaml"), null)
  assert.deepEqual(texts("# Title", "docs/a.md"), [])
})

test("a report line names the file, the line and the column", () => {
  assert.deepEqual(checkFile("const a = 1\n  // why\n", "src/a.js"), [
    "src/a.js:2:3 // why",
  ])
})

test("a file that cannot be parsed is reported, since its comments cannot be checked", () => {
  const [line] = checkFile("const = ;", "src/broken.js")
  assert.match(line, /^src\/broken\.js: cannot be parsed/)
  const [yamlLine] = checkFile('k: "unclosed\n# why\n', "broken.yml")
  assert.match(yamlLine, /^broken\.yml: cannot be parsed/)
  assert.deepEqual(checkFile("a: 1 # why\na: 2\n", "twice.yml"), [
    "twice.yml:1:6 # why",
  ])
})

test("the repository check covers tracked and untracked files, not ignored ones", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-comments-"))
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    fs.writeFileSync(path.join(dir, ".gitignore"), "ignored.js\n")
    fs.writeFileSync(path.join(dir, "clean.js"), "export const a = 1\n")
    fs.writeFileSync(path.join(dir, "dirty.js"), "export const a = 1 // why\n")
    fs.writeFileSync(path.join(dir, "ignored.js"), "// ignored\n")
    assert.deepEqual(checkRepository(dir), ["dirty.js:1:20 // why"])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
