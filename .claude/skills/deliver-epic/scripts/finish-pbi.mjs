import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { releaseSlots, slotsDir } from './slots.mjs'

const USAGE = [
  'usage: node .claude/skills/deliver-epic/scripts/finish-pbi.mjs <ticket> <pr> <worktree> <branch>',
  '  checks that the pull request is merged and the ticket closed, removes the PBI worktree and its branches once merged,',
  "  frees the ticket's slots, and prints a line per step; exits 1 when a line begins refused:, failed: or kept:",
].join('\n')

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd()
}

function succeeds(cwd, ...args) {
  return spawnSync('git', args, { cwd, stdio: 'ignore' }).status === 0
}

function reasonOf(error) {
  return (String(error.stderr ?? '').trim() || String(error.message)).split(/\r?\n/)[0]
}

function canonical(target) {
  try {
    return fs.realpathSync.native(target)
  } catch {
    return path.resolve(target)
  }
}

function samePath(first, second) {
  return path.relative(canonical(first), canonical(second)) === ''
}

function contains(parent, child) {
  const relative = path.relative(canonical(parent), canonical(child))
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

function branchExists(repository, name) {
  return succeeds(repository, 'show-ref', '--verify', '--quiet', `refs/heads/${name}`)
}

function retireBranch(repository, name, base) {
  if (!succeeds(repository, 'merge-base', '--is-ancestor', `refs/heads/${name}`, `refs/remotes/origin/${base}`)) {
    return { done: false, line: `kept: branch ${name} is not an ancestor of origin/${base}` }
  }
  git(repository, 'branch', '-D', name)
  return { done: true, line: `branch ${name}: deleted, an ancestor of origin/${base}` }
}

function worktreeEntries(repository) {
  return git(repository, 'worktree', 'list', '--porcelain')
    .split(/\r?\n\r?\n/)
    .map(block => block.split(/\r?\n/))
    .map(rows => ({
      path: rows[0].slice('worktree '.length),
      locked: rows.some(row => row.startsWith('locked')),
      branch: rows.find(row => row.startsWith('branch refs/heads/'))?.slice('branch refs/heads/'.length),
    }))
}

function repositoryOf(cwd) {
  return path.dirname(git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'))
}

export function githubForge(run = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) {
  const read = args => JSON.parse(run(args))
  return {
    pullRequest: number => read(['pr', 'view', String(number), '--json', 'state,baseRefName']),
    issue: number => read(['issue', 'view', String(number), '--json', 'state']),
    defaultBranch: () => read(['repo', 'view', '--json', 'defaultBranchRef']).defaultBranchRef.name,
  }
}

export function finishPbi({ repository, ticket, pr, worktree, branch, forge, cwd = process.cwd() }) {
  const lines = []
  const refuse = message => {
    lines.push(`refused: ${message}`)
    return { ok: false, lines }
  }
  try {
    const worktrees = path.join(repository, '.claude', 'worktrees')
    if (!contains(worktrees, worktree) || samePath(worktrees, worktree)) {
      return refuse("the worktree is not under the repository's .claude/worktrees/")
    }
    if (contains(worktree, cwd)) return refuse(`run this from outside the worktree, which would stay in use: ${cwd}`)
    const base = forge.defaultBranch()
    const pullRequest = forge.pullRequest(pr)
    if (pullRequest.state !== 'MERGED') return refuse(`pull request #${pr} is ${pullRequest.state}, not MERGED`)
    if (pullRequest.baseRefName !== base) {
      return refuse(`pull request #${pr} merged into ${pullRequest.baseRefName}, not into the default branch ${base}`)
    }
    lines.push(`pull request #${pr}: merged into ${base}`)
    const issue = forge.issue(ticket)
    if (issue.state !== 'CLOSED') return refuse(`ticket #${ticket} is ${issue.state}, not CLOSED`)
    lines.push(`ticket #${ticket}: closed`)
    if (branch === base) return refuse(`branch ${branch} is the branch the pull request merged into`)
    git(repository, 'fetch', '--prune', 'origin')
    const entry = worktreeEntries(repository).find(candidate => samePath(candidate.path, worktree))
    const present = fs.existsSync(worktree)
    if (!entry && present) return refuse(`${worktree} is not a worktree of this repository`)
    if (entry?.branch !== undefined && entry.branch !== branch) {
      return refuse(`the worktree has ${entry.branch} checked out, not ${branch}`)
    }
    if (entry && present) {
      if (!samePath(git(worktree, 'rev-parse', '--show-toplevel'), worktree)) {
        return refuse(`${worktree} is not a working tree git can read`)
      }
      const changes = git(worktree, 'status', '--porcelain')
      if (changes) return refuse(`the worktree is not clean: ${changes.split(/\r?\n/).join('; ')}`)
      lines.push('worktree: clean')
    }
    if (entry?.locked) {
      git(repository, 'worktree', 'unlock', worktree)
      lines.push('worktree: unlocked')
    }
    if (present) fs.rmSync(worktree, { recursive: true, force: true })
    lines.push(present ? 'worktree: removed' : 'worktree: already removed')
    git(repository, 'worktree', 'prune')
    lines.push('worktree: pruned')
    const released = releaseSlots(slotsDir(repository), String(ticket))
    lines.push(released.length ? `slots: released ${released.join(', ')} for ${ticket}` : `slots: ${ticket} held none`)
    let ok = true
    const harnessBranch = `worktree-${path.basename(worktree)}`
    if (harnessBranch !== branch && branchExists(repository, harnessBranch)) {
      const retired = retireBranch(repository, harnessBranch, base)
      lines.push(retired.line)
      ok = retired.done
    }
    if (!branchExists(repository, branch)) {
      lines.push(`branch ${branch}: already gone`)
      return { ok, lines }
    }
    const retired = retireBranch(repository, branch, base)
    lines.push(retired.line)
    return { ok: ok && retired.done, lines }
  } catch (error) {
    lines.push(`failed: ${reasonOf(error)}`)
    return { ok: false, lines }
  }
}

function main(args) {
  const [ticket, pr, worktree, branch, ...extra] = args
  if (!/^\d+$/.test(ticket ?? '') || !/^\d+$/.test(pr ?? '') || !worktree || !branch || extra.length) {
    console.error(USAGE)
    return 2
  }
  const { ok, lines } = finishPbi({
    repository: repositoryOf(process.cwd()),
    ticket,
    pr,
    worktree: path.resolve(worktree),
    branch,
    forge: githubForge(),
  })
  console.log(lines.join('\n'))
  return ok ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
