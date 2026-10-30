import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parse } from "@babel/parser"
import { parseAllDocuments, Parser } from "yaml"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

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
const SHELL_BREAKS = /[\s;&|()<>]/
const DOTENV_VALUE_OPENER =
  /[ \t]*(?:export[ \t]+)?[\w.-]+(?:[ \t]*=[ \t]*|:[ \t]+)(["'`])/y
const DOTENV_VALUE_TAIL = /[ \t]*(?:#[^\r\n]*)?\r?(?:\n|$)/y
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

function hashComments(text) {
  const found = []
  let offset = 0
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "")
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

function lineEnd(text, from) {
  const newline = text.indexOf("\n", from)
  const end = newline === -1 ? text.length : newline
  return text[end - 1] === "\r" ? end - 1 : end
}

function neverClosed(text, at, what) {
  const line = text.slice(0, at).split("\n").length
  return new Error(`the ${what} opened on line ${line} is never closed`)
}

function quotedEnd(
  text,
  quoteAt,
  { escapes, delimiter = text[quoteAt], oneLine = false }
) {
  for (let i = quoteAt + delimiter.length; i < text.length; i++) {
    if (oneLine && text[i] === "\n") break
    if (escapes && text[i] === "\\" && text[i + 1] !== "\n") i++
    else if (text.startsWith(delimiter, i)) return i + delimiter.length
  }
  throw neverClosed(text, quoteAt, `${text[quoteAt]} quote`)
}

function arithmeticEnd(text, at) {
  let depth = 0
  for (let i = at; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")" && --depth === 0)
      return text[i - 1] === ")" ? i + 1 : null
  }
  return null
}

function heredocAt(text, at) {
  let i = at + 2
  const strip = text[i] === "-"
  if (strip) i++
  while (text[i] === " " || text[i] === "\t") i++
  let delimiter = ""
  while (i < text.length && !SHELL_BREAKS.test(text[i])) {
    if (text[i] === "'" || text[i] === '"') {
      const end = quotedEnd(text, i, { escapes: text[i] === '"' })
      delimiter += text.slice(i + 1, end - 1)
      i = end
    } else if (text[i] === "\\") {
      delimiter += text[i + 1] ?? ""
      i += 2
    } else delimiter += text[i++]
  }
  return delimiter ? { delimiter, strip, at, end: i } : null
}

function heredocBodyEnd(text, from, { delimiter, strip, at }) {
  let i = from
  while (i < text.length) {
    const newline = text.indexOf("\n", i)
    const next = newline === -1 ? text.length : newline + 1
    const line = text.slice(i, lineEnd(text, i))
    if ((strip ? line.replace(/^\t+/, "") : line) === delimiter) return next
    i = next
  }
  throw neverClosed(text, at, "here-document")
}

function shellComments(text) {
  const found = []
  let i = text.startsWith("#!") ? lineEnd(text, 0) : 0

  function substitution() {
    const start = i
    if (text[i + 2] === "(") {
      const end = arithmeticEnd(text, i + 1)
      if (end !== null) {
        i = end
        return
      }
    }
    i += 2
    commands(")", start)
  }

  function doubleQuoted() {
    const start = i++
    while (i < text.length) {
      const char = text[i]
      if (char === "\\") i += 2
      else if (char === '"') {
        i++
        return
      } else if (char === "$" && text[i + 1] === "(") substitution()
      else if (char === "`") {
        i++
        commands("`", i - 1)
      } else i++
    }
    throw neverClosed(text, start, '" quote')
  }

  function commands(closer, start) {
    const heredocs = []
    let depth = 0
    let closed = false
    while (!closed && i < text.length) {
      const char = text[i]
      if (char === "\\") i += 2
      else if (char === "'") i = quotedEnd(text, i, { escapes: false })
      else if (char === '"') doubleQuoted()
      else if (char === "$" && text[i + 1] === "'")
        i = quotedEnd(text, i + 1, { escapes: true })
      else if (char === "$" && text[i + 1] === "(") substitution()
      else if (char === "`") {
        i++
        if (closer === "`") closed = true
        else commands("`", i - 1)
      } else if (char === "(") {
        const end = text[i + 1] === "(" ? arithmeticEnd(text, i) : null
        if (end === null) depth++
        i = end ?? i + 1
      } else if (char === ")") {
        if (closer === ")" && depth === 0) closed = true
        else depth = Math.max(0, depth - 1)
        i++
      } else if (char === "<" && text[i + 1] === "<") {
        if (text[i + 2] === "<") i += 3
        else {
          const heredoc = heredocAt(text, i)
          if (heredoc) heredocs.push(heredoc)
          i = heredoc ? heredoc.end : i + 2
        }
      } else if (char === "\n") {
        i++
        for (const heredoc of heredocs.splice(0))
          i = heredocBodyEnd(text, i, heredoc)
      } else if (char === "#" && (i === 0 || SHELL_BREAKS.test(text[i - 1]))) {
        const end = lineEnd(text, i)
        found.push({ start: i, end })
        i = end
      } else i++
    }
    if (closer && !closed)
      throw neverClosed(text, start, closer === ")" ? "$(" : closer)
    if (heredocs.length)
      throw neverClosed(text, heredocs[0].at, "here-document")
  }

  commands(null, 0)
  return found
}

function tomlComments(text) {
  const found = []
  let i = 0
  while (i < text.length) {
    const char = text[i]
    if (char === "#") {
      const end = lineEnd(text, i)
      found.push({ start: i, end })
      i = end
    } else if (char === '"' || char === "'") {
      const delimiter = text.startsWith(char.repeat(3), i)
        ? char.repeat(3)
        : char
      const oneLine = delimiter === char
      i = quotedEnd(text, i, { escapes: char === '"', delimiter, oneLine })
      while (!oneLine && text[i] === char) i++
    } else i++
  }
  return found
}

function dotenvValueEnd(text, lineStart) {
  DOTENV_VALUE_OPENER.lastIndex = lineStart
  const opener = DOTENV_VALUE_OPENER.exec(text)
  if (!opener) return null
  const quote = opener[1]
  const closings = []
  const escaped = []
  for (let i = lineStart + opener[0].length; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === quote) escaped.unshift(++i)
    else if (text[i] === quote) {
      closings.push(i)
      break
    }
  }
  for (const closing of [...closings, ...escaped]) {
    DOTENV_VALUE_TAIL.lastIndex = closing + 1
    if (DOTENV_VALUE_TAIL.test(text)) return closing + 1
  }
  return null
}

function dotenvComments(text) {
  const found = []
  let lineStart = 0
  while (lineStart < text.length) {
    const valueEnd = dotenvValueEnd(text, lineStart)
    const from = valueEnd ?? lineStart
    const stop = lineEnd(text, from)
    for (let i = from; i < stop; i++) {
      if (
        text[i] === "#" &&
        (valueEnd !== null || i === 0 || /\s/.test(text[i - 1]))
      ) {
        found.push({ start: i, end: stop })
        break
      }
    }
    lineStart = stop + (text[stop] === "\r" ? 2 : 1)
  }
  return found
}

function hashFileComments(text, file) {
  const extension = path.extname(file).toLowerCase()
  if (extension === ".sh") return shellComments(text)
  if (extension === ".toml") return tomlComments(text)
  if (path.basename(file).startsWith(".env")) return dotenvComments(text)
  return hashComments(text)
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
      return hashComments(maskFlowYamlScalars(text))
    case "hash":
      return hashFileComments(text, file)
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

export function checkRepository(root = ROOT) {
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
  const problems = checkRepository()
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
