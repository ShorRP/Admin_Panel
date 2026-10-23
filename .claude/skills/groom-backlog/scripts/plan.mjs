export const STATE_LABELS = ['needs-triage', 'needs-info', 'ready-for-agent', 'ready-for-human', 'wontfix']
export const EPIC_LABEL = 'epic'
export const PRIORITIES = ['P0', 'P1', 'P2']
export const WAITING_ON = 'Waiting on'
export const SIZE = 'Size'
const DAY_MS = 24 * 60 * 60 * 1000
const CONVENTION_KEYS = ['typeLabels', 'milestones', 'closingCommentSince', 'staleDays']

export const isEpic = issue => issue.labels.includes(EPIC_LABEL) || issue.subIssues.length > 0

function firstLine(body) {
  return (body ?? '').split('\n').map(line => line.trim()).find(line => line !== '') ?? ''
}

export function externalBlocker(body) {
  const line = firstLine((body ?? '').replace(/^\s*Part of #\d+[ \t]*(\r?\n|$)/, '')).replace(/^[>*_\s]+/, '')
  const match = line.match(/^Bloqué\s*:\s*(.+)$/i)
  if (!match) return null
  return match[1].split(/\*\*|\.\s/)[0].replace(/[.\s]+$/, '')
}

const isClosingComment = body => /^\s*(?:Livré par #\d+|## Résolution\b)/.test(body)
const isWayfinder = issue => issue.labels.some(label => label.startsWith('wayfinder:'))
const isResolution = body => /^\s*## (?:Décisions|Réponse|Résolution)\b/.test(body)
const hasRecord = issue => issue.comments.some(body => isClosingComment(body) || (isWayfinder(issue) && isResolution(body)))

export function waitingReasons(issue) {
  const reasons = []
  if (issue.labels.includes('needs-triage')) reasons.push({ why: 'needs-triage', text: 'mainteneur : triage' })
  if (issue.labels.includes('needs-info')) reasons.push({ why: 'needs-info', text: null })
  const blockers = issue.blockedBy.filter(b => b.state === 'OPEN').map(b => `#${b.number}`)
  if (blockers.length) reasons.push({ why: `blocked by ${blockers.join(', ')}`, text: blockers.join(', ') })
  const external = externalBlocker(issue.body)
  if (external) reasons.push({ why: 'blocked outside the tracker', text: external })
  return reasons
}

export function desiredStatus(issue, lookup) {
  if (issue.state === 'CLOSED') return 'Done'
  if (isEpic(issue)) return epicStatus(issue, lookup)
  if (waitingReasons(issue).length) return 'Blocked'
  if (issue.assignees.length || issue.linkedOpenPullRequests.length) return 'In progress'
  return 'Todo'
}

const editedSince = (issue, time) => Boolean(time && issue.lastEditedAt && new Date(issue.lastEditedAt) > new Date(time))

const firstUncheckedItem = body => (body ?? '').match(/^[ \t>]*(?:[-*+]|\d+[.)])[ \t]+\[ \](.*)$/m)?.[1].trim() ?? null
const hasUncheckedBox = body => firstUncheckedItem(body) !== null

function epicStatus(epic, lookup) {
  const children = epic.subIssues
  if (!children.length) return 'Todo'
  if (children.every(child => child.state === 'CLOSED')) return hasUncheckedBox(epic.body) ? 'In progress' : 'Done'
  const statuses = children
    .filter(child => child.state === 'OPEN')
    .map(child => lookup(child.number))
    .filter(Boolean)
    .map(child => desiredStatus(child, lookup))
  if (children.some(child => child.state === 'CLOSED') || statuses.includes('In progress')) return 'In progress'
  if (statuses.length && statuses.every(status => status === 'Blocked')) return 'Blocked'
  return 'Todo'
}

function statusWhy(issue, status) {
  if (isEpic(issue)) return 'derived from its sub-issues and checklist'
  if (status === 'Blocked') return waitingReasons(issue).map(reason => reason.why).join('; ')
  if (status === 'In progress') return issue.assignees.length ? 'assigned' : 'an open PR closes it'
  return 'nothing blocks it and nobody works on it'
}

function desiredWaitingOn(issue, status, current) {
  if (status !== 'Blocked') return { value: null }
  if (isEpic(issue)) return { value: 'tous les sous-tickets sont bloqués' }
  const reasons = waitingReasons(issue)
  if (reasons.some(reason => reason.text === null)) return current ? { value: current } : { judgment: true }
  return { value: reasons.map(reason => reason.text).join(' ; ') }
}

const rankIn = list => value => (list.includes(value) ? list.indexOf(value) : list.length)
const priorityRank = rankIn(PRIORITIES)
const earliestIn = (list, values) => {
  const ranks = values.map(rankIn(list)).filter(position => position < list.length)
  return ranks.length ? list[Math.min(...ranks)] : null
}

export function orderMoves(current, desired) {
  const positions = desired.map(id => current.indexOf(id))
  const tails = []
  const tailIndex = []
  const previous = []
  positions.forEach((position, i) => {
    let low = 0
    let high = tails.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (tails[middle] < position) low = middle + 1
      else high = middle
    }
    tails[low] = position
    tailIndex[low] = i
    previous[i] = low > 0 ? tailIndex[low - 1] : -1
  })
  const stays = new Set()
  for (let i = tailIndex[tails.length - 1] ?? -1; i !== -1; i = previous[i]) stays.add(i)
  return desired.flatMap((id, i) => (stays.has(i) ? [] : [{ id, after: i === 0 ? null : desired[i - 1] }]))
}

const byMilestoneThenPriority = (milestones, milestoneOf, priorityOf) => {
  const milestoneRank = rankIn(milestones)
  return (a, b) => milestoneRank(milestoneOf(a)) - milestoneRank(milestoneOf(b)) || priorityRank(priorityOf(a)) - priorityRank(priorityOf(b))
}

export function checkConventions(conventions) {
  const missing = CONVENTION_KEYS.filter(key => conventions?.[key] === undefined)
  if (missing.length) throw new Error(`conventions lack ${missing.join(', ')}: see config.json`)
  return conventions
}

export function withPartOf(body, parent) {
  const rest = (body ?? '')
    .replace(/^Part of #\d+[ \t]*\r?(\n|$)/gm, '')
    .replace(/^(?:[ \t]*\r?\n)+/, '')
  return rest ? `Part of #${parent}\n\n${rest}` : `Part of #${parent}\n`
}

const after = target => (target ? `after #${target}` : null)

export function describe(op) {
  const what = {
    addToProject: () => `board +#${op.issue}`,
    setField: () => `#${op.issue} ${op.field} → ${op.value ?? '(empty)'}`,
    addLabel: () => `#${op.issue} +label ${op.label}`,
    removeLabel: () => `#${op.issue} -label ${op.label}`,
    ensurePartOf: () => `#${op.issue} body opens with "Part of #${op.parent}"`,
    addSubIssue: () => `#${op.parent} +sub-issue #${op.child}`,
    moveSubIssue: () => `#${op.parent} sub-issue #${op.child} → ${after(op.after) ?? 'first'}`,
    moveItem: () => `board #${op.issue} → ${after(op.after) ?? 'top'}`,
    addBlockedBy: () => `#${op.issue} blocked by #${op.blocker}`,
    removeBlockedBy: () => `#${op.issue} no longer blocked by #${op.blocker}`,
    closeIssue: () => `#${op.issue} closed${op.reason === 'NOT_PLANNED' ? ' as not planned' : ''}`,
    setMilestone: () => `#${op.issue} milestone → ${op.milestone ?? '(none)'}`,
    setTitle: () => `#${op.issue} title → "${op.title}"`,
    comment: () => `#${op.issue} comment`,
  }[op.op]
  const line = what ? what() : JSON.stringify(op)
  return op.why ? `${line} (${op.why})` : line
}

export function plan(snapshot, { now = snapshot.takenAt, conventions } = {}) {
  const { typeLabels, milestones, closingCommentSince, staleDays } = checkConventions(conventions)
  const ops = []
  const judgment = []
  const hasWaitingOn = WAITING_ON in snapshot.project.fields
  if (!hasWaitingOn) judgment.push({ kind: 'setup', detail: `project field "${WAITING_ON}" is missing: run backlog.mjs setup` })
  const hasSize = SIZE in snapshot.project.fields

  const issues = snapshot.issues.map(issue => ({
    ...issue,
    labels: [...issue.labels],
    subIssues: [...issue.subIssues],
    blockedBy: [...issue.blockedBy],
  }))
  const byNumber = new Map(issues.map(issue => [issue.number, issue]))
  const lookup = number => byNumber.get(number)
  const board = new Map(snapshot.items.map(item => [item.issue, item]))

  for (const issue of issues) {
    if (!board.has(issue.number)) ops.push({ op: 'addToProject', issue: issue.number, why: 'open issue missing from the board' })
  }

  for (const issue of issues) {
    const body = issue.body ?? ''
    if (issue.parent) {
      if (firstLine(body) !== `Part of #${issue.parent}`) {
        ops.push({ op: 'ensurePartOf', issue: issue.number, parent: issue.parent, why: `sub-issue of #${issue.parent}` })
      }
    } else {
      const partOf = body.match(/^Part of #(\d+)\s*$/m)
      if (partOf) {
        const parent = Number(partOf[1])
        ops.push({ op: 'addSubIssue', parent, child: issue.number, why: `body says Part of #${parent}` })
        issue.parent = parent
        lookup(parent)?.subIssues.push({ number: issue.number, state: 'OPEN' })
      }
    }
    const blockedByLine = body.match(/^Blocked by:(.*)$/m)
    for (const match of blockedByLine?.[1].matchAll(/#(\d+)/g) ?? []) {
      const blocker = Number(match[1])
      if (issue.blockedBy.some(b => b.number === blocker)) continue
      ops.push({ op: 'addBlockedBy', issue: issue.number, blocker, why: `body says Blocked by #${blocker}` })
      if (lookup(blocker)) issue.blockedBy.push({ number: blocker, state: 'OPEN' })
    }
  }

  for (const issue of issues) {
    const states = issue.labels.filter(label => STATE_LABELS.includes(label))
    if (isEpic(issue)) {
      if (!issue.labels.includes(EPIC_LABEL)) {
        ops.push({ op: 'addLabel', issue: issue.number, label: EPIC_LABEL, why: 'has sub-issues' })
        issue.labels.push(EPIC_LABEL)
      }
      for (const state of states) {
        ops.push({ op: 'removeLabel', issue: issue.number, label: state, why: 'an epic takes no triage state' })
        issue.labels.splice(issue.labels.indexOf(state), 1)
      }
    } else if (!states.length) {
      ops.push({ op: 'addLabel', issue: issue.number, label: 'needs-triage', why: 'no triage state' })
      issue.labels.push('needs-triage')
    } else if (states.length > 1) {
      judgment.push({ kind: 'state-conflict', issue: issue.number, detail: states.join(', ') })
    }
    if (!issue.labels.some(label => typeLabels.includes(label))) judgment.push({ kind: 'missing-type', issue: issue.number })
    if (issue.labels.includes('wontfix')) judgment.push({ kind: 'wontfix-open', issue: issue.number })
  }

  const openChildren = epic => epic.subIssues.filter(child => child.state === 'OPEN').map(child => child.number)
  const priorityRollUp = epic => earliestIn(PRIORITIES, openChildren(epic).map(priorityOf))
  const priorityOf = number => {
    const issue = lookup(number)
    const current = board.get(number)?.priority ?? null
    return issue && isEpic(issue) ? priorityRollUp(issue) ?? current : current
  }
  const milestoneRollUp = epic => earliestIn(milestones, openChildren(epic).map(milestoneOf))
  const milestoneOf = number => {
    const issue = lookup(number)
    const current = issue?.milestone ?? null
    return issue && isEpic(issue) ? milestoneRollUp(issue) ?? current : current
  }

  const closing = []
  for (const issue of issues) {
    const current = board.get(issue.number) ?? { status: null, priority: null, waitingOn: null, size: null, sizeSetAt: null }
    const status = desiredStatus(issue, lookup)
    if (status !== current.status) {
      ops.push({ op: 'setField', issue: issue.number, field: 'Status', value: status, why: statusWhy(issue, status) })
    }
    if (hasWaitingOn) {
      const waiting = desiredWaitingOn(issue, status, current.waitingOn)
      if (waiting.judgment) judgment.push({ kind: 'waiting-on', issue: issue.number })
      else if (waiting.value !== (current.waitingOn ?? null)) {
        ops.push({ op: 'setField', issue: issue.number, field: WAITING_ON, value: waiting.value, why: status === 'Blocked' ? statusWhy(issue, status) : 'not blocked' })
      }
    }
    if (isEpic(issue)) {
      const priority = priorityRollUp(issue)
      if (priority && priority !== current.priority) {
        ops.push({ op: 'setField', issue: issue.number, field: 'Priority', value: priority, why: 'highest priority of its open sub-issues' })
      }
      const milestone = milestoneRollUp(issue)
      if (milestone && milestone !== issue.milestone) {
        ops.push({ op: 'setMilestone', issue: issue.number, milestone, why: 'earliest milestone of its open sub-issues' })
      }
      if (status === 'Done') closing.push({ op: 'closeIssue', issue: issue.number, why: 'every sub-issue is closed, every box checked' })
      else if (!issue.subIssues.some(child => child.state === 'OPEN')) {
        const item = firstUncheckedItem(issue.body)
        judgment.push({ kind: 'missing-next-ticket', issue: issue.number, detail: item === null ? 'no sub-issue and no unchecked box' : `next line: ${item}` })
      }
    } else {
      if (!current.priority) judgment.push({ kind: 'missing-priority', issue: issue.number })
      if (hasSize) {
        if (!current.size) judgment.push({ kind: 'missing-size', issue: issue.number })
        else if (editedSince(issue, current.sizeSetAt)) {
          judgment.push({ kind: 'outdated-size', issue: issue.number, detail: `${current.size} set ${current.sizeSetAt.slice(0, 16)}, body edited ${issue.lastEditedAt.slice(0, 16)}` })
        }
      }
      const idle = new Date(now) - new Date(issue.updatedAt) > staleDays * DAY_MS
      if (status === 'In progress' && !issue.linkedOpenPullRequests.length && idle) {
        judgment.push({ kind: 'stale', issue: issue.number, detail: `no activity since ${issue.updatedAt.slice(0, 10)}` })
      }
    }
  }
  for (const item of snapshot.items) {
    if (item.state === 'CLOSED' && item.status !== 'Done') {
      ops.push({ op: 'setField', issue: item.issue, field: 'Status', value: 'Done', why: 'closed' })
    }
  }
  ops.push(...closing)

  for (const epic of snapshot.issues) {
    const open = epic.subIssues.filter(child => child.state === 'OPEN').map(child => child.number)
    const desired = [...open].sort(byMilestoneThenPriority(milestones, milestoneOf, priorityOf))
    for (const move of orderMoves(open, desired)) {
      ops.push({ op: 'moveSubIssue', parent: epic.number, child: move.id, after: move.after, why: 'milestone, then priority order' })
    }
  }
  const openItems = snapshot.items.filter(item => item.state === 'OPEN').map(item => item.issue)
  const desiredBoard = [...openItems].sort(byMilestoneThenPriority(milestones, milestoneOf, priorityOf))
  for (const move of orderMoves(openItems, desiredBoard)) {
    ops.push({ op: 'moveItem', issue: move.id, after: move.after, why: 'milestone, then priority order' })
  }

  for (const pullRequest of snapshot.openPullRequests) {
    if (!pullRequest.closes.length) judgment.push({ kind: 'unlinked-pr', pullRequest: pullRequest.number, detail: pullRequest.title })
  }

  for (const issue of snapshot.closedIssues) {
    if (issue.stateReason !== 'COMPLETED' || isEpic(issue)) continue
    if (new Date(issue.closedAt) < new Date(closingCommentSince)) continue
    if (hasRecord(issue)) continue
    judgment.push({ kind: 'missing-closing-comment', issue: issue.number, detail: `closed on ${issue.closedAt.slice(0, 10)}` })
  }

  return { ops, judgment }
}
