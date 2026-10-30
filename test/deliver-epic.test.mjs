import assert from "node:assert/strict"
import { execFileSync, spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  finishPbi,
  githubForge,
} from "../.claude/skills/deliver-epic/scripts/finish-pbi.mjs"
import {
  loadSlots,
  releaseSlots,
  slotsDir,
  takeSlot,
} from "../.claude/skills/deliver-epic/scripts/slots.mjs"

const SCRIPT = fileURLToPath(
  new URL("../.claude/skills/deliver-epic/scripts/slots.mjs", import.meta.url)
)
const FINISH_SCRIPT = fileURLToPath(
  new URL(
    "../.claude/skills/deliver-epic/scripts/finish-pbi.mjs",
    import.meta.url
  )
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

const GIT_IDENTITY = {
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
}

function gitIn(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...GIT_IDENTITY },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

async function withPbi(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deliver-epic-pbi-"))
  const origin = path.join(root, "origin.git")
  const repository = path.join(root, path.basename(root))
  const worktree = path.join(repository, ".claude", "worktrees", "agent-1a2b")
  const branch = "tooling/feature"
  try {
    gitIn(root, "init", "--quiet", "--bare", "-b", "main", origin)
    gitIn(root, "clone", "--quiet", origin, repository)
    fs.writeFileSync(path.join(repository, ".gitignore"), "node_modules\n")
    gitIn(repository, "add", ".")
    gitIn(repository, "commit", "--quiet", "-m", "Start")
    gitIn(repository, "push", "--quiet", "--set-upstream", "origin", "main")
    gitIn(repository, "branch", "worktree-agent-1a2b")
    gitIn(repository, "worktree", "add", "--quiet", "-b", branch, worktree)
    gitIn(repository, "worktree", "lock", "--reason", "claude agent", worktree)
    fs.writeFileSync(path.join(worktree, "feature.txt"), "one")
    gitIn(worktree, "add", ".")
    gitIn(worktree, "commit", "--quiet", "-m", "Feature")
    gitIn(worktree, "push", "--quiet", "--set-upstream", "origin", branch)
    fs.writeFileSync(path.join(worktree, "feature.txt"), "two")
    gitIn(worktree, "commit", "--quiet", "-am", "Merge main")
    let deep = path.join(worktree, "node_modules")
    for (let level = 0; level < 12; level++)
      deep = path.join(deep, "a".repeat(30))
    fs.mkdirSync(deep, { recursive: true })
    fs.writeFileSync(path.join(deep, "file.txt"), "installed")
    gitIn(repository, "switch", "--quiet", "-c", "another-session")
    const mergeIntoOrigin = () => {
      gitIn(worktree, "push", "--quiet", "origin", "HEAD:refs/heads/merge-tip")
      gitIn(origin, "update-ref", "refs/heads/main", "refs/heads/merge-tip")
    }
    return await callback({
      repository,
      origin,
      worktree,
      branch,
      mergeIntoOrigin,
    })
  } finally {
    fs.rmSync(slotsDir(repository), { recursive: true, force: true })
    fs.rmSync(root, { recursive: true, force: true })
  }
}

const MERGED_AND_CLOSED = {
  pullRequest: () => ({ state: "MERGED", baseRefName: "main" }),
  issue: () => ({ state: "CLOSED" }),
}

const branchesOf = (repository) =>
  gitIn(repository, "branch", "--format=%(refname:short)").split("\n")

test("finishing a PBI removes its locked worktree whatever the depth of its node_modules, and its branch once origin's default branch holds it, though git branch -d would refuse", async () => {
  await withPbi(async ({ repository, worktree, branch, mergeIntoOrigin }) => {
    mergeIntoOrigin()
    assert.ok(
      !gitIn(repository, "branch", "--merged").includes(branch),
      "the main checkout's HEAD must not hold the branch, as another session's branch does not"
    )
    const result = finishPbi({
      repository,
      ticket: 7,
      pr: 70,
      worktree,
      branch,
      forge: MERGED_AND_CLOSED,
    })
    assert.equal(result.ok, true, result.lines.join("\n"))
    assert.equal(fs.existsSync(worktree), false)
    assert.ok(
      !gitIn(repository, "worktree", "list", "--porcelain").includes(
        "agent-1a2b"
      )
    )
    assert.ok(!branchesOf(repository).includes(branch))
  })
})

async function assertRefusedAndUntouched(pbi, options, message) {
  const result = finishPbi({
    repository: pbi.repository,
    ticket: 7,
    pr: 70,
    worktree: pbi.worktree,
    branch: pbi.branch,
    forge: MERGED_AND_CLOSED,
    ...options,
  })
  assert.equal(result.ok, false)
  assert.match(result.lines.at(-1), message)
  assert.equal(fs.existsSync(pbi.worktree), true)
  assert.ok(branchesOf(pbi.repository).includes(pbi.branch))
}

test("finishing a PBI whose PR is not merged removes nothing", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    await assertRefusedAndUntouched(
      pbi,
      {
        forge: {
          ...MERGED_AND_CLOSED,
          pullRequest: () => ({ state: "OPEN", baseRefName: "main" }),
        },
      },
      /^refused: pull request #70 is OPEN, not MERGED$/
    )
  })
})

test("finishing a PBI whose ticket is still open removes nothing", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    await assertRefusedAndUntouched(
      pbi,
      {
        forge: {
          ...MERGED_AND_CLOSED,
          issue: () => ({ state: "OPEN" }),
        },
      },
      /^refused: ticket #7 is OPEN, not CLOSED$/
    )
  })
})

test("finishing a PBI whose worktree holds an untracked file removes nothing", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    fs.writeFileSync(path.join(pbi.worktree, "notes.md"), "unfinished")
    await assertRefusedAndUntouched(
      pbi,
      {},
      /^refused: the worktree is not clean: \?\? notes\.md$/
    )
  })
})

test("finishing a PBI removes only a folder under the repository's .claude/worktrees", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    const worktrees = path.join(pbi.repository, ".claude", "worktrees")
    for (const outside of [
      pbi.repository,
      worktrees,
      path.join(worktrees, "..", ".."),
      path.dirname(pbi.repository),
    ]) {
      const result = finishPbi({
        repository: pbi.repository,
        ticket: 7,
        pr: 70,
        worktree: outside,
        branch: pbi.branch,
        forge: MERGED_AND_CLOSED,
      })
      assert.equal(result.ok, false, outside)
      assert.match(
        result.lines.at(-1),
        /^refused: the worktree is not under the repository's \.claude\/worktrees\/$/
      )
    }
    assert.equal(fs.existsSync(path.join(pbi.repository, ".git")), true)
    assert.equal(fs.existsSync(pbi.worktree), true)
  })
})

test("finishing a PBI refuses a folder that git does not know as a worktree, empty or not", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    const stranger = path.join(
      pbi.repository,
      ".claude",
      "worktrees",
      "stranger"
    )
    fs.mkdirSync(stranger)
    const result = finishPbi({
      repository: pbi.repository,
      ticket: 7,
      pr: 70,
      worktree: stranger,
      branch: pbi.branch,
      forge: MERGED_AND_CLOSED,
    })
    assert.equal(result.ok, false)
    assert.match(
      result.lines.at(-1),
      /^refused: .*stranger is not a worktree of this repository$/
    )
    assert.equal(fs.existsSync(stranger), true)
  })
})

test("finishing a PBI from inside its worktree is refused, since the folder could not be removed", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    await assertRefusedAndUntouched(
      pbi,
      { cwd: path.join(pbi.worktree, "node_modules") },
      /^refused: run this from outside the worktree/
    )
  })
})

test("finishing a PBI keeps a branch that origin's default branch does not hold, with a line saying so", async () => {
  await withPbi(async (pbi) => {
    const result = finishPbi({
      repository: pbi.repository,
      ticket: 7,
      pr: 70,
      worktree: pbi.worktree,
      branch: pbi.branch,
      forge: MERGED_AND_CLOSED,
    })
    assert.equal(result.ok, false)
    assert.match(
      result.lines.at(-1),
      /^kept: branch tooling\/feature is not an ancestor of origin\/main$/
    )
    assert.equal(fs.existsSync(pbi.worktree), false)
    assert.ok(branchesOf(pbi.repository).includes(pbi.branch))
  })
})

test("finishing a PBI deletes the harness's leftover worktree-<folder> branch with it", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    assert.ok(branchesOf(pbi.repository).includes("worktree-agent-1a2b"))
    const result = finishPbi({
      repository: pbi.repository,
      ticket: 7,
      pr: 70,
      worktree: pbi.worktree,
      branch: pbi.branch,
      forge: MERGED_AND_CLOSED,
    })
    assert.equal(result.ok, true, result.lines.join("\n"))
    assert.ok(!branchesOf(pbi.repository).includes("worktree-agent-1a2b"))
  })
})

test("finishing a PBI never deletes the default branch the PR merged into", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    await assertRefusedAndUntouched(
      pbi,
      { branch: "main" },
      /^refused: branch main is the branch the pull request merged into$/
    )
    assert.ok(branchesOf(pbi.repository).includes("main"))
  })
})

const finishArguments = (pbi, extra = {}) => ({
  repository: pbi.repository,
  ticket: 7,
  pr: 70,
  worktree: pbi.worktree,
  branch: pbi.branch,
  forge: MERGED_AND_CLOSED,
  ...extra,
})

test("finishing a PBI prints one line per step it takes", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    const { lines } = finishPbi(finishArguments(pbi))
    assert.deepEqual(lines, [
      "pull request #70: merged into main",
      "ticket #7: closed",
      "worktree: clean",
      "worktree: unlocked",
      "worktree: removed",
      "worktree: pruned",
      "slots: 7 held none",
      "branch worktree-agent-1a2b: deleted, an ancestor of origin/main",
      "branch tooling/feature: deleted, an ancestor of origin/main",
    ])
  })
})

test("finishing a PBI frees the places its holder took, whatever became of its branch", async () => {
  await withPbi(async (pbi) => {
    const dir = slotsDir(pbi.repository)
    takeSlot(dir, loadSlots(), { slot: "merge", holder: "7" })
    const { lines } = finishPbi(finishArguments(pbi))
    assert.ok(lines.includes("slots: released merge for 7"), lines.join("\n"))
    assert.equal(
      takeSlot(dir, loadSlots(), { slot: "merge", holder: "8" }).taken,
      true
    )
  })
})

test("finishing a PBI again after it finished says what was already done and succeeds", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    assert.equal(finishPbi(finishArguments(pbi)).ok, true)
    const again = finishPbi(finishArguments(pbi))
    assert.equal(again.ok, true, again.lines.join("\n"))
    assert.deepEqual(again.lines.slice(2), [
      "worktree: already removed",
      "worktree: pruned",
      "slots: 7 held none",
      "branch tooling/feature: already gone",
    ])
  })
})

test("the command line finishes from the repository of the folder it runs in, and refuses from inside the worktree", async () => {
  await withPbi(async (pbi) => {
    const refused = spawnSync(
      process.execPath,
      [FINISH_SCRIPT, "7", "70", pbi.worktree, pbi.branch],
      { cwd: pbi.worktree, encoding: "utf8" }
    )
    assert.equal(refused.status, 1, refused.stderr)
    assert.match(
      refused.stdout,
      /^refused: run this from outside the worktree/m
    )
    const lost = spawnSync(process.execPath, [FINISH_SCRIPT, "7"], {
      cwd: pbi.repository,
      encoding: "utf8",
    })
    assert.equal(lost.status, 2)
    assert.match(
      lost.stderr,
      /usage: node .*finish-pbi\.mjs <ticket> <pr> <worktree> <branch>/
    )
  })
})

test("the forge reads a pull request and a ticket through gh", () => {
  const asked = []
  const forge = githubForge((args) => {
    asked.push(args)
    return args[0] === "pr"
      ? '{"state":"MERGED","baseRefName":"main"}'
      : '{"state":"CLOSED"}'
  })
  assert.deepEqual(forge.pullRequest(70), {
    state: "MERGED",
    baseRefName: "main",
  })
  assert.deepEqual(forge.issue(7), { state: "CLOSED" })
  assert.deepEqual(asked, [
    ["pr", "view", "70", "--json", "state,baseRefName"],
    ["issue", "view", "7", "--json", "state"],
  ])
})

test("finishing a PBI whose forge cannot be read ends with a line saying so and removes nothing", async () => {
  await withPbi(async (pbi) => {
    pbi.mergeIntoOrigin()
    await assertRefusedAndUntouched(
      pbi,
      {
        forge: {
          ...MERGED_AND_CLOSED,
          issue: () => {
            throw new Error("gh: could not resolve to an Issue\nsecond line")
          },
        },
      },
      /^failed: gh: could not resolve to an Issue$/
    )
  })
})
