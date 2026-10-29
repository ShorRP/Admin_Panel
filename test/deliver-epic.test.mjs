import assert from "node:assert/strict"
import { execFileSync, spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  loadSlots,
  releaseSlots,
  slotsDir,
  takeSlot,
} from "../.claude/skills/deliver-epic/scripts/slots.mjs"

const SCRIPT = fileURLToPath(
  new URL("../.claude/skills/deliver-epic/scripts/slots.mjs", import.meta.url)
)

const runSlots = (cwd, ...args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" })

async function withRepository(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deliver-epic-repo-"))
  const repository = path.join(root, path.basename(root))
  const worktree = path.join(root, "worktree")
  const git = (...args) =>
    execFileSync("git", args, { cwd: repository, stdio: "ignore" })
  try {
    fs.mkdirSync(repository)
    git("init", "--quiet")
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "Start"
    )
    git("worktree", "add", "--quiet", worktree)
    return await callback({ repository, worktree })
  } finally {
    fs.rmSync(slotsDir(repository), { recursive: true, force: true })
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function withDir(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deliver-epic-test-"))
  try {
    return callback(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function configFile(dir, slots) {
  const file = path.join(dir, "config.json")
  fs.writeFileSync(file, JSON.stringify({ slots }))
  return file
}

test("the repository's config runs end to end alone, builds and tests two at a time, and one merge at a time", () => {
  const slots = loadSlots()
  assert.deepEqual(slots.e2e, { count: 1, commands: ["pnpm test:e2e"] })
  assert.deepEqual(slots.build, { count: 2, commands: ["pnpm build"] })
  assert.deepEqual(slots.test, { count: 2, commands: ["pnpm test"] })
  assert.deepEqual(slots.merge, { count: 1 })
})

test("a config refuses a slot whose count is not a positive whole number", () => {
  withDir((dir) => {
    for (const count of [0, 1.5, "2", undefined]) {
      const file = configFile(dir, { merge: { count: 1 }, build: { count } })
      assert.throws(() => loadSlots(file), /"build" needs a count of 1 or more/)
    }
  })
})

test("a config refuses to go without the merge slot", () => {
  withDir((dir) => {
    const file = configFile(dir, { build: { count: 2 } })
    assert.throws(() => loadSlots(file), /needs a "merge" slot/)
  })
})

const SLOTS = {
  merge: { count: 1 },
  build: { count: 2, commands: ["pnpm build"] },
}

test("a slot's places are taken up to its count, then refused until a holder lets one go", () => {
  withDir((dir) => {
    assert.equal(
      takeSlot(dir, SLOTS, { slot: "build", holder: "231" }).taken,
      true
    )
    assert.equal(
      takeSlot(dir, SLOTS, { slot: "build", holder: "234" }).taken,
      true
    )
    const refused = takeSlot(dir, SLOTS, { slot: "build", holder: "235" })
    assert.equal(refused.taken, false)
    assert.deepEqual(refused.holders, ["231", "234"])
    releaseSlots(dir, "231")
    assert.equal(
      takeSlot(dir, SLOTS, { slot: "build", holder: "235" }).taken,
      true
    )
  })
})

test("a holder that takes again a slot it holds keeps its one place", () => {
  withDir((dir) => {
    takeSlot(dir, SLOTS, { slot: "merge", holder: "231" })
    assert.deepEqual(takeSlot(dir, SLOTS, { slot: "merge", holder: "231" }), {
      taken: true,
      holders: ["231"],
    })
    assert.deepEqual(releaseSlots(dir, "231"), ["merge"])
    assert.equal(
      takeSlot(dir, SLOTS, { slot: "merge", holder: "234" }).taken,
      true
    )
  })
})

test("a place held by a process that has ended frees itself, while one taken outside a process waits for its release", () => {
  withDir((dir) => {
    const ended = spawnSync(process.execPath, ["-e", ""]).pid
    takeSlot(dir, SLOTS, { slot: "merge", holder: "231", pid: ended })
    assert.equal(
      takeSlot(dir, SLOTS, { slot: "merge", holder: "234" }).taken,
      true
    )
    assert.deepEqual(takeSlot(dir, SLOTS, { slot: "merge", holder: "235" }), {
      taken: false,
      holders: ["234"],
    })
  })
})

test("a slot the config does not name, or a holder that is no plain word, is refused", () => {
  withDir((dir) => {
    assert.throws(
      () => takeSlot(dir, SLOTS, { slot: "lint", holder: "231" }),
      /no slot "lint": the config names merge, build/
    )
    assert.throws(
      () => takeSlot(dir, SLOTS, { slot: "build", holder: "../231" }),
      /holder "..\/231" must be letters, digits, - or _/
    )
  })
})

test("agents in two worktrees of one repository share its slots", async () => {
  await withRepository(({ repository, worktree }) => {
    const taken = runSlots(repository, "acquire", "merge", "231")
    assert.equal(taken.status, 0, taken.stderr)
    assert.match(taken.stdout, /^took merge for 231$/m)
    assert.match(runSlots(worktree, "list").stdout, /^merge 1\/1: 231$/m)
    const released = runSlots(worktree, "release", "231")
    assert.equal(released.status, 0, released.stderr)
    assert.match(runSlots(repository, "list").stdout, /^merge 0\/1$/m)
  })
})

test("a command run in a slot holds a place while it runs, frees it after, and hands back its exit code", async () => {
  await withRepository(({ repository }) => {
    const inside = runSlots(
      repository,
      ...["run", "e2e", "231", "--", process.execPath, SCRIPT, "list"]
    )
    assert.equal(inside.status, 0, inside.stderr)
    assert.match(inside.stdout, /^e2e 1\/1: 231 \(pid \d+\)$/m)
    assert.match(runSlots(repository, "list").stdout, /^e2e 0\/1$/m)
    const failing = runSlots(
      repository,
      ...[
        "run",
        "e2e",
        "231",
        "--",
        process.execPath,
        "-e",
        "process.exitCode = 3",
      ]
    )
    assert.equal(failing.status, 3, failing.stderr)
  })
})

test(
  "a slot asked for while full waits, saying who holds it, until its holder lets it go",
  { timeout: 15_000 },
  async () => {
    await withRepository(async ({ repository }) => {
      runSlots(repository, "acquire", "merge", "231")
      const waiting = spawn(
        process.execPath,
        [SCRIPT, "acquire", "merge", "234"],
        {
          cwd: repository,
        }
      )
      try {
        let stdout = ""
        let stderr = ""
        waiting.stdout.on("data", (chunk) => (stdout += chunk))
        const exited = new Promise((resolve) => waiting.on("exit", resolve))
        await Promise.race([
          exited,
          new Promise((resolve) =>
            waiting.stderr.on("data", (chunk) => {
              stderr += chunk
              if (stderr.includes("\n")) resolve()
            })
          ),
        ])
        assert.equal(stderr, "waiting for merge, held by 231\n")
        assert.equal(stdout, "")
        runSlots(repository, "release", "231")
        assert.equal(await exited, 0)
        assert.equal(stdout, "took merge for 234\n")
      } finally {
        waiting.kill()
      }
    })
  }
)
