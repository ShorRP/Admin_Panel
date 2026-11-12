import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parseDocument } from "yaml"
import { z } from "zod"

const BUDGET_FILE = "context-budget.json"
const COMMAND = "pnpm check:context-budget"
const ALWAYS_FILES = ["CLAUDE.md", ".claude/CLAUDE.md"]
const RULES_FOLDER = ".claude/rules/"
const MAX_HOPS = 4
const BOM = String.fromCharCode(0xfeff)

const count = (number) => number.toLocaleString("en-US")
const plural = (number, unit) =>
  `${count(number)} ${unit}${number === 1 ? "" : "s"}`

const ELSEWHERE =
  "to an ADR for a decision, to docs/ behind a pointer line, or to the commit message for a trial or a ticket trail"
const KEEP_KNOWLEDGE =
  "Delete a rule only when the code or a test already says it."
const SET_ADVICE = `Move the surplus instead of cutting it: to a .claude/rules/<area>.md scoped by paths:, ${ELSEWHERE}. ${KEEP_KNOWLEDGE}`
const RULE_ADVICE = `Split it into rules each scoped by paths:, or move the surplus ${ELSEWHERE}. ${KEEP_KNOWLEDGE}`
const COMMIT_BUDGET_FILE = `and commit ${BUDGET_FILE}.`

const Count = z.number().int().positive()
const BudgetFile = z.strictObject({
  budget: z.strictObject({
    alwaysLoaded: z.strictObject({ bytes: Count, lines: Count }),
    scopedRule: z.strictObject({ bytes: Count }),
  }),
  ceilings: z.strictObject({
    alwaysLoaded: z.strictObject({
      bytes: Count.optional(),
      lines: Count.optional(),
    }),
    scoped: z.record(z.string(), Count),
  }),
})

const MEASURES = [
  { key: "bytes", unit: "byte" },
  { key: "lines", unit: "line" },
]

function repositoryRoot(cwd) {
  const git = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  })
  if (git.error) throw git.error
  if (git.status !== 0) {
    throw new Error(
      `no git repository found from ${cwd}: ${git.stderr.trim().split("\n")[0]}`
    )
  }
  return git.stdout.trim()
}

function trackedFiles(root) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)))
}

function readBudgetFile(root) {
  const file = path.join(root, BUDGET_FILE)
  if (!fs.existsSync(file)) {
    throw new Error(
      `${BUDGET_FILE} not found at ${root}: it holds the budget and the ceilings of the context that Claude Code always loads`
    )
  }
  let json
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (error) {
    throw new Error(`${BUDGET_FILE} is not valid JSON: ${error.message}`)
  }
  const parsed = BudgetFile.safeParse(json)
  if (!parsed.success) {
    throw new Error(
      `${BUDGET_FILE} is malformed: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`
    )
  }
  return parsed.data
}

function measure(buffer) {
  let carriageReturns = 0
  let newlines = 0
  for (let index = 0; index < buffer.length; index++) {
    if (buffer[index] === 0x0a) {
      newlines++
      if (index > 0 && buffer[index - 1] === 0x0d) carriageReturns++
    }
  }
  const unterminated =
    buffer.length > 0 && buffer[buffer.length - 1] !== 0x0a ? 1 : 0
  return {
    bytes: buffer.length - carriageReturns,
    lines: newlines + unterminated,
  }
}

function scopedByPaths(text) {
  const withoutBom = text.startsWith(BOM) ? text.slice(1) : text
  const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(withoutBom)
  if (frontmatter === null) return false
  let data
  try {
    const document = parseDocument(frontmatter[1])
    if (document.errors.length > 0) return false
    data = document.toJS()
  } catch {
    return false
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return false
  }
  const { paths } = data
  return (
    Array.isArray(paths) &&
    paths.length > 0 &&
    paths.every((entry) => typeof entry === "string" && entry.trim() !== "")
  )
}

function kindOf(file) {
  if (ALWAYS_FILES.includes(file)) return "always"
  if (file.startsWith(RULES_FOLDER) && file.endsWith(".md")) return "rule"
  if (/(^|\/)CLAUDE\.md$/.test(file)) return "subfolder"
  return null
}

function withoutInlineCode(paragraph) {
  let kept = ""
  let index = 0
  while (index < paragraph.length) {
    if (paragraph[index] !== "`") {
      kept += paragraph[index++]
      continue
    }
    let opening = 0
    while (paragraph[index + opening] === "`") opening++
    let closing = -1
    let cursor = index + opening
    while (cursor < paragraph.length && closing === -1) {
      if (paragraph[cursor] !== "`") {
        cursor++
        continue
      }
      let run = 0
      while (paragraph[cursor + run] === "`") run++
      if (run === opening) closing = cursor
      cursor += run
    }
    if (closing === -1) {
      kept += paragraph.slice(index, index + opening)
      index += opening
    } else {
      kept += " "
      index = closing + opening
    }
  }
  return kept
}

function withoutCode(text) {
  const kept = []
  let fence = null
  for (const line of text.split("\n")) {
    if (fence !== null) {
      const closing = new RegExp(
        `^ {0,3}${fence.char}{${fence.length},}[ \\t]*$`
      )
      if (closing.test(line)) fence = null
      kept.push("")
      continue
    }
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (
      opening !== null &&
      !(opening[1][0] === "`" && opening[2].includes("`"))
    ) {
      fence = { char: opening[1][0], length: opening[1].length }
      kept.push("")
      continue
    }
    kept.push(line)
  }
  return kept
    .join("\n")
    .split(/\n[ \t]*\n/)
    .map(withoutInlineCode)
    .join("\n\n")
}

function importsOf(file, text, tracked) {
  const targets = []
  for (const match of withoutCode(text).matchAll(
    /(?:^|\s)@((?:[^\s\\]|\\ )+)/g
  )) {
    const requested = match[1].replaceAll("\\ ", " ")
    if (requested.startsWith("/") || requested.startsWith("~")) continue
    const target = path.posix.join(path.posix.dirname(file), requested)
    if (target !== file && tracked.has(target)) targets.push(target)
  }
  return targets
}

function collect(root) {
  const tracked = new Set(trackedFiles(root))
  const loaded = new Map()
  const load = (file) => {
    if (!loaded.has(file)) {
      const buffer = fs.readFileSync(path.join(root, file))
      loaded.set(file, { buffer, ...measure(buffer) })
    }
    return loaded.get(file)
  }
  const textOf = (file) =>
    load(file).buffer.toString("utf8").replaceAll("\r\n", "\n")

  const always = []
  const scoped = new Map()
  for (const file of tracked) {
    const kind = kindOf(file)
    if (kind === null) continue
    const { bytes, lines } = load(file)
    const loadedAtLaunch =
      kind === "always" || (kind === "rule" && !scopedByPaths(textOf(file)))
    if (loadedAtLaunch) always.push({ file, importedBy: null, bytes, lines })
    else scoped.set(file, { file, kind, bytes, lines })
  }

  const launched = new Set(always.map((entry) => entry.file))
  const visited = new Set([...launched, ...scoped.keys()])
  const imported = new Map()
  const queue = [...visited].map((file) => ({ file, hops: 0 }))
  for (const { file, hops } of queue) {
    if (hops >= MAX_HOPS) continue
    for (const target of importsOf(file, textOf(file), tracked)) {
      if (!launched.has(target) && !imported.has(target)) {
        imported.set(target, file)
      }
      if (!visited.has(target)) {
        visited.add(target)
        queue.push({ file: target, hops: hops + 1 })
      }
    }
  }
  for (const [file, importedBy] of imported) {
    const { bytes, lines } = load(file)
    always.push({ file, importedBy, bytes, lines })
  }
  return { always, scoped }
}

function sum(files, key) {
  return files.reduce((total, file) => total + file[key], 0)
}

function listing(files) {
  return [...files]
    .sort((a, b) => b.bytes - a.bytes || (a.file < b.file ? -1 : 1))
    .map((file) => {
      const sizes = `${plural(file.bytes, "byte")}, ${plural(file.lines, "line")}`
      return file.importedBy === null
        ? `${file.file} (${sizes})`
        : `${file.file} (imported by ${file.importedBy}, ${sizes})`
    })
    .join("; ")
}

function staleCeiling(subject, size, ceiling, limit, unit) {
  if (ceiling === undefined || size >= ceiling) return null
  const is = `${subject} is ${plural(size, unit)}`
  if (size > limit) {
    return `${is}, under its ceiling of ${count(ceiling)}: run ${COMMAND} --write to lower the ceiling, ${COMMIT_BUDGET_FILE}`
  }
  const where = size < limit ? "under" : "at"
  return `${is}, ${where} its budget of ${count(limit)}: run ${COMMAND} --write to remove its ceiling, ${COMMIT_BUDGET_FILE}`
}

function evaluateSet(budget, always) {
  const { alwaysLoaded } = budget.ceilings
  const size = { bytes: sum(always, "bytes"), lines: sum(always, "lines") }
  const over = []
  const unceilinged = []
  const stale = []
  const figures = MEASURES.map(({ key, unit }) => {
    const limit = budget.budget.alwaysLoaded[key]
    const ceiling = alwaysLoaded[key]
    const effective = ceiling ?? limit
    if (size[key] > effective) {
      over.push(
        `${plural(size[key], unit)} against a ceiling of ${count(effective)} (budget ${count(limit)}), over by ${count(size[key] - effective)}`
      )
      if (ceiling === undefined) unceilinged.push(`${unit}s`)
    }
    const lowered = staleCeiling(
      "The always-loaded context",
      size[key],
      ceiling,
      limit,
      unit
    )
    if (lowered !== null) stale.push(lowered)
    return ceiling === undefined
      ? `${plural(size[key], unit)} (budget ${count(limit)})`
      : `${plural(size[key], unit)} (ceiling ${count(ceiling)}, budget ${count(limit)})`
  })
  const failures = []
  if (over.length > 0) {
    const missing =
      unceilinged.length === 0
        ? ""
        : ` The always-loaded context has no ceiling for its ${unceilinged.join(" and its ")}, so it has to go back under its budget: --write adds none.`
    failures.push(
      `The always-loaded context is over its ceiling: ${over.join("; ")}. Claude Code loads these files into every session and every sub-agent: ${listing(always)}. ${SET_ADVICE}${missing}`
    )
  }
  return { size, figures, failures: [...failures, ...stale], over: over.length }
}

function evaluateScoped(budget, scoped) {
  const limit = budget.budget.scopedRule.bytes
  const lines = []
  const failures = []
  let over = 0
  const names = new Set([
    ...scoped.keys(),
    ...Object.keys(budget.ceilings.scoped),
  ])
  for (const file of [...names].sort()) {
    const found = scoped.get(file)
    const ceiling = budget.ceilings.scoped[file]
    if (found === undefined) {
      failures.push(
        `${file} has a ceiling of ${count(ceiling)}, but the file is gone or is no longer scoped: run ${COMMAND} --write to remove its ceiling, ${COMMIT_BUDGET_FILE}`
      )
      continue
    }
    const effective = ceiling ?? limit
    if (found.bytes > effective) {
      over++
      const none =
        ceiling === undefined
          ? ` ${file} has no ceiling, so it has to go back under its budget: --write adds none.`
          : ""
      const what =
        found.kind === "rule"
          ? "a rule scoped by paths:"
          : "a CLAUDE.md of a subfolder"
      const loads =
        found.kind === "rule"
          ? "A scoped rule loads whole each time its paths match."
          : "A CLAUDE.md of a subfolder loads whole each time Claude works under its folder."
      failures.push(
        `${file} is ${what} of ${plural(found.bytes, "byte")} against a ceiling of ${count(effective)} (budget ${count(limit)}), over by ${count(found.bytes - effective)}. ${loads} ${RULE_ADVICE}${none}`
      )
    }
    const lowered = staleCeiling(file, found.bytes, ceiling, limit, "byte")
    if (lowered !== null) failures.push(lowered)
    if (ceiling !== undefined) {
      lines.push(
        `${file}: ${plural(found.bytes, "byte")} (ceiling ${count(ceiling)}, budget ${count(limit)})`
      )
    }
  }
  return { lines, failures, over }
}

function evaluate(budget, collected) {
  const set = evaluateSet(budget, collected.always)
  const scoped = evaluateScoped(budget, collected.scoped)
  const withinEverywhere =
    set.over === 0 &&
    scoped.over === 0 &&
    Object.keys(budget.ceilings.alwaysLoaded).length === 0 &&
    Object.keys(budget.ceilings.scoped).length === 0
  const header = withinEverywhere
    ? `Always-loaded: ${plural(set.size.bytes, "byte")}, ${plural(set.size.lines, "line")}, within budget; every scoped rule within ${plural(budget.budget.scopedRule.bytes, "byte")}.`
    : `Always-loaded: ${set.figures.join(", ")}`
  return {
    lines: [header, ...scoped.lines],
    failures: [...set.failures, ...scoped.failures],
  }
}

function lowered(size, ceiling, limit) {
  if (size <= limit) return { remove: true }
  if (size < ceiling) return { value: size }
  return null
}

function lowerCeilings(budget, collected) {
  const changes = []
  const alwaysLoaded = { ...budget.ceilings.alwaysLoaded }
  for (const { key, unit } of MEASURES) {
    const ceiling = alwaysLoaded[key]
    if (ceiling === undefined) continue
    const size = sum(collected.always, key)
    const limit = budget.budget.alwaysLoaded[key]
    const change = lowered(size, ceiling, limit)
    if (change === null) continue
    if (change.remove) {
      delete alwaysLoaded[key]
      changes.push(
        `Removed the ceiling of the always-loaded ${unit}s (now ${count(size)}, within the budget of ${count(limit)}).`
      )
    } else {
      alwaysLoaded[key] = change.value
      changes.push(
        `Lowered the ceiling of the always-loaded ${unit}s from ${count(ceiling)} to ${count(change.value)}.`
      )
    }
  }
  const scoped = {}
  const limit = budget.budget.scopedRule.bytes
  for (const [file, ceiling] of Object.entries(budget.ceilings.scoped)) {
    const found = collected.scoped.get(file)
    if (found === undefined) {
      changes.push(
        `Removed the ceiling of ${file} (the file is gone or is no longer scoped).`
      )
      continue
    }
    const change = lowered(found.bytes, ceiling, limit)
    if (change === null) scoped[file] = ceiling
    else if (change.remove) {
      changes.push(
        `Removed the ceiling of ${file} (now ${count(found.bytes)}, within the budget of ${count(limit)}).`
      )
    } else {
      scoped[file] = change.value
      changes.push(
        `Lowered the ceiling of ${file} from ${count(ceiling)} to ${count(change.value)}.`
      )
    }
  }
  const sorted = Object.fromEntries(
    Object.entries(scoped).sort(([a], [b]) => (a < b ? -1 : 1))
  )
  return {
    changes,
    budget: { ...budget, ceilings: { alwaysLoaded, scoped: sorted } },
  }
}

function main(argv) {
  const args = argv.slice(2)
  const unknown = args.filter((arg) => arg !== "--write")
  if (unknown.length > 0) {
    console.error(`unknown argument ${unknown[0]}; usage: ${COMMAND} [--write]`)
    process.exitCode = 2
    return
  }
  let root
  let budget
  try {
    root = repositoryRoot(process.cwd())
    budget = readBudgetFile(root)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
    return
  }
  const collected = collect(root)
  const preamble = []
  if (args.includes("--write")) {
    const lowered = lowerCeilings(budget, collected)
    budget = lowered.budget
    if (lowered.changes.length === 0) {
      preamble.push("No ceiling to lower or remove.")
    } else {
      fs.writeFileSync(
        path.join(root, BUDGET_FILE),
        `${JSON.stringify(budget, null, 2)}\n`
      )
      preamble.push(...lowered.changes)
    }
  }
  const { lines, failures } = evaluate(budget, collected)
  console.log([...preamble, ...lines].join("\n"))
  if (failures.length > 0) {
    console.log(`\n${failures.join("\n\n")}`)
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv)
}
