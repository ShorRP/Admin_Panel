import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  describeQueue,
  readQueue,
} from "../.claude/skills/deliver-backlog/scripts/queue.mjs"

const SCRIPT = fileURLToPath(
  new URL(
    "../.claude/skills/deliver-backlog/scripts/queue.mjs",
    import.meta.url
  )
)

const runQueue = (...args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" })

const pbi = (number, overrides = {}) => ({
  number,
  title: `Ticket ${number}`,
  state: "OPEN",
  body: "",
  labels: ["enhancement", "ready-for-agent", "skill:implement"],
  assignees: [],
  subIssues: [],
  blockedBy: [],
  linkedOpenPullRequests: [],
  ...overrides,
})

const snapshot = (issues, board = issues.map((issue) => issue.number)) => ({
  issues,
  items: board.map((issue) => ({ issue })),
})

const numbers = (entries) => entries.map((entry) => entry.number)

test("the ready PBIs follow the board's order, not the order of the issues' numbers", () => {
  const issues = [pbi(12), pbi(30), pbi(21)]
  const { ready } = readQueue(snapshot(issues, [30, 12, 21]))
  assert.deepEqual(numbers(ready), [30, 12, 21])
})

test("a closed ticket still on the board stays out of the queue", () => {
  const { ready } = readQueue(snapshot([pbi(12)], [8, 12]))
  assert.deepEqual(numbers(ready), [12])
})

test("the queue takes only tickets labelled both ready-for-agent and skill:implement", () => {
  const issues = [
    pbi(1),
    pbi(2, { labels: ["bug", "ready-for-human", "skill:implement"] }),
    pbi(3, { labels: ["bug", "ready-for-agent", "skill:grill-with-docs"] }),
    pbi(4, { labels: ["bug", "needs-triage"] }),
  ]
  assert.deepEqual(numbers(readQueue(snapshot(issues)).ready), [1])
})

test("an epic stays out of the queue, whether its label or its sub-issues say so", () => {
  const issues = [
    pbi(1, { labels: ["epic", "ready-for-agent", "skill:implement"] }),
    pbi(2, { subIssues: [{ number: 3, state: "OPEN" }] }),
    pbi(3),
  ]
  assert.deepEqual(numbers(readQueue(snapshot(issues)).ready), [3])
})

test("a ticket waits while a ticket blocks it, and is ready once that one closes", () => {
  const issues = [
    pbi(1, { blockedBy: [{ number: 9, state: "OPEN" }] }),
    pbi(2, { blockedBy: [{ number: 8, state: "CLOSED" }] }),
  ]
  const { ready, waiting } = readQueue(snapshot(issues))
  assert.deepEqual(numbers(ready), [2])
  assert.deepEqual(waiting, [
    { number: 1, title: "Ticket 1", why: "blocked by #9" },
  ])
})

test("a ticket whose body opens with Bloqué waits, a Stop of a run included", () => {
  const issues = [pbi(1, { body: "Bloqué : Gilles doit saisir le secret." })]
  const { ready, waiting } = readQueue(snapshot(issues))
  assert.deepEqual(ready, [])
  assert.deepEqual(waiting, [
    { number: 1, title: "Ticket 1", why: "blocked outside the tracker" },
  ])
})

test("a ticket assigned to someone, or that an open PR closes, is held by another session", () => {
  const issues = [
    pbi(1, { assignees: ["PothieuG"] }),
    pbi(2, { linkedOpenPullRequests: [277] }),
    pbi(3),
  ]
  const { ready, held } = readQueue(snapshot(issues))
  assert.deepEqual(numbers(ready), [3])
  assert.deepEqual(held, [
    { number: 1, title: "Ticket 1", why: "assigned to PothieuG" },
    { number: 2, title: "Ticket 2", why: "PR #277 closes it" },
  ])
})

test("a ticket the run set aside is left out of what is ready, so that the run moves on", () => {
  const issues = [pbi(1), pbi(2)]
  const { ready, setAside } = readQueue(snapshot(issues), [1])
  assert.deepEqual(numbers(ready), [2])
  assert.deepEqual(numbers(setAside), [1])
})

test("the summary opens with the next PBI, then counts the ready ones and names what the run leaves", () => {
  const issues = [
    pbi(1),
    pbi(2),
    pbi(3, { blockedBy: [{ number: 9, state: "OPEN" }] }),
    pbi(4, { assignees: ["PothieuG"] }),
    pbi(5),
  ]
  assert.equal(
    describeQueue(readQueue(snapshot(issues), [5])),
    [
      "next: #1 Ticket 1",
      "ready: 2",
      "set aside: #5",
      "waiting: #3 (blocked by #9)",
      "held: #4 (assigned to PothieuG)",
    ].join("\n")
  )
})

test("the summary says none when nothing is ready, and leaves out the lists it has nothing for", () => {
  assert.equal(
    describeQueue(readQueue(snapshot([]))),
    ["next: none", "ready: 0"].join("\n")
  )
})

test("an option the script does not know is refused before it reads the board", () => {
  const refused = runQueue("--skipped", "12")
  assert.notEqual(refused.status, 0)
  assert.match(refused.stderr, /--skipped/)
})

test("a --skip that is no ticket number is refused, since it would set nothing aside", () => {
  const refused = runQueue("--skip", "#12")
  assert.notEqual(refused.status, 0)
  assert.match(refused.stderr, /--skip takes a ticket number, not "#12"/)
})
