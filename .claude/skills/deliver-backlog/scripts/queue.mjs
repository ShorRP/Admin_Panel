import { execFileSync } from "node:child_process"
import fs from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parseArgs } from "node:util"

import {
  desiredStatus,
  isEpic,
  waitingReasons,
} from "../../groom-backlog/scripts/plan.mjs"

const BACKLOG = fileURLToPath(
  new URL("../../groom-backlog/scripts/backlog.mjs", import.meta.url)
)
const SCOPE_LABELS = ["ready-for-agent", "skill:implement"]

const inScope = (issue) =>
  !isEpic(issue) && SCOPE_LABELS.every((label) => issue.labels.includes(label))

const summary = ({ number, title }, why) => ({ number, title, why })

const holdOn = ({ assignees, linkedOpenPullRequests }) =>
  assignees.length
    ? `assigned to ${assignees.join(", ")}`
    : `PR #${linkedOpenPullRequests[0]} closes it`

export function readQueue(snapshot, skipped = []) {
  const open = new Map(snapshot.issues.map((issue) => [issue.number, issue]))
  const tickets = snapshot.items
    .map((item) => open.get(item.issue))
    .filter((issue) => issue && inScope(issue))
  const withStatus = (status) =>
    tickets.filter((issue) => desiredStatus(issue) === status)
  const free = withStatus("Todo")
  return {
    ready: free.filter((issue) => !skipped.includes(issue.number)),
    setAside: free.filter((issue) => skipped.includes(issue.number)),
    waiting: withStatus("Blocked").map((issue) =>
      summary(
        issue,
        waitingReasons(issue)
          .map((reason) => reason.why)
          .join("; ")
      )
    ),
    held: withStatus("In progress").map((issue) =>
      summary(issue, holdOn(issue))
    ),
  }
}

const listed = (entries) =>
  entries
    .map(({ number, why }) => (why ? `#${number} (${why})` : `#${number}`))
    .join(", ")

export function describeQueue({ ready, setAside, waiting, held }) {
  const [next] = ready
  const lines = [
    `next: ${next ? `#${next.number} ${next.title}` : "none"}`,
    `ready: ${ready.length}`,
  ]
  const lists = { "set aside": setAside, waiting, held }
  for (const [name, entries] of Object.entries(lists)) {
    if (entries.length) lines.push(`${name}: ${listed(entries)}`)
  }
  return lines.join("\n")
}

function ticketNumber(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`--skip takes a ticket number, not "${value}"`)
  }
  return Number(value)
}

function takeSnapshot() {
  const file = execFileSync(process.execPath, [BACKLOG, "snapshot"], {
    encoding: "utf8",
  }).trim()
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } finally {
    fs.rmSync(file, { force: true })
  }
}

function main(args) {
  const { values } = parseArgs({
    args,
    options: { skip: { type: "string", multiple: true, default: [] } },
  })
  const skipped = values.skip.map(ticketNumber)
  console.log(describeQueue(readQueue(takeSnapshot(), skipped)))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
