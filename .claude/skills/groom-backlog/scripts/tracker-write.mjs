import { pathToFileURL } from 'node:url'

const WRITE_COMMANDS = [
  /\bgh\s+issue\s+(create|edit|close|reopen|delete|transfer|develop)\b/,
  /\bgh\s+pr\s+(create|merge|close|reopen|edit|ready)\b/,
  /\bgh\s+project\s+item-(add|create|edit|archive|delete)\b/,
]

const HEREDOC = /(?<!<)<<(?!<)(-?)[ \t]*(?:'([^'\n]*)'|"([^"\n]*)"|\\?([^\s;&|<>()'"]+))/g

function splitHeredocs(command) {
  const lines = command.split(/\r?\n/)
  const script = []
  const bodies = []
  for (let i = 0; i < lines.length; i++) {
    script.push(lines[i])
    for (const [, dash, single, double, bare] of lines[i].matchAll(HEREDOC)) {
      const word = single ?? double ?? bare
      const end = lines.findIndex((line, j) => j > i && (dash ? line.replace(/^\t+/, '') : line) === word)
      if (end === -1) continue
      bodies.push(...lines.slice(i + 1, end))
      i = end
    }
  }
  return { script: script.join('\n'), bodies: bodies.join('\n') }
}

const HERE_STRING = /(?<=^|[\s(=,])@(['"])[ \t]*$/

function splitHereStrings(command) {
  const lines = command.split(/\r?\n/)
  const script = []
  const bodies = []
  for (let i = 0; i < lines.length; i++) {
    script.push(lines[i])
    const quote = lines[i].match(HERE_STRING)?.[1]
    if (!quote) continue
    const end = lines.findIndex((line, j) => j > i && line.startsWith(`${quote}@`))
    if (end === -1) continue
    bodies.push(...lines.slice(i + 1, end))
    lines[end] = lines[end].slice(2)
    i = end - 1
  }
  return { script: script.join('\n'), bodies: bodies.join('\n') }
}

function splitQuotedBodies(command, toolName) {
  return toolName === 'PowerShell' ? splitHereStrings(command) : splitHeredocs(command)
}

function isApiWrite(script, bodies) {
  const api = script.slice(script.search(/\bgh\s+api\b/))
  if (/\bgraphql\b/.test(api)) return /\bmutation\b/.test(`${api}\n${bodies}`)
  const method = api.match(/(?:-X|--method)[\s=]+([A-Za-z]+)/)
  if (method) return method[1].toUpperCase() !== 'GET'
  return /\s(-f|-F|--field|--raw-field|--input)[\s=]/.test(api)
}

export function isTrackerWrite(command, toolName) {
  const { script, bodies } = splitQuotedBodies(command, toolName)
  if (/groom-backlog[\\/]scripts[\\/]backlog\.mjs/.test(script)) return false
  if (WRITE_COMMANDS.some(pattern => pattern.test(script))) return true
  return /\bgh\s+api\b/.test(script) && isApiWrite(script, bodies)
}

export function touchedIssues(command, toolName) {
  const { script } = splitQuotedBodies(command, toolName)
  const numbers = new Set()
  for (const match of script.matchAll(/\bgh\s+(?:issue|pr)\s+[a-z-]+\s+#?(\d+)\b/g)) numbers.add(Number(match[1]))
  for (const match of script.matchAll(/\/issues\/(\d+)\b/g)) numbers.add(Number(match[1]))
  return [...numbers]
}

function reminder(command, toolName) {
  const touched = touchedIssues(command, toolName).map(n => `#${n}`).join(', ')
  return [
    `The GitHub tracker just changed${touched ? ` (${touched})` : ''}.`,
    'Once this burst of tracker changes is over, before your final report,',
    'run the groom-backlog skill so labels, Status, priority, epics and order follow docs/agents/issue-tracker.md.',
  ].join(' ')
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const payload = JSON.parse(input)
  const command = payload?.tool_input?.command
  const toolName = payload?.tool_name
  if (typeof command !== 'string' || !isTrackerWrite(command, toolName)) return
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reminder(command, toolName) },
  }))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(() => {})
}
