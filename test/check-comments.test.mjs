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

test("markdown files: an HTML comment is found, on one line or several", () => {
  assert.deepEqual(texts("# Title\n\n<!-- why -->\ntext\n", "docs/a.md"), [
    "<!-- why -->",
  ])
  assert.deepEqual(texts("text <!-- a\nb --> text\n", "README.md"), [
    "<!-- a\nb -->",
  ])
  assert.deepEqual(
    texts("# Title\n\nPlain *text* and a [link](#id).\n", "a.md"),
    []
  )
  assert.deepEqual(checkFile("a\n\n```\nx\n```\n<!-- why -->\n", "a.md"), [
    "a.md:6:1 <!-- why -->",
  ])
})

test("markdown files: a fenced code block holds no comment", () => {
  assert.deepEqual(texts("```html\n<!-- sample -->\n```\n", "a.md"), [])
  assert.deepEqual(texts("~~~\n<!-- sample -->\n~~~\n", "a.md"), [])
  assert.deepEqual(texts("````\n```\n<!-- sample -->\n```\n````\n", "a.md"), [])
  assert.deepEqual(texts("   ```\r\n<!-- sample -->\r\n   ```\r\n", "a.md"), [])
  assert.deepEqual(texts("```\ncode\n```\n<!-- why -->\n", "a.md"), [
    "<!-- why -->",
  ])
  assert.deepEqual(texts("```\ncode\n~~~\n<!-- sample -->\n```\n", "a.md"), [])
  assert.deepEqual(texts("```\r\ncode\r\n```\r\n<!-- why -->\r\n", "a.md"), [
    "<!-- why -->",
  ])
})

test("markdown files: an inline code span holds no comment", () => {
  assert.deepEqual(texts("Use `<!-- sample -->` here\n", "a.md"), [])
  assert.deepEqual(texts("Use ``a ` <!-- sample -->`` here\n", "a.md"), [])
  assert.deepEqual(texts("Use `a\nb <!-- sample -->` here\n", "a.md"), [])
  assert.deepEqual(texts("a ` b <!-- why -->\n", "a.md"), ["<!-- why -->"])
  assert.deepEqual(texts("`a\n\n<!-- why --> b`\n", "a.md"), ["<!-- why -->"])
  assert.deepEqual(texts("\\`<!-- why -->`\n", "a.md"), ["<!-- why -->"])
  assert.deepEqual(texts("`a` <!-- why --> `b`\n", "a.md"), ["<!-- why -->"])
})

test("markdown files: a line that opens an HTML comment ends an inline code span", () => {
  assert.deepEqual(
    texts("It's the `x flag\n<!-- hidden -->\nand `y` flag\n", "a.md"),
    ["<!-- hidden -->"]
  )
  assert.deepEqual(texts("Use `a\n<!-- sample -->` here\n", "a.md"), [
    "<!-- sample -->",
  ])
  assert.deepEqual(texts("Use `a\n   <!-- why -->\nb`\n", "a.md"), [
    "<!-- why -->",
  ])
  assert.deepEqual(texts("Use `a\n    <!-- sample -->\nb`\n", "a.md"), [])
  assert.deepEqual(texts("a <!-- why --> and `b`\n<!-- also -->\n", "a.md"), [
    "<!-- why -->",
    "<!-- also -->",
  ])
})

test("python files: a # comment is found, a # in a string is not", () => {
  assert.deepEqual(texts("# header\nx = 1  # why\n", "a.py"), [
    "# header",
    "# why",
  ])
  assert.deepEqual(texts("x = 'a # b'\ny = \"a # b\"\n", "a.py"), [])
  assert.deepEqual(texts('x = "a \\" # b"\n', "a.py"), [])
  assert.deepEqual(texts('doc = """\n# not\n"""\nz = 1  # why\n', "a.py"), [
    "# why",
  ])
  assert.deepEqual(texts("doc = '''a ' # b\n\\''' # c\n'''\n", "a.py"), [])
})

test("python files: a shebang is allowed on the first line only", () => {
  assert.deepEqual(texts("#!/usr/bin/env python3\nx = 1\n", "run.py"), [])
  assert.deepEqual(texts("x = 1\n#!/usr/bin/env python3\n", "run.py"), [
    "#!/usr/bin/env python3",
  ])
})

test("powershell files: line and block comments are found", () => {
  assert.deepEqual(texts("# header\nGet-Item # why\n", "a.ps1"), [
    "# header",
    "# why",
  ])
  assert.deepEqual(texts("<# a\nb #>\nGet-Item <# c #> -Path x\n", "a.ps1"), [
    "<# a\nb #>",
    "<# c #>",
  ])
  assert.deepEqual(texts("if ($a) {# why\n}\nGet-Item;# also\n", "a.ps1"), [
    "# why",
    "# also",
  ])
})

test("powershell files: a # outside a string is a comment, wherever it comes", () => {
  for (const [source, comment] of [
    ["$a =# c1\n", "# c1"],
    ["$b=#c2\n", "#c2"],
    ["$c = 1 +# c3\n", "# c3"],
    ["$d = [#c4\n", "#c4"],
    ["1..3#c7\n", "#c7"],
    ['"x"#c8\n', "#c8"],
    ["$a.b#c9\n", "#c9"],
    ["echo a#b\n", "#b"],
  ]) {
    assert.deepEqual(texts(source, "a.ps1"), [comment], source)
  }
})

test("powershell files: a subexpression that holds quotes in a string is read as code, so its # is reported", () => {
  assert.deepEqual(texts('$s = "a $("b # c") d"\n', "a.ps1"), ['# c") d"'])
})

test("powershell files: a shebang is allowed on the first line only", () => {
  assert.deepEqual(texts("#!/usr/bin/env pwsh\nGet-Item\n", "run.ps1"), [])
  assert.deepEqual(texts("Get-Item\n#!/usr/bin/env pwsh\n", "run.ps1"), [
    "#!/usr/bin/env pwsh",
  ])
})

test("powershell files: a # in a string or here-string is code", () => {
  assert.deepEqual(texts("Write-Host 'a # b' \"c # d\"\n", "a.ps1"), [])
  assert.deepEqual(texts("Write-Host 'it''s # b'\n", "a.ps1"), [])
  assert.deepEqual(texts('Write-Host "say `"# no`" end"\n', "a.ps1"), [])
  assert.deepEqual(texts("Write-Host `# no\n", "a.ps1"), [])
  assert.deepEqual(texts('$s = "multi\n# no\nline"\n$x = 1 # why\n', "a.ps1"), [
    "# why",
  ])
  assert.deepEqual(
    texts('@"\n# no\n a "@ b\n"@\n@\'\n# no\n\'@\n$x # why\n', "a.ps1"),
    ["# why"]
  )
})

test("jsonc files: // and /* */ comments are found, valid json has none", () => {
  assert.deepEqual(texts('{ "a": "http://x" }', "tsconfig.jsonc"), [])
  assert.deepEqual(
    texts('{\n  // why\n  "a": 1, /* also */\n}', "tsconfig.jsonc"),
    ["// why", "/* also */"]
  )
})

for (const [construct, file, source] of [
  ["a python ''' string", "a.py", "x = '''abc\n# no\n"],
  ['a python """ string', "a.py", 'x = """abc\n# no\n'],
  ["a markdown ``` code fence", "a.md", "```\nx\n\n<!-- hidden -->\n"],
  ["a markdown ~~~ code fence", "a.md", "~~~\nx\n\n<!-- hidden -->\n"],
  ["a powershell <# block comment", "a.ps1", "<# abc\nGet-Item\n"],
  ["a powershell ' string", "a.ps1", "$x = 'abc\n# no\n"],
  ['a powershell " string', "a.ps1", '$x = "abc\n# no\n'],
  ['a powershell @" here-string', "a.ps1", '$x = @"\nabc\n# no\n a "@ b\n'],
  ["a powershell @' here-string", "a.ps1", "$x = @'\nabc\n# no\n a '@ b\n"],
]) {
  test(`${construct} that never closes is reported as unparsable`, () => {
    const [line, ...others] = checkFile(source, file)
    assert.match(
      line,
      new RegExp(`^${file.replace(".", "\\.")}: cannot be parsed`)
    )
    assert.deepEqual(others, [])
  })
}

test("a file of an unknown type is reported, since its comments cannot be checked", () => {
  assert.equal(familyOf("data/notes.xyz"), null)
  for (const file of ["data/notes.xyz", "LICENSE", "a.mdx"]) {
    const [line, ...others] = checkFile("hello\n", file)
    assert.match(line, new RegExp(`^${file}: unknown file type`))
    assert.deepEqual(others, [])
  }
})

test("files of a type without comments report nothing", () => {
  for (const file of [
    "pnpm-lock.yaml",
    "docs/design/a.png",
    "photo.JPG",
    "a.jpeg",
    "a.gif",
    "a.webp",
    "a.avif",
    "favicon.ico",
    "a.bmp",
    "font.woff",
    "font.woff2",
    "font.ttf",
    "font.otf",
    "font.eot",
  ]) {
    assert.deepEqual(checkFile("# not a comment\n", file), [])
  }
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

test("the repository check reads markdown, reports an unknown type and leaves commentless files unread", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-comments-"))
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    fs.writeFileSync(path.join(dir, "clean.md"), "# Title\n\n`<!-- code -->`\n")
    fs.writeFileSync(path.join(dir, "dirty.md"), "# Title\n\n<!-- why -->\n")
    fs.writeFileSync(
      path.join(dir, "logo.png"),
      Buffer.from([0x89, 0x50, 0x4e])
    )
    fs.writeFileSync(path.join(dir, "notes.xyz"), "hello\n")
    const problems = checkRepository(dir)
    assert.equal(problems.length, 2)
    assert.ok(problems.includes("dirty.md:3:1 <!-- why -->"))
    assert.ok(
      problems.some((line) => line.startsWith("notes.xyz: unknown file type"))
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
