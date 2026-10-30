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
