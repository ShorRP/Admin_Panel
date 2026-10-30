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
const runHook = (input) =>
  spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" })

test("the PR hook lets every command but gh pr create through without a word", () => {
  const result = runHook(
    JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "gh pr view 3" },
    })
  )
  assert.equal(result.status, 0)
  assert.equal(result.stdout, "")
})

test("the PR hook refuses a call it cannot read", () => {
  const result = runHook("not json")
  const output = JSON.parse(result.stdout).hookSpecificOutput
  assert.equal(output.permissionDecision, "deny")
  assert.match(output.permissionDecisionReason, /could not read this call/)
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

test("script files: indispensable tool directives are allowed", () => {
  const source = [
    '/// <reference types="next" />',
    "// eslint-disable-next-line no-console",
    "console.log(1)",
    "// @ts-expect-error wrong on purpose",
    'const n: number = "x"',
    "await import(/* @vite-ignore */ n)",
  ].join("\n")
  assert.deepEqual(texts(source, "src/a.ts"), [])
})

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

test("sql files: a string on several lines is a value, up to its closing quote", () => {
  assert.deepEqual(texts("select 'a\n-- b'", "q.sql"), [])
  assert.deepEqual(texts('select "a\n-- b"', "q.sql"), [])
  assert.deepEqual(texts("select 'a\n/* b */'", "q.sql"), [])
  assert.deepEqual(texts("select 'it''s\n-- b'", "q.sql"), [])
  assert.deepEqual(texts("select 'a\n-- b' -- why", "q.sql"), ["-- why"])
  assert.deepEqual(texts('select "a\n-- b" -- why', "q.sql"), ["-- why"])
  assert.deepEqual(texts('select "a""b\n-- x" -- why', "q.sql"), ["-- why"])
  assert.deepEqual(checkFile("select 'a\n-- b'\n-- why", "q.sql"), [
    "q.sql:3:1 -- why",
  ])
})

test("sql files: a backslash escapes only inside an escape string, so another string still ends at its quote", () => {
  assert.deepEqual(texts("select 'C:\\'; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select \"C:\\\"; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select date'C:\\'; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select EE'C:\\'; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select _e'C:\\'; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select éE'C:\\'; -- why\nselect 'x'", "q.sql"), [
    "-- why",
  ])
  assert.deepEqual(texts("select E'it\\'s\n-- b' -- why", "q.sql"), ["-- why"])
  assert.deepEqual(texts('select E"x\\" -- why\nfrom "y"', "q.sql"), ["-- why"])
  assert.deepEqual(texts("select e'it\\'s\n-- b'", "q.sql"), [])
  assert.deepEqual(texts("E'a\\'\n-- b'", "q.sql"), [])
  assert.deepEqual(texts("select(E'a\\'\n-- b')", "q.sql"), [])
  assert.deepEqual(texts("select E'a''b\\'c\n-- b' -- why", "q.sql"), [
    "-- why",
  ])
  const [line] = checkFile("select E'a\\'\n-- b\n", "q.sql")
  assert.match(line, /^q\.sql: cannot be parsed.*\(1:9\)/)
})

test("sql files: a string that never closes makes the file unreadable, rather than hiding what follows", () => {
  for (const text of [
    "select 'a\n-- b\n",
    'select "a\n-- b\n',
    "select 'a\n-- b",
  ]) {
    const [line, ...others] = checkFile(text, "q.sql")
    assert.match(line, /^q\.sql: cannot be parsed.*\(1:8\)/)
    assert.deepEqual(others, [])
  }
})

test("css files: a string ends with its line", () => {
  assert.deepEqual(texts("a { content: 'x\n}\n/* why */", "app.css"), [
    "/* why */",
  ])
  assert.deepEqual(texts('a { content: "x\n}\n/* why */', "app.css"), [
    "/* why */",
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
