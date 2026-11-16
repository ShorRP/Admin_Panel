import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { parse } from "yaml"

const WORKFLOW = fileURLToPath(
  new URL("../.github/workflows/ci.yml", import.meta.url)
)
const STATUS = "Check"

const jobs = parse(fs.readFileSync(WORKFLOW, "utf8")).jobs
const gate = Object.values(jobs).find((job) => job.name === STATUS)
const others = Object.keys(jobs).filter((id) => jobs[id] !== gate)

test("one job is named Check, the status that main's ruleset requires", () => {
  const named = Object.values(jobs).filter((job) => job.name === STATUS)
  assert.equal(named.length, 1)
  assert.ok(others.length > 0)
})

test("Check waits for every other job, so that a job added later cannot be left out", () => {
  assert.deepEqual([...gate.needs].sort(), [...others].sort())
})

test("Check runs whatever its jobs ended with, a cancelled run included, since a skipped required status counts as a success", () => {
  assert.equal(String(gate.if).replace(/^\$\{\{\s*|\s*\}\}$/g, ""), "always()")
})

test("Check fails unless each job it waits for succeeded", () => {
  const script = gate.steps.map((step) => step.run).join("\n")
  for (const id of others) {
    assert.match(
      JSON.stringify(gate),
      new RegExp(`\\$\\{\\{ needs\\.${id}\\.result \\}\\}`)
    )
  }
  const tests = script.split("\n").filter((line) => line.startsWith("test "))
  assert.ok(tests.length > 0)
  assert.equal(tests.length, others.length)
  for (const line of tests) {
    assert.match(line, /^test "\$[A-Z_0-9]+" = success$/)
  }
})
