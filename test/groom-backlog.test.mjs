import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plan as planTracker, desiredStatus, externalBlocker, orderMoves, withPartOf, describe } from '../.claude/skills/groom-backlog/scripts/plan.mjs'
import { isTrackerWrite, touchedIssues } from '../.claude/skills/groom-backlog/scripts/tracker-write.mjs'
import { applier, boardItems, gitReader, loadConfig, projectLocation } from '../.claude/skills/groom-backlog/scripts/backlog.mjs'
import { parseDiff, applyDiff, citationsIn, relocations } from '../.claude/skills/groom-backlog/scripts/citations.mjs'

const NOW = '2026-10-08T12:00:00Z'

const TEST_CONVENTIONS = {
  typeLabels: ['enhancement', 'bug', 'documentation', 'accessibility', 'compliance'],
  milestones: ['Premier déploiement', 'Avant le lancement', 'Croissance'],
  closingCommentSince: '2026-10-10T00:00:00Z',
  staleDays: 7,
}

const plan = (snapshot, options = {}) => planTracker(snapshot, { conventions: TEST_CONVENTIONS, ...options })

test('the planner refuses to run without the conventions it applies', () => {
  assert.throws(() => planTracker(snapshot({ issues: [] })), /conventions lack typeLabels, milestones, closingCommentSince, staleDays/)
  assert.throws(() => planTracker(snapshot({ issues: [] }), { conventions: { ...TEST_CONVENTIONS, milestones: undefined } }), /conventions lack milestones/)
})

test("the repository's config holds every convention and a project URL", () => {
  const config = loadConfig()
  assert.ok(config.milestones.length > 0)
  assert.equal(projectLocation(config.project).ownerKind, 'organization')
})

test('a project URL names its owner kind, login and number', () => {
  assert.deepEqual(projectLocation('https://github.com/orgs/ShorRP/projects/3'), {
    url: 'https://github.com/orgs/ShorRP/projects/3',
    ownerKind: 'organization',
    login: 'ShorRP',
    number: 3,
  })
  assert.equal(projectLocation('https://github.com/users/someone/projects/1').ownerKind, 'user')
  assert.throws(() => projectLocation('https://github.com/ShorRP/Admin_Panel'), /must be a project URL/)
})

test('milestones order the board as the conventions list them', () => {
  const result = planTracker(snapshot({
    issues: [issue(1, { milestone: 'Later' }), issue(2, { milestone: 'Sooner' })],
  }), { conventions: { ...TEST_CONVENTIONS, milestones: ['Sooner', 'Later'] } })
  assert.deepEqual(result.ops.filter(o => o.op === 'moveItem').map(o => [o.issue, o.after]), [[2, null]])
})

function issue(number, fields = {}) {
  return {
    number,
    title: `Tests : ticket ${number}`,
    state: 'OPEN',
    body: '',
    labels: ['enhancement', 'ready-for-agent'],
    milestone: null,
    assignees: [],
    parent: null,
    subIssues: [],
    blockedBy: [],
    linkedOpenPullRequests: [],
    updatedAt: NOW,
    ...fields,
  }
}

function closedIssue(number, fields = {}) {
  return {
    number,
    title: `Tests : ticket ${number}`,
    stateReason: 'COMPLETED',
    closedAt: '2026-10-10T18:06:32Z',
    labels: ['enhancement', 'ready-for-agent'],
    subIssues: [],
    comments: [],
    ...fields,
  }
}

function item(number, fields = {}) {
  return { issue: number, state: 'OPEN', status: 'Todo', priority: 'P1', waitingOn: null, size: 'M', sizeSetAt: null, ...fields }
}

function snapshot({ issues, items, closedIssues = [], pullRequests = [], fields } = {}) {
  return {
    takenAt: NOW,
    project: {
      fields: fields ?? {
        Status: ['Todo', 'In progress', 'Done', 'Blocked'],
        Priority: ['P0', 'P1', 'P2'],
        'Waiting on': 'TEXT',
        Size: ['XS', 'S', 'M', 'L', 'XL'],
      },
    },
    issues,
    items: items ?? issues.map(i => item(i.number)),
    closedIssues,
    openPullRequests: pullRequests,
  }
}

const opsFor = (result, n) => result.ops.filter(o => o.issue === n || o.child === n)
const kinds = (result, n) => result.judgment.filter(j => j.issue === n).map(j => j.kind)

const BOARD_REPO = 'PothieuG/EsportCards'
const BOARD_ID = 'PVT_board'
const fieldValues = (values, setAt = {}) => ({ nodes: [{}, ...Object.entries(values).map(([name, value]) => ({ name: value, updatedAt: setAt[name], field: { name } }))] })
const listedItem = (number, values, setAt) => ({ id: `PVTI_${number}`, content: { number, state: 'OPEN', repository: { nameWithOwner: BOARD_REPO } }, fieldValues: fieldValues(values, setAt) })
const ticketItem = (number, project, values, setAt) => ({ id: `PVTI_${project}_${number}`, project: { id: project }, fieldValues: fieldValues(values, setAt) })
const openTicket = (number, projectItems) => ({ number, state: 'OPEN', projectItems: { nodes: projectItems } })

test('a tracker already in order plans nothing', () => {
  const result = plan(snapshot({ issues: [issue(1), issue(2)] }))
  assert.deepEqual(result.ops, [])
  assert.deepEqual(result.judgment, [])
})

test('a tracker already in order by milestone plans nothing', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['enhancement', 'epic'], milestone: 'Premier déploiement', subIssues: [{ number: 2, state: 'OPEN' }, { number: 3, state: 'OPEN' }] }),
      issue(2, { parent: 1, body: 'Part of #1', milestone: 'Premier déploiement' }),
      issue(3, { parent: 1, body: 'Part of #1', milestone: 'Croissance' }),
      issue(4),
    ],
    items: [item(1, { status: 'Todo' }), item(2), item(3), item(4, { priority: 'P0' })],
  }))
  assert.deepEqual(result.ops, [])
})

test('status: an issue waiting on a human is Blocked', () => {
  const lookup = () => undefined
  assert.equal(desiredStatus(issue(1, { labels: ['bug', 'needs-info'] }), lookup), 'Blocked')
  assert.equal(desiredStatus(issue(1, { labels: ['bug', 'needs-triage'] }), lookup), 'Blocked')
  assert.equal(desiredStatus(issue(1, { blockedBy: [{ number: 9, state: 'OPEN' }] }), lookup), 'Blocked')
  assert.equal(desiredStatus(issue(1, { body: '**Bloqué : nécessite GitHub Pro.** Suite.' }), lookup), 'Blocked')
})

test('status: ready work is Todo, claimed work is In progress', () => {
  const lookup = () => undefined
  assert.equal(desiredStatus(issue(1, { labels: ['bug', 'ready-for-human'] }), lookup), 'Todo')
  assert.equal(desiredStatus(issue(1, { blockedBy: [{ number: 9, state: 'CLOSED' }] }), lookup), 'Todo')
  assert.equal(desiredStatus(issue(1, { body: 'Débloqué : #7 est fermé.' }), lookup), 'Todo')
  assert.equal(desiredStatus(issue(1, { assignees: ['PothieuG'] }), lookup), 'In progress')
  assert.equal(desiredStatus(issue(1, { linkedOpenPullRequests: [40] }), lookup), 'In progress')
})

test('status: a drifted Status is corrected', () => {
  const result = plan(snapshot({
    issues: [issue(35, { labels: ['documentation', 'needs-info'] })],
    items: [item(35, { status: 'Todo', waitingOn: 'propriétaire : choisir le mot' })],
  }))
  assert.deepEqual(opsFor(result, 35), [
    { op: 'setField', issue: 35, field: 'Status', value: 'Blocked', why: 'needs-info' },
  ])
})

test('waiting on: derived from blockers, triage and prose, cleared once unblocked', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { blockedBy: [{ number: 32, state: 'OPEN' }, { number: 33, state: 'OPEN' }] }),
      issue(2, { labels: ['bug'] }),
      issue(6, { body: '**Bloqué : nécessite GitHub Pro sur le compte du propriétaire.** Le reste.' }),
      issue(7),
    ],
    items: [
      item(1, { status: 'Blocked', waitingOn: '#32' }),
      item(2),
      item(6, { status: 'Blocked' }),
      item(7, { waitingOn: '#5' }),
    ],
  }))
  const waiting = result.ops.filter(o => o.field === 'Waiting on').map(o => [o.issue, o.value])
  assert.deepEqual(waiting, [
    [1, '#32, #33'],
    [2, 'mainteneur : triage'],
    [6, 'nécessite GitHub Pro sur le compte du propriétaire'],
    [7, null],
  ])
})

test('waiting on: needs-info asks for judgment unless someone already wrote it', () => {
  const asked = plan(snapshot({
    issues: [issue(35, { labels: ['documentation', 'needs-info'] })],
    items: [item(35, { status: 'Blocked' })],
  }))
  assert.deepEqual(kinds(asked, 35), ['waiting-on'])
  const written = plan(snapshot({
    issues: [issue(35, { labels: ['documentation', 'needs-info'] })],
    items: [item(35, { status: 'Blocked', waitingOn: 'propriétaire : choisir le mot' })],
  }))
  assert.deepEqual(written.ops, [])
  assert.deepEqual(written.judgment, [])
})

test('labels: an untriaged issue gets needs-triage, then waits on the owner', () => {
  const result = plan(snapshot({ issues: [issue(3, { labels: ['bug'] })] }))
  assert.deepEqual(opsFor(result, 3).map(o => [o.op, o.label ?? o.field, o.value]), [
    ['addLabel', 'needs-triage', undefined],
    ['setField', 'Status', 'Blocked'],
    ['setField', 'Waiting on', 'mainteneur : triage'],
  ])
})

test('labels: missing type, conflicting states and an open wontfix go to judgment', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['ready-for-agent'] }),
      issue(2, { labels: ['bug', 'ready-for-agent', 'ready-for-human'] }),
      issue(3, { labels: ['bug', 'wontfix'] }),
    ],
  }))
  assert.deepEqual(kinds(result, 1), ['missing-type'])
  assert.deepEqual(kinds(result, 2), ['state-conflict'])
  assert.deepEqual(kinds(result, 3), ['wontfix-open'])
})

test('epics: no triage state, the label follows the children, status and priority roll up', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['enhancement', 'epic', 'needs-triage'], subIssues: [{ number: 2, state: 'OPEN' }, { number: 3, state: 'CLOSED' }] }),
      issue(2, { parent: 1, body: 'Part of #1' }),
      issue(4, { labels: ['compliance'], subIssues: [{ number: 5, state: 'OPEN' }] }),
      issue(5, { parent: 4, body: 'Part of #4' }),
    ],
    items: [item(1, { priority: null }), item(2, { priority: 'P0' }), item(4, { priority: 'P2' }), item(5)],
  }))
  assert.deepEqual(opsFor(result, 1).map(o => [o.op, o.label ?? o.field, o.value]), [
    ['removeLabel', 'needs-triage', undefined],
    ['setField', 'Status', 'In progress'],
    ['setField', 'Priority', 'P0'],
  ])
  assert.deepEqual(opsFor(result, 4).map(o => [o.op, o.label ?? o.field, o.value]), [
    ['addLabel', 'epic', undefined],
    ['setField', 'Priority', 'P1'],
  ])
})

test('epics: the milestone follows the earliest one of the open children, earlier or later, and stays when none has one', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['enhancement', 'epic'], subIssues: [{ number: 2, state: 'OPEN' }, { number: 3, state: 'OPEN' }] }),
      issue(2, { parent: 1, body: 'Part of #1', milestone: 'Avant le lancement' }),
      issue(3, { parent: 1, body: 'Part of #1', milestone: 'Premier déploiement' }),
      issue(4, { labels: ['enhancement', 'epic'], milestone: 'Croissance', subIssues: [{ number: 5, state: 'OPEN' }] }),
      issue(5, { parent: 4, body: 'Part of #4' }),
      issue(6, { labels: ['enhancement', 'epic'], milestone: 'Premier déploiement', subIssues: [{ number: 7, state: 'OPEN' }, { number: 8, state: 'CLOSED' }] }),
      issue(7, { parent: 6, body: 'Part of #6', milestone: 'Croissance' }),
    ],
  }))
  const milestones = result.ops.filter(o => o.op === 'setMilestone').map(o => [o.issue, o.milestone])
  assert.deepEqual(milestones, [[1, 'Premier déploiement'], [6, 'Croissance']])
})

test('epics: an epic whose children are all closed and boxes all checked is closed', () => {
  const result = plan(snapshot({
    issues: [issue(1, {
      labels: ['enhancement', 'epic'],
      body: '## Checklist\r\n\r\n- [x] #2 : `ordresAchat`\r\n* [X] Rareté\r\n',
      subIssues: [{ number: 2, state: 'CLOSED' }],
    })],
  }))
  assert.deepEqual(opsFor(result, 1).map(o => [o.op, o.value]), [
    ['setField', 'Done'],
    ['closeIssue', undefined],
  ])
})

test('epics: an unchecked box in its body keeps an epic open, even once every child is closed', () => {
  const result = plan(snapshot({
    issues: [issue(36, {
      labels: ['enhancement', 'epic'],
      body: '## Checklist\r\n\r\n- [x] #59 : `ordresAchat`\r\n- [ ] Marché : `encheres`\r\n',
      subIssues: [{ number: 59, state: 'CLOSED' }],
    })],
  }))
  assert.deepEqual(opsFor(result, 36).map(o => [o.op, o.value]), [
    ['setField', 'In progress'],
  ])
  for (const box of ['* [ ]', '+ [ ]', '1. [ ]', '  - [ ]', '> - [ ]']) {
    const epic = issue(36, { labels: ['enhancement', 'epic'], body: `${box} Rareté`, subIssues: [{ number: 59, state: 'CLOSED' }] })
    assert.equal(desiredStatus(epic, () => undefined), 'In progress', box)
  }
})

test('epics: an unfinished epic without an open child asks for the ticket of its next line', () => {
  const result = plan(snapshot({
    issues: [issue(36, {
      labels: ['enhancement', 'epic'],
      body: '## Checklist\r\n\r\n- [x] #59 : `ordresAchat`\r\n- [ ] Marché : `encheres`\r\n- [ ] Rareté\r\n',
      subIssues: [{ number: 59, state: 'CLOSED' }],
    })],
    items: [item(36, { status: 'In progress' })],
  }))
  assert.deepEqual(result.judgment, [{ kind: 'missing-next-ticket', issue: 36, detail: 'next line: Marché : `encheres`' }])
})

test('epics: an epic with an open child, or one about to close, asks for no next ticket', () => {
  const withOpenChild = plan(snapshot({
    issues: [
      issue(36, {
        labels: ['enhancement', 'epic'],
        body: '- [x] #59 : `ordresAchat`\n- [ ] #102 : Marché\n- [ ] Rareté\n',
        subIssues: [{ number: 59, state: 'CLOSED' }, { number: 102, state: 'OPEN' }],
      }),
      issue(102, { parent: 36, body: 'Part of #36' }),
    ],
    items: [item(36, { status: 'In progress' }), item(102)],
  }))
  assert.deepEqual(kinds(withOpenChild, 36), [])
  const allChecked = plan(snapshot({
    issues: [issue(36, { labels: ['enhancement', 'epic'], body: '- [x] #59 : `ordresAchat`\n', subIssues: [{ number: 59, state: 'CLOSED' }] })],
  }))
  assert.deepEqual(kinds(allChecked, 36), [])
})

test('epics: an epic without a sub-issue asks for its next ticket, even with every box checked', () => {
  for (const body of ['Le suivi de la traduction.', '- [x] Stockage\n']) {
    const result = plan(snapshot({ issues: [issue(57, { labels: ['enhancement', 'epic'], body })] }))
    assert.deepEqual(result.judgment, [{ kind: 'missing-next-ticket', issue: 57, detail: 'no sub-issue and no unchecked box' }], body)
  }
})

test('epics: blocked when every open child is blocked; an empty epic stays Todo', () => {
  const issues = [
    issue(1, { labels: ['enhancement', 'epic'], subIssues: [{ number: 2, state: 'OPEN' }] }),
    issue(2, { parent: 1, body: 'Part of #1', labels: ['bug', 'needs-info'] }),
    issue(36, { labels: ['enhancement', 'epic'] }),
  ]
  const byNumber = n => issues.find(i => i.number === n)
  assert.equal(desiredStatus(issues[0], byNumber), 'Blocked')
  assert.equal(desiredStatus(issues[2], byNumber), 'Todo')
})

test('parents: the native sub-issue link and the "Part of" line agree', () => {
  const result = plan(snapshot({
    issues: [
      issue(22, { labels: ['compliance', 'epic'], subIssues: [{ number: 8, state: 'OPEN' }, { number: 9, state: 'OPEN' }] }),
      issue(8, { parent: 22, body: '> Notes de recherche' }),
      issue(9, { parent: 22, body: 'Part of #1\n\nCorps' }),
      issue(10, { body: 'Part of #22\n\nCorps' }),
    ],
  }))
  assert.deepEqual(opsFor(result, 8), [{ op: 'ensurePartOf', issue: 8, parent: 22, why: 'sub-issue of #22' }])
  assert.deepEqual(opsFor(result, 9), [{ op: 'ensurePartOf', issue: 9, parent: 22, why: 'sub-issue of #22' }])
  assert.deepEqual(opsFor(result, 10), [{ op: 'addSubIssue', parent: 22, child: 10, why: 'body says Part of #22' }])
})

test('parents: the "Part of" line is written first, replacing a stale one', () => {
  assert.equal(withPartOf('> Notes de recherche\r\n\r\nCorps', 22), 'Part of #22\n\n> Notes de recherche\r\n\r\nCorps')
  assert.equal(withPartOf('Part of #1\r\n\r\nCorps', 22), 'Part of #22\n\nCorps')
  assert.equal(withPartOf('Intro\nPart of #1\nSuite', 22), 'Part of #22\n\nIntro\nSuite')
  assert.equal(withPartOf('', 22), 'Part of #22\n')
})

test('report: each operation reads as one line', () => {
  assert.equal(describe({ op: 'setField', issue: 35, field: 'Status', value: 'Blocked', why: 'needs-info' }), '#35 Status → Blocked (needs-info)')
  assert.equal(describe({ op: 'setField', issue: 7, field: 'Waiting on', value: null, why: 'not blocked' }), '#7 Waiting on → (empty) (not blocked)')
  assert.equal(describe({ op: 'addLabel', issue: 3, label: 'needs-triage', why: 'no triage state' }), '#3 +label needs-triage (no triage state)')
  assert.equal(describe({ op: 'moveSubIssue', parent: 1, child: 5, after: null, why: 'priority order' }), '#1 sub-issue #5 → first (priority order)')
  assert.equal(describe({ op: 'moveItem', issue: 4, after: 5, why: 'priority order' }), 'board #4 → after #5 (priority order)')
})

test('blockers: a "Blocked by" line becomes a native dependency', () => {
  const result = plan(snapshot({
    issues: [issue(5, { body: 'Part of #1\nBlocked by: #3, #4\n', blockedBy: [{ number: 3, state: 'OPEN' }] })],
    items: [item(5, { status: 'Blocked', waitingOn: '#3' })],
  }))
  assert.deepEqual(result.ops.filter(o => o.op === 'addBlockedBy'), [
    { op: 'addBlockedBy', issue: 5, blocker: 4, why: 'body says Blocked by #4' },
  ])
})

test('project: open issues are on the board, closed ones are Done', () => {
  const result = plan(snapshot({
    issues: [issue(1), issue(2)],
    items: [item(1), item(7, { state: 'CLOSED', status: 'In progress' })],
  }))
  assert.deepEqual(result.ops.map(o => [o.op, o.issue, o.value]), [
    ['addToProject', 2, undefined],
    ['setField', 2, 'Todo'],
    ['setField', 7, 'Done'],
  ])
  assert.deepEqual(kinds(result, 2), ['missing-priority', 'missing-size'])
})

test('project: an item the board list does not show yet is read from its ticket, a ticket truly off the board is still added', () => {
  const fields = { Status: 'Todo', Priority: 'P1', Size: 'M' }

  const { items, itemIds } = boardItems({
    repoName: BOARD_REPO,
    projectId: BOARD_ID,
    itemNodes: [listedItem(1, fields)],
    issueNodes: [
      openTicket(1, [ticketItem(1, BOARD_ID, fields)]),
      openTicket(150, [ticketItem(150, 'PVT_other', {}), ticketItem(150, BOARD_ID, { Status: 'Todo', Priority: 'P2', Size: 'S' })]),
      openTicket(151, [ticketItem(151, 'PVT_other', fields)]),
    ],
  })
  assert.deepEqual(items, [item(1), item(150, { priority: 'P2', size: 'S' })])
  assert.deepEqual(itemIds, { 1: 'PVTI_1', 150: `PVTI_${BOARD_ID}_150` })

  const result = plan(snapshot({ issues: [issue(1), issue(150), issue(151)], items }))
  assert.deepEqual(opsFor(result, 150), [])
  assert.deepEqual(kinds(result, 150), [])
  assert.deepEqual(result.ops.filter(o => o.op === 'addToProject').map(o => o.issue), [151])
  assert.deepEqual(kinds(result, 151), ['missing-priority', 'missing-size'])
})

test('project: a Size carries the date it was set, read from the board or from the ticket', () => {
  const statusSetAt = { Status: '2026-10-01T08:00:00Z' }
  const { items } = boardItems({
    repoName: BOARD_REPO,
    projectId: BOARD_ID,
    itemNodes: [listedItem(7, { Status: 'Todo', Size: 'XS' }, { ...statusSetAt, Size: '2026-10-23T08:56:48Z' })],
    issueNodes: [
      openTicket(8, [ticketItem(8, BOARD_ID, { Status: 'Todo', Size: 'S' }, { ...statusSetAt, Size: '2026-10-23T13:12:15Z' })]),
      openTicket(9, [ticketItem(9, BOARD_ID, { Status: 'Todo' }, statusSetAt)]),
    ],
  })
  assert.deepEqual(items.map(i => [i.issue, i.size, i.sizeSetAt]), [
    [7, 'XS', '2026-10-23T08:56:48Z'],
    [8, 'S', '2026-10-23T13:12:15Z'],
    [9, null, null],
  ])
})

test('priority: an open ticket without one goes to judgment', () => {
  const result = plan(snapshot({ issues: [issue(1)], items: [item(1, { priority: null })] }))
  assert.deepEqual(kinds(result, 1), ['missing-priority'])
})

test('size: an open ticket without one goes to judgment; epics and an estimate on an unedited ticket are left alone', () => {
  const issues = [
    issue(1),
    issue(2),
    issue(3, { labels: ['enhancement', 'epic'], subIssues: [{ number: 4, state: 'OPEN' }] }),
    issue(4, { parent: 3, body: 'Part of #3' }),
  ]
  const items = [item(1, { size: null }), item(2, { size: 'XL' }), item(3, { size: null }), item(4)]
  const result = plan(snapshot({ issues, items }))
  assert.deepEqual(kinds(result, 1), ['missing-size'])
  assert.deepEqual(kinds(result, 2), [])
  assert.deepEqual(kinds(result, 3), [])
  assert.equal(result.ops.some(o => o.field === 'Size'), false)

  const withoutField = plan(snapshot({
    issues: [issue(1)],
    items: [item(1, { size: null })],
    fields: { Status: ['Todo', 'In progress', 'Done', 'Blocked'], Priority: ['P0', 'P1', 'P2'], 'Waiting on': 'TEXT' },
  }))
  assert.deepEqual(kinds(withoutField, 1), [])
})

test('size: an estimate older than the last edit of its ticket goes back to judgment; one made since, an unedited ticket and an epic are left alone', () => {
  const issues = [
    issue(1, { lastEditedAt: '2026-10-23T13:05:39Z' }),
    issue(2, { lastEditedAt: '2026-10-23T08:00:00Z' }),
    issue(3, { lastEditedAt: null }),
    issue(4, { labels: ['enhancement', 'epic'], subIssues: [{ number: 5, state: 'OPEN' }], lastEditedAt: '2026-10-23T13:05:39Z' }),
    issue(5, { parent: 4, body: 'Part of #4', lastEditedAt: '2026-10-23T13:05:39Z' }),
  ]
  const items = [
    item(1, { size: 'XS', sizeSetAt: '2026-10-23T08:56:48Z' }),
    item(2, { size: 'XS', sizeSetAt: '2026-10-23T08:56:48Z' }),
    item(3, { size: 'XS', sizeSetAt: '2026-10-23T08:56:48Z' }),
    item(4, { size: 'L', sizeSetAt: '2026-10-23T08:56:48Z' }),
    item(5, { size: null }),
  ]
  const result = plan(snapshot({ issues, items }))
  assert.deepEqual(result.judgment.filter(j => j.kind === 'outdated-size'), [
    { kind: 'outdated-size', issue: 1, detail: 'XS set 2026-10-23T08:56, body edited 2026-10-23T13:05' },
  ])
  assert.deepEqual(kinds(result, 5), ['missing-size'])
  assert.equal(result.ops.some(o => o.field === 'Size'), false)
})

test('apply: a Size is cleared before it is set, so its date marks the estimate even when the value stays', () => {
  const calls = []
  const request = (query, variables) => {
    calls.push({ mutation: query.match(/(\w+)\(input/)[1], option: variables.option })
    return {}
  }
  const ids = {
    project: 'PVT_board',
    issues: { 7: 'I_7' },
    items: { 7: 'PVTI_7' },
    labels: {},
    milestones: {},
    fields: {
      Size: { id: 'F_size', options: { XS: 'o_xs', S: 'o_s' } },
      Priority: { id: 'F_priority', options: { P0: 'o_p0', P1: 'o_p1' } },
    },
  }
  const run = applier({ ids }, request)

  run.setField({ issue: 7, field: 'Size', value: 'S' })
  assert.deepEqual(calls, [
    { mutation: 'clearProjectV2ItemFieldValue', option: undefined },
    { mutation: 'updateProjectV2ItemFieldValue', option: 'o_s' },
  ])

  calls.length = 0
  run.setField({ issue: 7, field: 'Priority', value: 'P0' })
  assert.deepEqual(calls, [{ mutation: 'updateProjectV2ItemFieldValue', option: 'o_p0' }])
})

test('order: the board and each epic sort by priority, keeping the order within a priority', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['enhancement', 'epic'], subIssues: [3, 4, 5].map(number => ({ number, state: 'OPEN' })) }),
      issue(3, { parent: 1, body: 'Part of #1' }),
      issue(4, { parent: 1, body: 'Part of #1' }),
      issue(5, { parent: 1, body: 'Part of #1' }),
    ],
    items: [item(1, { priority: 'P0' }), item(3, { priority: 'P2' }), item(4, { priority: 'P1' }), item(5, { priority: 'P0' })],
  }))
  const moves = result.ops.filter(o => o.op.startsWith('move')).map(o => [o.op, o.issue ?? o.child, o.after])
  assert.deepEqual(moves, [
    ['moveSubIssue', 5, null],
    ['moveSubIssue', 4, 5],
    ['moveItem', 5, 1],
    ['moveItem', 4, 5],
  ])
})

test('order: the board sorts by milestone first, then by priority, tickets without a milestone last', () => {
  const result = plan(snapshot({
    issues: [
      issue(3, { milestone: 'Croissance' }),
      issue(4),
      issue(5, { milestone: 'Premier déploiement' }),
      issue(6, { milestone: 'Avant le lancement' }),
    ],
    items: [item(3, { priority: 'P0' }), item(4, { priority: 'P0' }), item(5, { priority: 'P2' }), item(6, { priority: 'P1' })],
  }))
  const moves = result.ops.filter(o => o.op.startsWith('move')).map(o => [o.op, o.issue ?? o.child, o.after])
  assert.deepEqual(moves, [
    ['moveItem', 5, null],
    ['moveItem', 6, 5],
  ])
})

test('order: the sub-issues of an epic sort by milestone first, then by priority', () => {
  const result = plan(snapshot({
    issues: [
      issue(1, { labels: ['enhancement', 'epic'], subIssues: [3, 4, 5].map(number => ({ number, state: 'OPEN' })) }),
      issue(3, { parent: 1, body: 'Part of #1', milestone: 'Croissance' }),
      issue(4, { parent: 1, body: 'Part of #1' }),
      issue(5, { parent: 1, body: 'Part of #1', milestone: 'Premier déploiement' }),
    ],
    items: [item(1, { priority: 'P0' }), item(3, { priority: 'P0' }), item(4, { priority: 'P0' }), item(5, { priority: 'P2' })],
  }))
  const moves = result.ops.filter(o => o.op === 'moveSubIssue').map(o => [o.child, o.after])
  assert.deepEqual(moves, [[5, null]])
})

test('order: an epic sits on the board at the milestone it rolls up, through a nested epic', () => {
  const result = plan(snapshot({
    issues: [
      issue(4, { milestone: 'Avant le lancement' }),
      issue(1, { labels: ['enhancement', 'epic'], subIssues: [{ number: 2, state: 'OPEN' }] }),
      issue(2, { labels: ['enhancement', 'epic'], parent: 1, body: 'Part of #1', subIssues: [{ number: 3, state: 'OPEN' }] }),
      issue(3, { parent: 2, body: 'Part of #2', milestone: 'Premier déploiement' }),
    ],
  }))
  assert.deepEqual(result.ops.filter(o => o.op === 'setMilestone').map(o => [o.issue, o.milestone]), [[1, 'Premier déploiement'], [2, 'Premier déploiement']])
  assert.deepEqual(result.ops.filter(o => o.op === 'moveItem').map(o => [o.issue, o.after]), [[4, 3]])
})

test('order: a single item out of place moves once', () => {
  assert.deepEqual(orderMoves(['A', 'B', 'C', 'D'], ['B', 'C', 'D', 'A']), [{ id: 'A', after: 'D' }])
  assert.deepEqual(orderMoves(['A', 'B', 'C'], ['A', 'B', 'C']), [])
  assert.deepEqual(orderMoves(['A', 'B', 'C'], ['C', 'A', 'B']), [{ id: 'C', after: null }])
})

test('hygiene: stale work and PRs that close nothing go to judgment', () => {
  const result = plan(snapshot({
    issues: [issue(1, { assignees: ['PothieuG'], updatedAt: '2026-09-20T00:00:00Z' })],
    items: [item(1, { status: 'In progress' })],
    pullRequests: [{ number: 38, title: 'Docs: record how the issue tracker is organized', closes: [] }],
  }))
  assert.deepEqual(result.judgment.map(j => [j.kind, j.issue ?? j.pullRequest]), [
    ['stale', 1],
    ['unlinked-pr', 38],
  ])
})

test('closing comment: a delivered ticket without one goes to judgment', () => {
  const result = plan(snapshot({ issues: [], closedIssues: [closedIssue(26)] }))
  assert.deepEqual(result.judgment, [{ kind: 'missing-closing-comment', issue: 26, detail: 'closed on 2026-10-10' }])
})

test('closing comment: a comment opening with "Livré par #<PR>" settles it, wherever it sits', () => {
  const result = plan(snapshot({
    issues: [],
    closedIssues: [
      closedIssue(26, { comments: ['Livré par #48 (merge `fe39114`, commit `073ae0e`).\n\n## Faits vérifiés'] }),
      closedIssue(34, { comments: ['Livré par #47 (branche `fantasy/separate-dead-points-game`).', 'Merci, vu.'] }),
      closedIssue(40, { comments: ['Voir le commentaire précédent.', 'Ce ticket sera livré par #41.'] }),
    ],
  }))
  assert.deepEqual(result.judgment.map(j => j.issue), [40])
})

test('closing comment: a wayfinder ticket keeps its record in its resolution, under one of the headings it is written with', () => {
  const wayfinder = (number, comments, label = 'wayfinder:grilling') => closedIssue(number, { labels: ['enhancement', label], comments })
  const result = plan(snapshot({
    issues: [],
    closedIssues: [
      wayfinder(83, ['## Décisions\n\nTranchées avec le propriétaire.']),
      wayfinder(84, ['## Réponse\n\n[F] node-pg-migrate est réservé à PostgreSQL.'], 'wayfinder:research'),
      wayfinder(87, ['Contraintes héritées de #85.', '## Décisions\n\nTranchées.', '## Complément']),
      wayfinder(89, ['## Résolution (propriétaire, 2026-10-13)\n\nLes sauvegardes.']),
      wayfinder(90, ['Contraintes héritées de #85.']),
      closedIssue(91, { comments: ['## Décisions\n\nTranchées.'] }),
    ],
  }))
  assert.deepEqual(result.judgment.map(j => j.issue), [90, 91])
})

test('closing comment: a ticket delivered without a PR keeps its record in a comment opening with "## Résolution"', () => {
  const result = plan(snapshot({
    issues: [],
    closedIssues: [
      closedIssue(7, { comments: ['## Résolution\n\nFait le 2026-10-23.'] }),
      closedIssue(8, { comments: ['Les IDs arrivent.', '## Résolution (Gilles, 2026-10-23)\n\nLes IDs.'] }),
      closedIssue(9, { comments: ['Fait, voir plus haut. ## Résolution'] }),
      closedIssue(10),
    ],
  }))
  assert.deepEqual(result.judgment.map(j => j.issue), [9, 10])
})

test('closing comment: tickets closed before the rule was adopted on 2026-10-10 are left alone', () => {
  const result = plan(snapshot({
    issues: [],
    closedIssues: [
      closedIssue(4, { closedAt: '2026-10-06T06:45:42Z' }),
      closedIssue(5, { closedAt: '2026-10-09T23:59:59Z' }),
      closedIssue(6, { closedAt: '2026-10-10T00:00:00Z' }),
    ],
  }))
  assert.deepEqual(result.judgment.map(j => j.issue), [6])
})

test('closing comment: only a delivered ticket needs one, not a rejected one nor an epic', () => {
  const result = plan(snapshot({
    issues: [],
    closedIssues: [
      closedIssue(7, { stateReason: 'NOT_PLANNED' }),
      closedIssue(8, { stateReason: 'DUPLICATE' }),
      closedIssue(9, { labels: ['enhancement', 'epic'], subIssues: [{ number: 10, state: 'CLOSED' }] }),
      closedIssue(11, { labels: ['enhancement'], subIssues: [{ number: 12, state: 'CLOSED' }] }),
      closedIssue(13),
    ],
  }))
  assert.deepEqual(result.judgment.map(j => j.issue), [13])
})

test('setup: a missing "Waiting on" field is reported instead of written', () => {
  const result = plan(snapshot({
    issues: [issue(35, { labels: ['documentation', 'needs-info'] })],
    items: [item(35, { status: 'Blocked' })],
    fields: { Status: ['Todo', 'In progress', 'Done', 'Blocked'], Priority: ['P0', 'P1', 'P2'] },
  }))
  assert.deepEqual(result.ops, [])
  assert.deepEqual(result.judgment.map(j => j.kind), ['setup'])
})

test('hook: tracker writes are recognized, reads and the skill itself are not', () => {
  const writes = [
    'gh issue create --title "x" --body "y"',
    'gh issue edit 35 --add-label needs-info',
    'gh issue close 7 --comment "fait"',
    'gh pr merge 38 --squash',
    'gh pr create --fill',
    'gh project item-edit --id X --field-id Y',
    'gh api --method POST repos/PothieuG/EsportCards/issues/1/sub_issues -F sub_issue_id=42',
    'gh api repos/PothieuG/EsportCards/issues/5/dependencies/blocked_by -F issue_id=9',
    'gh api -X PATCH repos/o/r/issues/1/sub_issues/priority -F sub_issue_id=1',
    `gh api graphql -f query='mutation { addSubIssue(input: {}) { clientMutationId } }'`,
    'cd /c/Dev && gh issue reopen 4',
  ]
  const reads = [
    'gh issue view 35 --comments',
    'gh issue list --state open',
    'gh pr view 38',
    'gh api repos/PothieuG/EsportCards/issues/36 --jq .id',
    'gh api --method GET repos/o/r/issues -f state=open',
    `gh api graphql -f query='{ repository(owner:"o", name:"r") { id } }'`,
    `git commit -m 'Tooling: spot a mutation' && gh api graphql -f query='{ viewer { login } }'`,
    'gh issue comment 35 --body "merci"',
    'node .claude/skills/groom-backlog/scripts/backlog.mjs apply plan.json',
    'git commit -m "Docs: tracker conventions"',
  ]
  for (const command of writes) assert.equal(isTrackerWrite(command), true, command)
  for (const command of reads) assert.equal(isTrackerWrite(command), false, command)
})

test('hook: a gh write that asks for its help writes nothing, the same write without it still counts', () => {
  const writes = [
    'gh issue create --title x',
    'gh pr merge 38 --merge',
    'gh project item-edit --id X --field-id Y',
    'gh api -X POST repos/o/r/issues/1/sub_issues -F sub_issue_id=2',
  ]
  for (const write of writes) {
    assert.equal(isTrackerWrite(write), true, write)
    for (const help of [`${write} --help`, `${write} -h`]) assert.equal(isTrackerWrite(help), false, help)
  }
  assert.equal(isTrackerWrite('gh help issue create'), false)
})

test('hook: only a help flag of its own asks for help, so a write next to a help request or quoting one still counts', () => {
  const writes = [
    'gh issue create --help && gh issue create --title x',
    'gh issue create --title x --body "Run it with -h first"',
    "gh issue create --title x --body 'Run it with --help first'",
    'gh issue create --title x --body "Run \\"gh pr merge -h --merge\\" first"',
    'gh issue create --body-file <(echo -h) --title x',
  ]
  for (const command of writes) assert.equal(isTrackerWrite(command), true, command)
  assert.equal(isTrackerWrite('gh issue create --title x --body "Run `"gh pr merge -h --merge`" first"', 'PowerShell'), true)
})

test('hook: quotes are read from the start of the command, so a gh that is only quoted asks for no help and hides no write', () => {
  const writes = [
    'git commit -m "Tooling: skip gh help requests" && gh pr create --title x --body "The hook now ignores --help and -h."',
    `echo 'gh x' && gh issue create --title 'Document the -h flag' --body y`,
    `node -e 'run("gh issue create --help")'`,
  ]
  for (const command of writes) assert.equal(isTrackerWrite(command), true, command)
  assert.equal(isTrackerWrite("gh issue edit 3 --body @'\nx\n'@\ngh issue edit 5 --title 'Hook ignores -h'", 'PowerShell'), true)
})

test('hook: a heredoc body is text handed to its command, so the gh writes and issues it only quotes do not count', () => {
  const writes = [
    "gh pr create --title x --body-file - <<'EOF'\nCloses #43\nEOF",
    "gh api graphql -F query=@- <<'EOF'\nmutation { addSubIssue(input: {}) { clientMutationId } }\nEOF",
    "cat > q.graphql <<'EOF'\nmutation { addSubIssue(input: {}) { clientMutationId } }\nEOF\ngh api graphql -F query=@q.graphql",
    "gh issue create --title x --body-file - <<'EOF'\nRun .claude/skills/groom-backlog/scripts/backlog.mjs plan first.\nEOF",
    'echo "a body goes in a <<EOF heredoc"\ngh issue edit 3 --add-label bug',
  ]
  const quotes = [
    "node - <<'EOF'\nedit('SKILL.md', 'Run `gh pr edit` once the body changes.')\nEOF",
    'cat > notes.md <<EOF\ngh issue close 7\nEOF',
    `git commit -m "$(cat <<'EOF'\nDocs: merge with gh pr merge --merge\nEOF\n)"`,
    "node - <<'EOF'\nrun('gh api -X POST repos/o/r/issues/1/sub_issues -F sub_issue_id=2')\nEOF",
    "git commit -F - <<-EOF\n\tTooling: then gh issue edit 3 --add-label bug\n\tEOF",
    'cat > notes.md <<"EOF"\ngh issue close 7\nEOF',
    'cat > notes.md <<\\EOF\ngh issue close 7\nEOF',
    `echo "<<X"; cat > notes.md <<'EOF'\ngh issue close 7\nEOF`,
  ]
  for (const command of writes) assert.equal(isTrackerWrite(command), true, command)
  for (const command of quotes) assert.equal(isTrackerWrite(command), false, command)
  assert.deepEqual(touchedIssues("gh pr create --body-file - <<'EOF'\nAfter gh issue edit 35, see https://github.com/o/r/issues/12\nEOF"), [])
})

test('hook: a PowerShell here-string body is text too, so the gh writes and issues it only quotes do not count', () => {
  const writes = [
    "gh pr create --title x --body @'\nCloses #149\n'@",
    "gh issue edit 3 --body @\"\nSee gh issue close 7\n\"@",
    "Set-Content notes.md @'\ngh issue close 7\n'@; gh issue edit 3 --add-label bug",
    "$q = @'\nmutation { addSubIssue(input: {}) { clientMutationId } }\n'@\ngh api graphql -f query=$q",
    "Set-Content notes.md @'\ngh issue close 7\n\"@",
    "gh issue comment 7 --body 'cc @'\ngh issue close 7",
  ]
  const quotes = [
    "git commit -m @'\nTooling: then gh pr edit 148 --body-file pr.md\n'@",
    'Set-Content notes.md @"\ngh issue close 7\n"@',
  ]
  for (const command of writes) assert.equal(isTrackerWrite(command, 'PowerShell'), true, command)
  for (const command of quotes) assert.equal(isTrackerWrite(command, 'PowerShell'), false, command)
  assert.deepEqual(touchedIssues("gh pr create --body @'\nAfter gh issue edit 35, see https://github.com/o/r/issues/12\n'@", 'PowerShell'), [])
  assert.deepEqual(touchedIssues("Set-Content notes.md @'\ngh issue close 7\n'@; gh issue edit 3 --add-label bug", 'PowerShell'), [3])
})

test('hook: the payload names the shell, so each command is read by its own shell\'s quoting', () => {
  const hook = fileURLToPath(new URL('../.claude/skills/groom-backlog/scripts/tracker-write.mjs', import.meta.url))
  const run = (tool_name, command) => spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name, tool_input: { command } }),
    encoding: 'utf8',
  }).stdout
  assert.equal(run('PowerShell', "git commit -m @'\nTooling: then gh pr edit 148\n'@"), '')
  assert.equal(run('Bash', "git commit -F - <<'EOF'\nTooling: then gh pr edit 148\nEOF"), '')
  const reminder = JSON.parse(run('PowerShell', "gh issue edit 149 --body @'\nSee gh issue close 7\n'@"))
  assert.match(reminder.hookSpecificOutput.additionalContext, /tracker just changed \(#149\)/)
})

test('hook: the touched issues are named when the command spells them', () => {
  assert.deepEqual(touchedIssues('gh issue edit 35 --add-label needs-info'), [35])
  assert.deepEqual(touchedIssues('gh api --method POST repos/o/r/issues/1/sub_issues -F sub_issue_id=42'), [1])
  assert.deepEqual(touchedIssues('gh pr merge 38 --squash'), [38])
  assert.deepEqual(touchedIssues('gh issue create --title "x"'), [])
})

const MERGE_DIFF = [
  'diff --git a/added.js b/added.js',
  'new file mode 100644',
  'index 0000000..8ba3a16',
  '--- /dev/null',
  '+++ b/added.js',
  '@@ -0,0 +1 @@',
  '+n',
  'diff --git a/gone.js b/gone.js',
  'deleted file mode 100644',
  'index 286c5f5..0000000',
  '--- a/gone.js',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-gone',
  'diff --git a/keep.js b/keep.js',
  'index 9405325..6d3c745 100644',
  '--- a/keep.js',
  '+++ b/keep.js',
  '@@ -0,0 +1 @@',
  '+import',
  '@@ -3 +4 @@ b',
  '--- a/c',
  '+C',
  '@@ -5,0 +7 @@ e',
  '+f',
  'diff --git a/old.js b/new.js',
  'similarity index 85%',
  'rename from old.js',
  'rename to new.js',
  'index 7a04ab3..8c3ea5f 100644',
  '--- a/old.js',
  '+++ b/new.js',
  '@@ -6,0 +7 @@ x6',
  '+x7',
  'diff --git a/moved.js b/kept-name.js',
  'similarity index 100%',
  'rename from moved.js',
  'rename to kept-name.js',
  '',
].join('\n')

test('citations: a diff moves the lines its hunks leave alone, and says which lines it rewrites', () => {
  const diff = parseDiff(MERGE_DIFF)
  const at = (path, start, end = start) => applyDiff(diff, { path, start, end })
  assert.deepEqual(at('keep.js', 1, 2), { path: 'keep.js', start: 2, end: 3 })
  assert.deepEqual(at('keep.js', 3), { path: 'keep.js', touched: true })
  assert.deepEqual(at('keep.js', 2, 4), { path: 'keep.js', touched: true })
  assert.deepEqual(at('keep.js', 4, 5), { path: 'keep.js', start: 5, end: 6 })
  assert.deepEqual(at('old.js', 1, 6), { path: 'new.js', start: 1, end: 6 })
  assert.deepEqual(at('moved.js', 4), { path: 'kept-name.js', start: 4, end: 4 })
  assert.deepEqual(at('gone.js', 1), { path: null })
  assert.deepEqual(at('untouched.js', 9, 12), { path: 'untouched.js', start: 9, end: 12 })
})

test('citations: lines inserted between two cited lines rewrite the passage, lines inserted next to it only move it', () => {
  const diff = parseDiff('diff --git a/f.js b/f.js\n--- a/f.js\n+++ b/f.js\n@@ -10,0 +11,2 @@\n+x\n+y\n')
  const at = (start, end) => applyDiff(diff, { path: 'f.js', start, end })
  assert.deepEqual(at(10, 11), { path: 'f.js', touched: true })
  assert.deepEqual(at(5, 10), { path: 'f.js', start: 5, end: 10 })
  assert.deepEqual(at(11, 12), { path: 'f.js', start: 13, end: 14 })
})

const cited = text => citationsIn(text).map(c => `${c.path}:${c.start}-${c.end}${c.replaces === undefined ? '' : ` replaces ${c.replaces}`}${c.deleted ? ' deleted' : ''}`)

test('citations: a path with a line or a range is a citation, wherever it sits in the text', () => {
  assert.deepEqual(cited('Le passage `server/app.js:6130-6133` (la fin des paiements), et src/pages/Aide.jsx:81 ici.'), [
    'server/app.js:6130-6133',
    'src/pages/Aide.jsx:81-81',
  ])
  assert.deepEqual(cited('À 10:30, voir `{ a:1 }`, #12:3, `server/app.js` et https://github.com/o/r/blob/main/server/app.js#L12.'), [])
})

test('citations: lines alone take the file cited or named just before them', () => {
  assert.deepEqual(cited('(`server/administration.js:31-50`, `:116-142`)'), [
    'server/administration.js:31-50',
    'server/administration.js:116-142',
  ])
  assert.deepEqual(cited('#60 supprime des lignes de `server/app.js`. Elles bougent : `:432` ; puis `src/admin/Classiques.jsx:299-311` et `:12`.'), [
    'server/app.js:432-432',
    'src/admin/Classiques.jsx:299-311',
    'src/admin/Classiques.jsx:12-12',
  ])
  assert.deepEqual(cited('Les lignes `:12-14` bougent.'), ['null:12-14'])
})

test('citations: a list after a file cites each of its lines and ranges, all in that file', () => {
  assert.deepEqual(cited('`server/support.js:121,183,227`, puis server/fantasy.js:89,645-676 et `:9-11,17-18`.'), [
    'server/support.js:121-121',
    'server/support.js:183-183',
    'server/support.js:227-227',
    'server/fantasy.js:89-89',
    'server/fantasy.js:645-676',
    'server/fantasy.js:9-11',
    'server/fantasy.js:17-18',
  ])
  assert.deepEqual(cited('`server/app.js:12`, 14 lignes plus bas, puis server/app.js:20, et `server/app.js:30,`.'), [
    'server/app.js:12-12',
    'server/app.js:20-20',
    'server/app.js:30-30',
  ])
  assert.deepEqual(cited('`server/a.js:1,5` → `:2,6`, puis `:8,9` → `:10` et `:12` → `:13,14`.'), [
    'server/a.js:1-1',
    'server/a.js:5-5',
    'server/a.js:2-2 replaces 0',
    'server/a.js:6-6 replaces 1',
    'server/a.js:8-8',
    'server/a.js:9-9',
    'server/a.js:10-10 replaces 4',
    'server/a.js:12-12',
    'server/a.js:13-13 replaces 7',
    'server/a.js:14-14',
  ])
})

test('citations: an arrow to « supprimé » marks the citation or list before it as gone for good, and the citation after it relocates nothing', () => {
  assert.deepEqual(cited([
    '- `server/fantasy.js:89,645-676` → supprimées par 5793b55 (#47), avec `server/app.js:12`.',
    '- `server/a.js:3` (la garde) → `supprimée`, et `:7` → Supprimé.',
    '- `server/app.js:1937-1940` → `:1903-1905` : le rattrapage a été supprimé, `:40` aussi.',
    '- `server/b.js:5`\n→ supprimé',
  ].join('\n')), [
    'server/fantasy.js:89-89 deleted',
    'server/fantasy.js:645-676 deleted',
    'server/app.js:12-12',
    'server/a.js:3-3 deleted',
    'server/a.js:7-7 deleted',
    'server/app.js:1937-1940',
    'server/app.js:1903-1905 replaces 5',
    'server/app.js:40-40',
    'server/b.js:5-5',
  ])
})

test('citations: a file named without its folder takes the folder the same text gives it', () => {
  assert.deepEqual(cited('`server/signalements.js:294-301` change, et `signalements.js:333-351` aussi. Puis `administration.js:400-431`.'), [
    'server/signalements.js:294-301',
    'server/signalements.js:333-351',
    'administration.js:400-431',
  ])
})

test('citations: an arrow, or « de … à … », relocates the citation before it', () => {
  assert.deepEqual(cited('Dans `server/app.js` : `:3180-3188` → `:3174-3182`, `:3386` → `:3380`. `:432` ne bouge pas.'), [
    'server/app.js:3180-3188',
    'server/app.js:3174-3182 replaces 0',
    'server/app.js:3386-3386',
    'server/app.js:3380-3380 replaces 2',
    'server/app.js:432-432',
  ])
  assert.deepEqual(cited('Dans `server/app.js` :\n- `:2063-2066` (`blobExploitable` témoin) → `:2058-2061`\n- `:5598` (export admin)\n→ `:5575`'), [
    'server/app.js:2063-2066',
    'server/app.js:2058-2061 replaces 0',
    'server/app.js:5598-5598',
    'server/app.js:5575-5575',
  ])
  assert.deepEqual(cited("- [F] L'interrupteur passe de `server/pilotage.js:32` à `server/pilotage.js:34`. Il reste à `server/pilotage.js:40`."), [
    'server/pilotage.js:32-32',
    'server/pilotage.js:34-34 replaces 0',
    'server/pilotage.js:40-40',
  ])
  assert.deepEqual(cited('`server/a.js:1` (voir `src/b.js`) → `:2`, puis `:7`.'), [
    'server/a.js:1-1',
    'server/a.js:2-2 replaces 0',
    'server/a.js:7-7',
  ])
})

test('citations: a commit named on the line of a citation is the one its lines are read on', () => {
  const text = [
    "- [F] `test/storage-buy-orders.test.js:50` définit `call`, la variante de `test/dead-storage-keys.test.js:28`. Branche `storage/buy-orders`, commit db69a39.",
    '- [F] Puis `server/app.js:12` (Commit `85a524e`), et `server/app.js:40` sans commit.',
    '- [I] Les commits 62c56ad et d7bfa25 ne nomment rien : `server/app.js:7`.',
  ].join('\n')
  assert.deepEqual(citationsIn(text).map(c => [c.token, c.commit]), [
    ['test/storage-buy-orders.test.js:50', 'db69a39'],
    ['test/dead-storage-keys.test.js:28', 'db69a39'],
    ['server/app.js:12', '85a524e'],
    ['server/app.js:40', '85a524e'],
    ['server/app.js:7', undefined],
  ])
})

test('citations: a code block quotes code, not citations', () => {
  assert.deepEqual(cited('Voir `server/app.js:12`.\n\n```js\nconst at = `${file}:${line}` // server/app.js:40\n```\n~~~\nsrc/a.js:3\n~~~\nEt `src/b.js:7`.'), [
    'server/app.js:12-12',
    'src/b.js:7-7',
  ])
})

const numbered = (name, count) => Array.from({ length: count }, (_, i) => `${name} ${i + 1}`)

function fakeGit(commits, diffs) {
  const commit = sha => {
    const found = commits.find(c => c.sha === sha)
    if (!found) throw new Error(`no commit ${sha}`)
    return found
  }
  return {
    history: commits.filter(c => !c.branch).reverse().map(c => ({ sha: c.sha, time: c.time })),
    lines: (sha, path) => commit(sha).files[path] ?? null,
    paths: sha => Object.keys(commit(sha).files),
    subject: sha => commit(sha).subject ?? 'Tests: a commit',
    resolve: rev => commits.find(c => c.sha.startsWith(rev))?.sha ?? null,
    diff: (from, to) => {
      if (!(`${from}..${to}` in diffs)) throw new Error(`no diff ${from}..${to}`)
      return diffs[`${from}..${to}`]
    },
  }
}

const fileDiff = (path, ...hunks) => [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`, ...hunks].join('\n')

const PILOTAGE = numbered('pilotage', 40)
const GROUPES = numbered('groupes', 30)
const MERGED = {
  'server/pilotage.js': ['import a', 'import b', ...PILOTAGE.slice(0, 9), 'rewritten 10', ...PILOTAGE.slice(10)],
  'src/pages/Groupes.jsx': ['import c', ...GROUPES],
  'server/groupes.js': numbered('groupes serveur', 30),
}
const MERGE_COMMITS = [
  { sha: 'a1a1a1a1', time: '2026-10-10T10:00:00Z', files: { 'server/pilotage.js': PILOTAGE, 'src/pages/Groupes.jsx': GROUPES, 'server/groupes.js': MERGED['server/groupes.js'], 'README.md': ['old'] } },
  { sha: 'b2b2b2b2', time: '2026-10-12T10:00:00Z', files: { 'server/pilotage.js': PILOTAGE, 'src/pages/Groupes.jsx': GROUPES, 'server/groupes.js': MERGED['server/groupes.js'], 'README.md': ['new'] } },
  { sha: 'c3c3c3c3', time: '2026-10-14T13:00:00Z', subject: 'Merge pull request #141 from PothieuG/storage/steering-cluster', files: { ...MERGED, 'README.md': ['new'] } },
]
const README_DIFF = fileDiff('README.md', '@@ -1 +1 @@', '-old', '+new')
const MERGE_141_DIFF = [
  fileDiff('server/pilotage.js', '@@ -0,0 +1,2 @@', '+import a', '+import b', '@@ -10 +12 @@', '-pilotage 10', '+rewritten 10'),
  fileDiff('src/pages/Groupes.jsx', '@@ -0,0 +1 @@', '+import c'),
].join('\n')
const MERGE_DIFFS = { 'a1a1a1a1..b2b2b2b2': README_DIFF, 'b2b2b2b2..c3c3c3c3': MERGE_141_DIFF }
const mergeRepo = () => fakeGit(MERGE_COMMITS, MERGE_DIFFS)

const movedLines = result => result.ops.map(op => op.body.split('\n').filter(line => line.startsWith('- ')))

const ticket = (number, body, fields = {}) => ({ number, body, createdAt: '2026-10-11T09:00:00Z', lastEditedAt: null, comments: [], ...fields })

test('citations: after a merge, each ticket whose cited lines it moves gets one comment, checked line by line', () => {
  const result = relocations({
    git: mergeRepo(),
    merge: 'c3c3c3c3',
    issues: [
      ticket(45, "- [F] L'interrupteur `fantasy` est à `server/pilotage.js:32`, et sa garde à `:33-35`."),
      ticket(124, '`src/pages/Groupes.jsx:23` et `server/groupes.js:22`.'),
      ticket(130, 'Rien ici ne bouge : `server/groupes.js:1-4`, `README.md:1`.'),
    ],
  })
  assert.deepEqual(result.ops, [
    {
      op: 'comment',
      issue: 45,
      why: 'cited lines moved by #141',
      body: [
        'Les lignes citées ici bougent avec #141 (c3c3c3c). Vérifié ligne à ligne contre b2b2b2b : chaque passage est identique à sa nouvelle place.',
        '',
        '- `server/pilotage.js:32` → `:34` : `pilotage 32`',
        '- `server/pilotage.js:33-35` → `:35-37` : `pilotage 33`',
        '',
      ].join('\n'),
    },
    {
      op: 'comment',
      issue: 124,
      why: 'cited lines moved by #141',
      body: [
        'Les lignes citées ici bougent avec #141 (c3c3c3c). Vérifié ligne à ligne contre b2b2b2b : chaque passage est identique à sa nouvelle place.',
        '',
        '- `src/pages/Groupes.jsx:23` → `:24` : `groupes 23`',
        '',
      ].join('\n'),
    },
  ])
  assert.deepEqual(result.judgment, [])
})

test('citations: a passage the merge rewrites, or that is found twice once rewritten around, goes to judgment, never to a comment', () => {
  const repeated = [...numbered('caisse', 9), 'old 10', '})', ...numbered('suite', 5), '})']
  const git = fakeGit([
    { sha: 'b2b2b2b2', time: '2026-10-12T10:00:00Z', files: { 'server/pilotage.js': PILOTAGE, 'server/caisses.js': repeated } },
    { sha: 'c3c3c3c3', time: '2026-10-14T13:00:00Z', subject: 'Storage: rename caisses (#142)', files: { ...MERGED, 'server/caisses.js': [...numbered('caisse', 9), 'new 10', '})', ...numbered('suite', 5), '})'] } },
  ], {
    'b2b2b2b2..c3c3c3c3': [
      fileDiff('server/pilotage.js', '@@ -0,0 +1,2 @@', '+import a', '+import b', '@@ -10 +12 @@', '-pilotage 10', '+rewritten 10'),
      fileDiff('server/caisses.js', '@@ -10,2 +10,2 @@', '-old 10', '-})', '+new 10', '+})'),
    ].join('\n'),
  })
  const result = relocations({
    git,
    merge: 'c3c3c3c3',
    issues: [ticket(140, 'Le défaut : `server/pilotage.js:10`. La fin : `server/caisses.js:11`, et `server/pilotage.js:9-10`.', { createdAt: '2026-10-13T09:00:00Z' })],
  })
  assert.deepEqual(result.ops, [])
  assert.deepEqual(result.judgment, [
    { kind: 'unresolved-citation', issue: 140, detail: '`server/pilotage.js:10`: rewritten by #142' },
    { kind: 'unresolved-citation', issue: 140, detail: '`server/caisses.js:11`: found 2 times on c3c3c3c' },
    { kind: 'unresolved-citation', issue: 140, detail: '`server/pilotage.js:9-10`: rewritten by #142' },
  ])
})

test('citations: once its comment is posted, planning the merge again asks for nothing more', () => {
  const issues = [ticket(45, "L'interrupteur est à `server/pilotage.js:32`.")]
  const first = relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues })
  issues[0].comments.push({ body: first.ops[0].body, createdAt: '2026-10-16T08:00:00Z', lastEditedAt: null })
  assert.deepEqual(relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues }), { ops: [], judgment: [] })
})

test('citations: a citation an arrow already relocated is followed from its new place, never twice', () => {
  const issues = [ticket(36, '`server/pilotage.js:32` et `src/pages/Groupes.jsx:20-21`.', {
    createdAt: '2026-10-10T12:00:00Z',
    comments: [{ body: 'Les lignes de `server/pilotage.js` bougent avec #58 : `:32` → `:32`, vérifié.', createdAt: '2026-10-12T12:00:00Z', lastEditedAt: null }],
  })]
  const result = relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues })
  assert.deepEqual(movedLines(result), [[
    '- `src/pages/Groupes.jsx:20-21` → `:21-22` : `groupes 20`',
    '- `server/pilotage.js:32` → `:34` : `pilotage 32`',
  ]])
})

test('citations: a later text that cites the same lines again restates them, so the older citation is neither relocated nor judged', () => {
  const result = relocations({
    git: mergeRepo(),
    merge: 'c3c3c3c3',
    issues: [ticket(36, 'Le garde de `server/pilotage.js:10` et la cible `server/pilotage.js:32`.', {
      comments: [{ body: 'Le garde de `server/pilotage.js:10` reste armé, et la cible de `server/pilotage.js:32` est devenue le public.', createdAt: '2026-10-14T14:00:00Z', lastEditedAt: null }],
    })],
  })
  assert.deepEqual(result, { ops: [], judgment: [] })
})

test('citations: a passage cited twice, or relocated in free prose, gets one line, from its latest citation', () => {
  const issues = [ticket(9, '`server/pilotage.js:31-32`, et plus loin `server/pilotage.js:31-32`.', {
    comments: [{ body: 'Ce passage est désormais à `server/pilotage.js:31-32`, inchangé.', createdAt: '2026-10-12T12:00:00Z', lastEditedAt: null }],
  })]
  const result = relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues })
  assert.deepEqual(movedLines(result), [[
    '- `server/pilotage.js:31-32` → `:33-34` : `pilotage 31`',
  ]])
})

const laterRepo = () => fakeGit([
  ...MERGE_COMMITS,
  { sha: 'd4d4d4d4', time: '2026-10-15T09:00:00Z', subject: 'Merge pull request #143 from PothieuG/x', files: { ...MERGED, 'server/pilotage.js': ['header', ...MERGED['server/pilotage.js']], 'README.md': ['new'] } },
], {
  ...MERGE_DIFFS,
  'c3c3c3c3..d4d4d4d4': fileDiff('server/pilotage.js', '@@ -0,0 +1 @@', '+header'),
  'a1a1a1a1..c3c3c3c3': [README_DIFF, MERGE_141_DIFF].join('\n'),
  'a1a1a1a1..d4d4d4d4': [
    README_DIFF,
    fileDiff('server/pilotage.js', '@@ -0,0 +1,3 @@', '+header', '+import a', '+import b', '@@ -10 +13 @@', '-pilotage 10', '+rewritten 10'),
    fileDiff('src/pages/Groupes.jsx', '@@ -0,0 +1 @@', '+import c'),
  ].join('\n'),
})

test('citations: a comment this script posted is read on the commit it names, even when posted after a later merge', () => {
  const issues = [ticket(45, "L'interrupteur est à `server/pilotage.js:32`.")]
  const first = relocations({ git: laterRepo(), merge: 'c3c3c3c3', issues })
  issues[0].comments.push({ body: first.ops[0].body, createdAt: '2026-10-15T10:00:00Z', lastEditedAt: null })
  const second = relocations({ git: laterRepo(), merge: 'd4d4d4d4', issues })
  assert.deepEqual(movedLines(second), [[
    '- `server/pilotage.js:34` → `:35` : `pilotage 32`',
  ]])
})

test('citations: every line of a comment this script posted is read on the commit its header names, even a line that names another', () => {
  const issues = [ticket(45, "L'interrupteur est à `server/pilotage.js:32`.")]
  const first = relocations({ git: laterRepo(), merge: 'c3c3c3c3', issues })
  const settled = '- `server/pilotage.js:10` → `:12`, réécrite par le commit b2b2b2b.'
  issues[0].comments.push({ body: `${first.ops[0].body}${settled}\n`, createdAt: '2026-10-15T10:00:00Z', lastEditedAt: null })
  assert.deepEqual(movedLines(relocations({ git: laterRepo(), merge: 'd4d4d4d4', issues })), [[
    '- `server/pilotage.js:34` → `:35` : `pilotage 32`',
    '- `server/pilotage.js:12` → `:13` : `rewritten 10`',
  ]])
})

test('citations: a citation written after the merge is not its doing; one that had already moved says so', () => {
  const result = relocations({
    git: laterRepo(),
    merge: 'd4d4d4d4',
    issues: [ticket(64, '`server/pilotage.js:20`, puis `server/pilotage.js:32`.', {
      comments: [{ body: 'Après #143 : `server/pilotage.js:5`.', createdAt: '2026-10-15T12:00:00Z', lastEditedAt: null }],
    })],
  })
  assert.deepEqual(movedLines(result), [[
    '- `server/pilotage.js:20` → `:23` (déjà à la ligne 22 avant #143) : `pilotage 20`',
    '- `server/pilotage.js:32` → `:35` (déjà à la ligne 34 avant #143) : `pilotage 32`',
  ]])
  const afterward = relocations({
    git: laterRepo(),
    merge: 'c3c3c3c3',
    issues: [ticket(65, 'Le défaut.', { comments: [{ body: 'Après #143, il est à `server/pilotage.js:35`.', createdAt: '2026-10-15T12:00:00Z', lastEditedAt: null }] })],
  })
  assert.deepEqual(afterward, { ops: [], judgment: [] })
})

test('citations: a citation added by an edit of the body is dated by that edit', () => {
  const body = 'Le défaut.\n\nAjouté après #141 : `server/pilotage.js:34`.'
  const versions = [
    { body, editedAt: '2026-10-14T15:00:00Z' },
    { body: 'Le défaut, à `server/pilotage.js:340`.', editedAt: '2026-10-11T09:00:00Z' },
  ]
  const issues = [ticket(77, body, { id: 'I_77', lastEditedAt: '2026-10-14T15:00:00Z' })]
  const asked = []
  const result = relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues, versionsOf: text => (asked.push(text.id), versions) })
  assert.deepEqual(result, { ops: [], judgment: [] })
  assert.deepEqual(asked, ['I_77'])
})

test('citations: a line added to a list by an edit is dated by that edit, the lines already there keep their date', () => {
  const body = '`server/pilotage.js:32,36` : la garde, puis la cible ajoutée après #141.'
  const versions = [
    { body, editedAt: '2026-10-14T15:00:00Z' },
    { body: '`server/pilotage.js:32` : la garde.', editedAt: '2026-10-11T09:00:00Z' },
  ]
  const issues = [ticket(78, body, { id: 'I_78', lastEditedAt: '2026-10-14T15:00:00Z' })]
  assert.deepEqual(movedLines(relocations({ git: mergeRepo(), merge: 'c3c3c3c3', issues, versionsOf: () => versions })), [[
    '- `server/pilotage.js:32` → `:34` : `pilotage 32`',
  ]])
})

test('citations: a file named without its folder is the one file of that name, and a merge renames what it cites', () => {
  const pilotage = MERGED['server/pilotage.js']
  const git = fakeGit([
    { sha: 'b2b2b2b2', time: '2026-10-12T10:00:00Z', files: { 'server/pilotage.js': PILOTAGE, 'server/index.js': ['a'], 'src/index.js': ['b'] } },
    { sha: 'c3c3c3c3', time: '2026-10-14T13:00:00Z', files: { 'server/steering.js': pilotage, 'server/index.js': ['a', 'c'], 'src/index.js': ['b'] } },
  ], {
    'b2b2b2b2..c3c3c3c3': [
      'diff --git a/server/pilotage.js b/server/steering.js',
      'similarity index 95%',
      'rename from server/pilotage.js',
      'rename to server/steering.js',
      '--- a/server/pilotage.js',
      '+++ b/server/steering.js',
      '@@ -0,0 +1,2 @@',
      '+import a',
      '+import b',
      '@@ -10 +12 @@',
      '-pilotage 10',
      '+rewritten 10',
      fileDiff('server/index.js', '@@ -1,0 +2 @@', '+c'),
    ].join('\n'),
  })
  const result = relocations({ git, merge: 'c3c3c3c3', issues: [ticket(8, '`pilotage.js:32` et `index.js:1`.', { createdAt: '2026-10-13T09:00:00Z' })] })
  assert.deepEqual(result.ops.map(op => op.body.split('\n').slice(0, 1).concat(op.body.split('\n').filter(line => line.startsWith('- ')))), [[
    'Les lignes citées ici bougent avec le commit c3c3c3c. Vérifié ligne à ligne contre b2b2b2b : chaque passage est identique à sa nouvelle place.',
    '- `server/pilotage.js:32` → `server/steering.js:34` : `pilotage 32`',
  ]])
  assert.deepEqual(result.judgment, [{ kind: 'unresolved-citation', issue: 8, detail: '`index.js:1`: 2 files named index.js on b2b2b2b' }])
})

test('citations: a sweep relocates every citation that moved since it was written, and says where each was read', () => {
  const result = relocations({
    git: laterRepo(),
    issues: [ticket(11, '`server/pilotage.js:32`, `server/pilotage.js:10`, `src/pages/Groupes.jsx:5`, `server/groupes.js:3`, `:7` et `README.md:1`.', {
      createdAt: '2026-10-10T12:00:00Z',
      comments: [{ body: 'Puis `server/pilotage.js:2`, et `:4-5` seuls.', createdAt: '2026-10-14T14:00:00Z', lastEditedAt: null }],
    })],
  })
  assert.deepEqual(result.ops, [{
    op: 'comment',
    issue: 11,
    why: 'cited lines moved since they were written',
    body: [
      "Les lignes citées ici ont bougé depuis qu'elles ont été écrites. Chaque passage est vérifié ligne à ligne, du commit où il a été cité jusqu'à d4d4d4d.",
      '',
      '- `server/pilotage.js:32` → `:35` (cité sur a1a1a1a) : `pilotage 32`',
      '- `src/pages/Groupes.jsx:5` → `:6` (cité sur a1a1a1a) : `groupes 5`',
      '- `server/pilotage.js:2` → `:3` (cité sur c3c3c3c) : `import b`',
      '- `server/pilotage.js:4-5` → `:5-6` (cité sur c3c3c3c) : `pilotage 2`',
      '',
    ].join('\n'),
  }])
  assert.deepEqual(result.judgment, [
    { kind: 'unresolved-citation', issue: 11, detail: '`server/pilotage.js:10`: rewritten since a1a1a1a' },
    { kind: 'unresolved-citation', issue: 11, detail: '`README.md:1`: rewritten since a1a1a1a' },
  ])
})

test('citations: a passage declared gone settles its older citations, and no lines are read for it', () => {
  const result = relocations({
    git: laterRepo(),
    issues: [ticket(21, 'La garde `server/pilotage.js:10,32`.', {
      createdAt: '2026-10-10T12:00:00Z',
      comments: [{ body: '- `server/pilotage.js:10` → supprimée par #141, sans successeur.', createdAt: '2026-10-14T14:00:00Z', lastEditedAt: null }],
    })],
  })
  assert.deepEqual(movedLines(result), [[
    '- `server/pilotage.js:32` → `:35` (cité sur a1a1a1a) : `pilotage 32`',
  ]])
  assert.deepEqual(result.judgment, [])
})

const APP = numbered('app', 30)
const BUY = numbered('buy', 20)
const branchRepo = () => fakeGit([
  { sha: 'b2b2b2b2', time: '2026-10-12T10:00:00Z', files: { 'server/app.js': APP } },
  { sha: 'e5e5e5e5', time: '2026-10-12T15:00:00Z', branch: 'storage/buy-orders', files: { 'server/app.js': ['import buy', ...APP], 'test/buy.test.js': BUY } },
  { sha: 'c3c3c3c3', time: '2026-10-14T13:00:00Z', subject: 'Merge pull request #73 from PothieuG/storage/buy-orders', files: { 'server/app.js': ['import buy', ...APP], 'test/buy.test.js': ['setup a', 'setup b', ...BUY] } },
], {
  'b2b2b2b2..c3c3c3c3': [
    fileDiff('server/app.js', '@@ -0,0 +1 @@', '+import buy'),
    ['diff --git a/test/buy.test.js b/test/buy.test.js', 'new file mode 100644', '--- /dev/null', '+++ b/test/buy.test.js', '@@ -0,0 +1,22 @@', '+setup a'].join('\n'),
  ].join('\n'),
  'e5e5e5e5..c3c3c3c3': fileDiff('test/buy.test.js', '@@ -0,0 +1,2 @@', '+setup a', '+setup b'),
  'e5e5e5e5..b2b2b2b2': [
    fileDiff('server/app.js', '@@ -1 +0,0 @@', '-import buy'),
    ['diff --git a/test/buy.test.js b/test/buy.test.js', 'deleted file mode 100644', '--- a/test/buy.test.js', '+++ /dev/null', '@@ -1,20 +0,0 @@', '-buy 1'].join('\n'),
  ].join('\n'),
})
const branchTicket = () => ticket(70, 'Le défaut.', {
  comments: [{
    body: [
      '- [F] `test/buy.test.js:5` définit `call`, appelé à `server/app.js:10`. Branche `storage/buy-orders`, commit e5e5e5e.',
      '- [F] `server/app.js:20` est sur `main`.',
      "- [F] `server/app.js:3`, commit 0badc0d, vient d'une branche supprimée.",
    ].join('\n'),
    createdAt: '2026-10-12T16:00:00Z',
    lastEditedAt: null,
  }],
})

test('citations: a sweep reads a citation on the commit its line names, a branch included, and follows it to main', () => {
  const result = relocations({ git: branchRepo(), issues: [branchTicket()] })
  assert.deepEqual(result.ops, [{
    op: 'comment',
    issue: 70,
    why: 'cited lines moved since they were written',
    body: [
      "Les lignes citées ici ont bougé depuis qu'elles ont été écrites. Chaque passage est vérifié ligne à ligne, du commit où il a été cité jusqu'à c3c3c3c.",
      '',
      '- `test/buy.test.js:5` → `:7` (cité sur e5e5e5e) : `buy 5`',
      '- `server/app.js:20` → `:21` (cité sur b2b2b2b) : `app 20`',
      '',
    ].join('\n'),
  }])
  assert.deepEqual(result.judgment, [{ kind: 'unresolved-citation', issue: 70, detail: '`server/app.js:3`: commit 0badc0d not found' }])
})

test('citations: the merge that brings a branch to main moves the lines cited on it, a file it adds included', () => {
  const result = relocations({ git: branchRepo(), merge: 'c3c3c3c3', issues: [branchTicket()] })
  assert.deepEqual(result.ops.map(op => op.body), [[
    'Les lignes citées ici bougent avec #73 (c3c3c3c). Vérifié ligne à ligne contre b2b2b2b : chaque passage est identique à sa nouvelle place.',
    '',
    '- `test/buy.test.js:5` → `:7` (cité sur e5e5e5e) : `buy 5`',
    '- `server/app.js:20` → `:21` : `app 20`',
    '',
  ].join('\n')])
  assert.deepEqual(result.judgment, [{ kind: 'unresolved-citation', issue: 70, detail: '`server/app.js:3`: commit 0badc0d not found' }])
})

test('citations: the excerpt shows the first line of the passage as code, whatever it holds', () => {
  const lines = ['', '  const at = `${a}`', 'x'.repeat(80), 'voir server/app.js:12', '}\rimport {\ta }', '// depuis le commit d848ba2']
  const git = fakeGit([
    { sha: 'b2b2b2b2', time: '2026-10-12T10:00:00Z', files: { 'src/a.js': lines } },
    { sha: 'c3c3c3c3', time: '2026-10-14T13:00:00Z', files: { 'src/a.js': ['import', ...lines] } },
  ], { 'b2b2b2b2..c3c3c3c3': fileDiff('src/a.js', '@@ -0,0 +1 @@', '+import') })
  const result = relocations({ git, merge: 'c3c3c3c3', issues: [ticket(1, '`src/a.js:1-2`, `src/a.js:3`, `src/a.js:4`, `src/a.js:5`, `src/a.js:6`.', { createdAt: '2026-10-13T09:00:00Z' })] })
  assert.deepEqual(result.ops[0].body.split('\n').filter(line => line.startsWith('- ')), [
    '- `src/a.js:1-2` → `:2-3` : `` const at = `${a}` ``',
    `- \`src/a.js:3\` → \`:4\` : \`${'x'.repeat(59)}…\``,
    '- `src/a.js:4` → `:5`',
    '- `src/a.js:5` → `:6` : `} import { a }`',
    '- `src/a.js:6` → `:7`',
  ])
})

test('citations: the git reader follows a merge commit of a real repository, renames included', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'groom-citations-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const run = (args, date) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false', ...args], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  })
  const write = (file, lines) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), `${lines.join('\n')}\n`)
  }
  run(['init', '-q', '-b', 'main'])
  write('server/app.js', numbered('app', 10))
  write('src/cartes.js', numbered('carte', 10))
  run(['add', '.'])
  run(['commit', '-q', '--no-verify', '-m', 'Cards: first'], '2026-10-10T10:00:00Z')
  run(['switch', '-q', '-c', 'feature'])
  write('server/app.js', ['import a', 'import b', ...numbered('app', 10)])
  run(['mv', 'src/cartes.js', 'src/cards.js'])
  write('src/cards.js', ['card 1', ...numbered('carte', 10).slice(1)])
  run(['add', '.'])
  run(['commit', '-q', '--no-verify', '-m', 'Cards: rename'], '2026-10-11T10:00:00Z')
  run(['switch', '-q', 'main'])
  run(['merge', '-q', '--no-ff', '--no-verify', '-m', 'Merge pull request #7 from o/feature', 'feature'], '2026-10-12T10:00:00Z')

  const git = gitReader(dir, 'main')
  const merge = git.resolve('main')
  assert.equal(git.history.length, 2)
  const result = relocations({ git, merge, issues: [ticket(3, '`server/app.js:5`, `src/cartes.js:3-4` et `cartes.js:1`.')] })
  assert.deepEqual(movedLines(result), [[
    '- `server/app.js:5` → `:7` : `app 5`',
    '- `src/cartes.js:3-4` → `src/cards.js:3-4` : `carte 3`',
  ]])
  assert.deepEqual(result.judgment, [{ kind: 'unresolved-citation', issue: 3, detail: '`src/cartes.js:1`: rewritten by #7' }])
})

test('an outside blocker may follow the Part of line of a sub-issue', () => {
  const body = 'Part of #1\n\nBloqué : réponse du staff. Suite.'
  assert.equal(externalBlocker(body), 'réponse du staff')
  assert.equal(desiredStatus(issue(2, { parent: 1, body }), () => undefined), 'Blocked')
  assert.equal(externalBlocker('Part of #1\n\nLe reste du ticket.'), null)
})
