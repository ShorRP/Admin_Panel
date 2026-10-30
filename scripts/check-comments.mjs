import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parse } from "@babel/parser"
import { parseAllDocuments, Parser } from "yaml"

const SCRIPT_PLUGINS = {
  ".js": ["jsx"],
  ".mjs": ["jsx"],
  ".cjs": ["jsx"],
  ".jsx": ["jsx"],
  ".ts": ["typescript"],
  ".mts": ["typescript"],
  ".cts": ["typescript"],
  ".tsx": ["typescript", "jsx"],
}

const DIRECTIVES = [
  /^\/\s*<reference\s/,
  /^\s*eslint-(?:disable|enable)(?:-next-line|-line)?(?:\s|$)/,
  /^\s*@ts-expect-error(?:\s|$)/,
  /^\s*@vite-ignore\s*$/,
  /^\s*webpackIgnore:\s*true\s*$/,
]

const HASH_EXTENSIONS = new Set([".toml", ".sh"])
const HASH_FILES = new Set([
  ".gitignore",
  ".gitattributes",
  ".prettierignore",
  ".git-blame-ignore-revs",
  ".npmrc",
  ".editorconfig",
  "Dockerfile",
])
const SKIPPED_FILES = new Set(["pnpm-lock.yaml"])
const FLOW_YAML_SCALARS = new Set([
  "scalar",
  "single-quoted-scalar",
  "double-quoted-scalar",
])

export function familyOf(file) {
  const base = path.basename(file)
  const extension = path.extname(file).toLowerCase()
  if (SKIPPED_FILES.has(base)) return null
  if (SCRIPT_PLUGINS[extension]) return "script"
  if (extension === ".json") return "json"
  if (extension === ".css" || extension === ".scss") return "css"
  if ([".html", ".htm", ".svg", ".xml"].includes(extension)) return "markup"
  if (extension === ".sql") return "sql"
  if (extension === ".yml" || extension === ".yaml") return "yaml"
  if (
    HASH_EXTENSIONS.has(extension) ||
    HASH_FILES.has(base) ||
    base.startsWith(".env")
  )
    return "hash"
  return null
}

function scriptComments(text, extension, offset = 0) {
  const ast = parse(text, {
    sourceType: "unambiguous",
    plugins: SCRIPT_PLUGINS[extension],
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
  })
  return ast.comments
    .filter(
      (comment) =>
        !DIRECTIVES.some((directive) => directive.test(comment.value))
    )
    .map((comment) => ({
      start: comment.start - offset,
      end: comment.end - offset,
    }))
}

function closingQuote(text, start) {
  const quote = text[start]
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") i++
    else if (text[i] === quote || text[i] === "\n") return i
  }
  return text.length
}

function delimitedComments(text, { line = [], block = [], quotes = [] }) {
  const found = []
  let i = 0
  while (i < text.length) {
    if (quotes.includes(text[i])) {
      i = closingQuote(text, i) + 1
      continue
    }
    const opener = block.find(([open]) => text.startsWith(open, i))
    if (opener) {
      const close = text.indexOf(opener[1], i + opener[0].length)
      const end = close === -1 ? text.length : close + opener[1].length
      found.push({ start: i, end })
      i = end
      continue
    }
    if (line.some((marker) => text.startsWith(marker, i))) {
      const newline = text.indexOf("\n", i)
      const end = newline === -1 ? text.length : newline
      found.push({ start: i, end })
      i = end
      continue
    }
    i++
  }
  return found
}

function flowYamlScalars(node) {
  if (Array.isArray(node)) return node.flatMap(flowYamlScalars)
  if (!node || typeof node !== "object") return []
  if (FLOW_YAML_SCALARS.has(node.type)) return [node]
  return Object.values(node).flatMap(flowYamlScalars)
}

function maskFlowYamlScalars(text) {
  const [error] = parseAllDocuments(text, { uniqueKeys: false }).flatMap(
    (document) => document.errors
  )
  if (error) throw error
  let masked = text
  for (const scalar of flowYamlScalars([...new Parser().parse(text)])) {
    const end = scalar.offset + scalar.source.length
    masked =
      masked.slice(0, scalar.offset) +
      scalar.source.replace(/[^\r\n]/g, "x") +
      masked.slice(end)
  }
  return masked
}

function hashComments(text, { allowShebang }) {
  const found = []
  let offset = 0
  for (const rawLine of text.split("\n")) {
    const isShebang = allowShebang && offset === 0 && rawLine.startsWith("#!")
    const line = isShebang ? "" : rawLine.replace(/\r$/, "")
    let quote = null
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (quote) {
        if (char === "\\" && quote === '"') i++
        else if (char === quote) quote = null
        continue
      }
      const opensValue = i === 0 || /[\s:[{,=(]/.test(line[i - 1])
      if ((char === '"' || char === "'") && opensValue) {
        quote = char
        continue
      }
      if (char === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
        found.push({ start: offset + i, end: offset + line.length })
        break
      }
    }
    offset += rawLine.length + 1
  }
  return found
}

export function findComments(text, file) {
  const family = familyOf(file)
  const extension = path.extname(file).toLowerCase()
  switch (family) {
    case "script":
      return scriptComments(text, extension)
    case "json":
      return scriptComments(`(${text}\n)`, ".js", 1)
    case "css":
      return delimitedComments(text, {
        block: [["/*", "*/"]],
        quotes: ['"', "'"],
      })
    case "markup":
      return delimitedComments(text, { block: [["<!--", "-->"]] })
    case "sql":
      return delimitedComments(text, {
        line: ["--"],
        block: [["/*", "*/"]],
        quotes: ["'", '"'],
      })
    case "yaml":
      return hashComments(maskFlowYamlScalars(text), { allowShebang: false })
    case "hash":
      return hashComments(text, { allowShebang: extension === ".sh" })
    default:
      return []
  }
}

function position(text, offset) {
  const before = text.slice(0, offset).split("\n")
  return { line: before.length, column: before.at(-1).length + 1 }
}

export function checkFile(text, file) {
  try {
    return findComments(text, file).map((range) => {
      const { line, column } = position(text, range.start)
      const snippet = text
        .slice(range.start, range.end)
        .split("\n")[0]
        .trim()
        .slice(0, 80)
      return `${file}:${line}:${column} ${snippet}`
    })
  } catch (error) {
    return [
      `${file}: cannot be parsed, so its comments cannot be checked (${error.message.split("\n")[0]})`,
    ]
  }
}

function repositoryFiles(root) {
  const output = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" }
  )
  return [...new Set(output.split("\0").filter(Boolean))].filter((file) =>
    fs.existsSync(path.join(root, file))
  )
}

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

export function checkRepository(root) {
  return repositoryFiles(root)
    .filter((file) => familyOf(file))
    .flatMap((file) =>
      checkFile(
        fs.readFileSync(path.join(root, file), "utf8"),
        file.replaceAll("\\", "/")
      )
    )
}

function main() {
  let root
  try {
    root = repositoryRoot(process.cwd())
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
    return
  }
  const problems = checkRepository(root)
  if (!problems.length) return
  console.log(problems.join("\n"))
  console.log(
    `\n${problems.length} comment(s) found. This repository holds none: move the why to the commit message, an ADR, GLOSSARY.md or a test name.`
  )
  process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main()
}
