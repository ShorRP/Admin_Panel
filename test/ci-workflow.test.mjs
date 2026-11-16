import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { parse } from "yaml"

const WORKFLOW = fileURLToPath(
  new URL("../.github/workflows/ci.yml", import.meta.url)
)
const STATUS = "Check"
const RESULTS = "${{ join(needs.*.result, ' ') }}"

function gateAndOthers() {
  const jobs = parse(fs.readFileSync(WORKFLOW, "utf8")).jobs
  const ids = Object.keys(jobs)
  const gates = ids.filter((id) => jobs[id].name === STATUS)
  assert.equal(gates.length, 1, `exactly one job is named ${STATUS}`)
  return {
    gate: jobs[gates[0]],
    others: ids.filter((id) => id !== gates[0]),
  }
}

function verdictStep(gate) {
  const steps = gate.steps.filter((step) => step.run !== undefined)
  assert.equal(steps.length, 1)
  return steps[0]
}

function verdict(gate, results) {
  const { run } = verdictStep(gate)
  return spawnSync("sh", ["-e", "-c", run], {
    env: { ...process.env, RESULTS: results },
    encoding: "utf8",
  })
}

test("one job is named Check, the status that main's ruleset requires", () => {
  const { others } = gateAndOthers()
  assert.ok(others.length > 0)
})

test("Check waits for every other job, so that a job added later cannot be left out", () => {
  const { gate, others } = gateAndOthers()
  assert.deepEqual([...gate.needs].sort(), [...others].sort())
})

test("Check runs whatever its jobs ended with, a cancelled run included, since a skipped required status counts as a success", () => {
  const { gate } = gateAndOthers()
  assert.equal(String(gate.if).replace(/^\$\{\{\s*|\s*\}\}$/g, ""), "always()")
})

test("Check reads the result of every job it waits for from needs.*.result, so that adding a job touches only needs", () => {
  const { gate } = gateAndOthers()
  assert.deepEqual(verdictStep(gate).env, { RESULTS })
  assert.equal(gate.env, undefined)
})

test("Check fails unless every result is success, a skipped or cancelled job included", (context) => {
  const { gate } = gateAndOthers()
  if (spawnSync("sh", ["-c", "true"]).error) {
    context.skip("no sh on this machine")
    return
  }
  assert.equal(verdict(gate, "success success").status, 0)
  assert.equal(verdict(gate, "success").status, 0)
  for (const results of [
    "success failure",
    "failure success",
    "success cancelled",
    "skipped success",
    "success success skipped",
    "",
  ]) {
    assert.notEqual(verdict(gate, results).status, 0, results)
  }
})
