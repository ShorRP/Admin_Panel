import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const HOOK = fileURLToPath(
  new URL("../.claude/hooks/format-after-edit.mjs", import.meta.url)
)

function withProject(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "format-after-edit-"))
  try {
    fs.writeFileSync(
      path.join(dir, ".prettierrc.json"),
      JSON.stringify({ semi: false })
    )
    return callback(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function runHook(dir, file, cwd = dir) {
  const input = JSON.stringify({
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Edit",
    tool_input: { file_path: file },
  })
  return spawnSync(process.execPath, [HOOK], {
    cwd,
    input,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  })
}

test("the format hook formats the file an edit touched", () => {
  withProject((dir) => {
    const file = path.join(dir, "src", "a.ts")
    fs.mkdirSync(path.dirname(file))
    fs.writeFileSync(file, "const a = 'x';\n")
    const result = runHook(dir, file)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fs.readFileSync(file, "utf8"), 'const a = "x"\n')
  })
})

test("the format hook loads the project's plugins whatever directory the session is in", () => {
  withProject((dir) => {
    const plugin = path.join(dir, "node_modules", "probe-plugin")
    fs.mkdirSync(plugin, { recursive: true })
    fs.writeFileSync(
      path.join(plugin, "package.json"),
      JSON.stringify({ name: "probe-plugin", type: "module", main: "index.js" })
    )
    fs.writeFileSync(
      path.join(plugin, "index.js"),
      "export const options = {}\n"
    )
    fs.writeFileSync(
      path.join(dir, ".prettierrc.json"),
      JSON.stringify({ semi: false, plugins: ["probe-plugin"] })
    )
    const file = path.join(dir, "a.ts")
    fs.writeFileSync(file, "const a = 'x';\n")
    const result = runHook(dir, file, os.tmpdir())
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fs.readFileSync(file, "utf8"), 'const a = "x"\n')
  })
})

test("the format hook leaves a file Prettier does not know as it is, without failing", () => {
  withProject((dir) => {
    const file = path.join(dir, "notes.txt")
    fs.writeFileSync(file, "const a = 'x';\n")
    const result = runHook(dir, file)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, "")
    assert.equal(fs.readFileSync(file, "utf8"), "const a = 'x';\n")
  })
})

test("the format hook leaves a file that .prettierignore or .gitignore lists as it is", () => {
  withProject((dir) => {
    fs.writeFileSync(path.join(dir, ".prettierignore"), "copied/\n")
    fs.writeFileSync(path.join(dir, ".gitignore"), "built/\n")
    for (const folder of ["copied", "built"]) {
      const file = path.join(dir, folder, "a.ts")
      fs.mkdirSync(path.dirname(file))
      fs.writeFileSync(file, "const a = 'x';\n")
      const result = runHook(dir, file)
      assert.equal(result.status, 0, result.stderr)
      assert.equal(fs.readFileSync(file, "utf8"), "const a = 'x';\n")
    }
  })
})

test("the format hook tells Claude which file Prettier could not parse, and leaves it as it is", () => {
  withProject((dir) => {
    const file = path.join(dir, "broken.ts")
    fs.writeFileSync(file, "const = ;\n")
    const result = runHook(dir, file)
    assert.equal(result.status, 2)
    assert.match(result.stderr, /^Prettier could not format .*broken\.ts: /)
    assert.equal(fs.readFileSync(file, "utf8"), "const = ;\n")
  })
})

test("the format hook leaves a file outside the project as it is", () => {
  withProject((dir) => {
    withProject((elsewhere) => {
      const file = path.join(elsewhere, "a.ts")
      fs.writeFileSync(file, "const a = 'x';\n")
      const result = runHook(dir, file)
      assert.equal(result.status, 0, result.stderr)
      assert.equal(fs.readFileSync(file, "utf8"), "const a = 'x';\n")
    })
  })
})
