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

test("plain hash files: every quote ends with its line", () => {
  assert.deepEqual(texts('"odd name\n# why\n', ".gitignore"), ["# why"])
  assert.deepEqual(texts("[*]\nx = 'a\n# why\n", ".editorconfig"), ["# why"])
})

test("shell files: a quoted string spanning several lines is a value, up to its closing quote", () => {
  assert.deepEqual(texts('echo "a\n# b"\n', "run.sh"), [])
  assert.deepEqual(texts('python -c "\nprint(1)\n"\n# why\n', "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("echo 'a\n# b' # why\n", "run.sh"), ["# why"])
  assert.deepEqual(texts("echo $'a\\'\n# b'\n", "run.sh"), [])
  assert.deepEqual(texts('echo "say \\"hi\\"\n# b"\n# why\n', "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("echo 'a\\'\n# why\n", "run.sh"), ["# why"])
})

test("shell files: a quote that opens no string hides no comment", () => {
  assert.deepEqual(texts("echo \\' \\\" # why\n", "run.sh"), ["# why"])
  assert.deepEqual(texts('echo "it\'s" # why\n', "run.sh"), ["# why"])
  assert.deepEqual(texts("echo $# ${#x} a#b # why\n", "run.sh"), ["# why"])
})

test("shell files: the first line may be a shebang, the quotes after it are read", () => {
  assert.deepEqual(texts('#!/usr/bin/env bash\necho "a\n# b"\n', "run.sh"), [])
})

test("shell files: a here-document body is text up to its delimiter's line, whatever it holds", () => {
  const twice =
    "cat <<EOF\ndon't\nEOF\n# hidden real comment\ncat <<EOF\ncan't\nEOF\n"
  assert.deepEqual(texts(twice, "run.sh"), ["# hidden real comment"])
  assert.deepEqual(texts("cat <<EOF\ndon't\nEOF\necho ok\n", "run.sh"), [])
  assert.deepEqual(texts("cat <<EOF\n# a\n  EOF\nEOF\n# why\n", "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("cat <<-EOF\n\t# a\n\tEOF\n# why\n", "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("cat <<'EOF' | tr a b\n# a\nEOF\n# why\n", "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts('cat <<"E O" # why\n# a\nE O\n', "run.sh"), ["# why"])
  assert.deepEqual(texts("cat <<\\EOF\n# a\nEOF\n# why\n", "run.sh"), ["# why"])
  assert.deepEqual(texts("cat <<A <<B\n# a\nA\nit's\nB\n# why\n", "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("cat <<EOF\r\n# a\r\nEOF\r\n# why\r\n", "run.sh"), [
    "# why",
  ])
})

test("shell files: a here-string is no here-document, nor is a shift", () => {
  assert.deepEqual(texts("cat <<<word\n# why\n", "run.sh"), ["# why"])
  assert.deepEqual(texts('cat <<<"a\n# b"\n# why\n', "run.sh"), ["# why"])
  assert.deepEqual(
    texts(
      'echo $((1<<3)) "$((1 << 3))" $(( (1<<2) + 1 ))\n(( x <<= 1 )) # why\n',
      "run.sh"
    ),
    ["# why"]
  )
})

test("shell files: a command substitution inside double quotes is shell, with its own quotes and comments", () => {
  assert.deepEqual(texts('x="$(\n echo a # inner\n)"\n', "run.sh"), ["# inner"])
  assert.deepEqual(texts('x="`echo a # inner\n`"\n', "run.sh"), ["# inner"])
  assert.deepEqual(texts('echo "$(echo \'"\')" # why\n', "run.sh"), ["# why"])
  assert.deepEqual(texts('echo "$(echo "a # b")" "$(x)" # why\n', "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts('echo "$(echo "$(echo \'"\')")" # why\n', "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts('echo "\\$(not a substitution" # why\n', "run.sh"), [
    "# why",
  ])
  assert.deepEqual(texts("x=$(cat <<EOF\ndon't\nEOF\n) # why\n", "run.sh"), [
    "# why",
  ])
})

test("shell files: a # starts a comment after a metacharacter, not inside a word", () => {
  assert.deepEqual(texts("echo a;# it's\n", "run.sh"), ["# it's"])
  assert.deepEqual(texts("a|# one\nb&# two\n(# three\n)\n", "run.sh"), [
    "# one",
    "# two",
    "# three",
  ])
  assert.deepEqual(texts("a>#four\nb<#five\n", "run.sh"), ["#four", "#five"])
  assert.deepEqual(texts("echo a=#b ${x#y} $#\n", "run.sh"), [])
})

test("env files: a quoted value spanning several lines is a value, up to its closing quote", () => {
  assert.deepEqual(texts('KEY="a\n# b"\n', ".env.example"), [])
  assert.deepEqual(texts("KEY='a\n# b'\n", ".env"), [])
  assert.deepEqual(texts("KEY=`a\n# b`\n", ".env.local"), [])
  assert.deepEqual(texts('export KEY = "a\n# b" # why\nNEXT=1\n', ".env"), [
    "# why",
  ])
  assert.deepEqual(texts('KEY="say \\"hi\\"\n# b"\n# why\n', ".env"), ["# why"])
  assert.deepEqual(texts('KEY="a\n# b"# glued\n', ".env"), ["# glued"])
  assert.deepEqual(texts('KEY="a\r\n# b"\r\n# why\r\n', ".env"), ["# why"])
  assert.deepEqual(texts('KEY: "a\n# b"\nNEXT:  1 # why\n', ".env"), ["# why"])
  assert.deepEqual(texts("KEY='a\\'\n# b'\n# why\n", ".env"), ["# why"])
  assert.deepEqual(texts("KEY=`a\\`\n# b`\n# why\n", ".env"), ["# why"])
  assert.deepEqual(texts('KEY="a\\"\n# b"\n# why\n', ".env"), ["# why"])
})

test("env files: a closing quote is the first one that ends its value, as dotenv backtracks to it", () => {
  assert.deepEqual(texts("KEY='C:\\dir\\' # why\nNEXT=1\n", ".env"), ["# why"])
  assert.deepEqual(texts("KEY='a\\'b\\'\n# c' # why\n", ".env"), ["# why"])
  assert.deepEqual(texts("KEY='a\\' # why\nB=x'y\n# c\n", ".env"), [
    "# why",
    "# c",
  ])
  assert.deepEqual(texts("KEY='a\\' x\n# b\nOTHER='\n# c\n", ".env"), ["# c"])
})

test("env files: a quote that opens no value hides no comment", () => {
  assert.deepEqual(texts("KEY=it's\n# why\nOTHER=x'\n", ".env"), ["# why"])
  assert.deepEqual(texts('KEY=a "b # c"\n', ".env"), ['# c"'])
  assert.deepEqual(texts('KEY="a\nb" tail\n# why\n', ".env"), ["# why"])
  assert.deepEqual(texts('A="abc\n# why\nB="def"\n', ".env"), ["# why"])
  assert.deepEqual(texts('KEY="hello\n# why\n', ".env"), ["# why"])
  assert.deepEqual(texts("KEY=`hello\n# why\n", ".env"), ["# why"])
})

test("toml files: a multi-line string, basic or literal, is a value up to its closing delimiter", () => {
  assert.deepEqual(texts('key = """\na\n# b\n"""\n', "x.toml"), [])
  assert.deepEqual(texts("key = '''\na\n# b\n''' # why\n", "x.toml"), ["# why"])
  assert.deepEqual(texts('key = """\na ""b"" \\"""\n# b\n"""\n', "x.toml"), [])
  assert.deepEqual(texts('key = """a\n# b"""" # why\n', "x.toml"), ["# why"])
  assert.deepEqual(texts("key = '''a\\\n# b''' # why\n", "x.toml"), ["# why"])
  assert.deepEqual(texts('key = """\\\n  a # b\\\n"""\n', "x.toml"), [])
})

test("toml files: a # outside a string is a comment, a # inside one is not", () => {
  const source = [
    "# header",
    'name = "a # b" # trailing',
    "path = 'c:\\dir\\' #glued",
    '"quoted # key" = 1',
    "list = [1,2]# glued",
    "[table] # why",
    'empty = "" # after',
  ].join("\n")
  assert.deepEqual(texts(source, "x.toml"), [
    "# header",
    "# trailing",
    "#glued",
    "# glued",
    "# why",
    "# after",
  ])
})

test("a quote that is never closed hides no comment: the file is reported as unparsable", () => {
  const [shellLine, ...shellRest] = checkFile('echo "a\n# why\n', "run.sh")
  assert.match(shellLine, /^run\.sh: cannot be parsed.*quote opened on line 1/)
  assert.deepEqual(shellRest, [])
  assert.match(
    checkFile("echo 'a\n# why\necho 'b'\n", "run.sh")[0],
    /^run\.sh: cannot be parsed/
  )
  for (const source of [
    "cat <<EOF\nbody\n# why\n",
    "cat <<EOF",
    "cat <<-EOF\nbody\n  EOF\n",
    'echo "$(echo a\n# why\n',
    'echo "`echo a\n# why\n',
    'echo "$(echo a)\n# why\n',
  ]) {
    const [line, ...rest] = checkFile(source, "run.sh")
    assert.match(line, /^run\.sh: cannot be parsed.*opened on line 1 is never/)
    assert.deepEqual(rest, [])
  }
  assert.deepEqual(checkFile('KEY="a\n# why\nOTHER=1\n', ".env.example"), [
    ".env.example:2:1 # why",
  ])
  for (const source of [
    'key = """a\n# why\n',
    "key = '''a\n# why\n",
    'key = "a\n# why\n"\n',
    "key = 'a\n# why\n",
  ]) {
    const [line, ...rest] = checkFile(source, "x.toml")
    assert.match(line, /^x\.toml: cannot be parsed.*quote opened on line 1/)
    assert.deepEqual(rest, [])
  }
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
