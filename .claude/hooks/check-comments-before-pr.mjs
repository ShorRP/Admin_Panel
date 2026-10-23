import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(new URL('../../scripts/check-comments.mjs', import.meta.url))
const CREATE_PR = /\bgh\s+pr\s+create\b/

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }))
}

let input = ''
for await (const chunk of process.stdin) input += chunk
try {
  const { cwd, tool_input: toolInput } = JSON.parse(input)
  if (CREATE_PR.test(String(toolInput?.command ?? ''))) {
    const check = spawnSync(process.execPath, [SCRIPT], { cwd: cwd || process.cwd(), encoding: 'utf8' })
    if (check.status === 1 && check.stdout) {
      deny(`The repository holds no comments (CLAUDE.md, No comments). Remove these, commit, push, then create the PR again:\n${check.stdout}`)
    } else if (check.status !== 0) {
      deny(`scripts/check-comments.mjs could not run, so the PR waits (run pnpm install first): ${check.stderr || check.error?.message}`)
    }
  }
} catch (error) {
  deny(`The comment check could not read this call (${error.message}), so it refuses it.`)
}
