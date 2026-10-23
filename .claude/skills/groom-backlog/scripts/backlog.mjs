import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { plan, describe, withPartOf, checkConventions, WAITING_ON, SIZE } from './plan.mjs'
import { relocations } from './citations.mjs'

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(SKILL_DIR, '../../..')
const CONFIG_FILE = path.join(SKILL_DIR, 'config.json')
const OUTPUT_DIR = path.join(os.tmpdir(), 'groom-backlog')

export function loadConfig(file = CONFIG_FILE) {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'))
  checkConventions(config)
  return config
}

export function projectLocation(url) {
  const match = String(url ?? '').match(/^https:\/\/github\.com\/(users|orgs)\/([^/\s)]+)\/projects\/(\d+)$/)
  if (!match) throw new Error(`"project" in config.json must be a project URL, not ${JSON.stringify(url)}`)
  return { url, ownerKind: match[1] === 'orgs' ? 'organization' : 'user', login: match[2], number: Number(match[3]) }
}

function errorMessages(output) {
  try {
    return JSON.parse(output).errors?.map(error => error.message).join('; ')
  } catch {
    return undefined
  }
}

function gh(args) {
  try {
    return execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    const detail = errorMessages(error.stdout) || [error.stderr, error.stdout].filter(Boolean).join('\n').trim()
    throw new Error(detail || error.message)
  }
}

function graphql(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [name, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue
    args.push(typeof value === 'string' ? '-f' : '-F', `${name}=${value}`)
  }
  const output = gh(args)
  const errors = errorMessages(output)
  if (errors) throw new Error(errors)
  return JSON.parse(output).data
}

export function gitReader(cwd, tip) {
  const git = args => execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  const attempt = args => {
    try {
      return git(args)
    } catch {
      return null
    }
  }
  const history = git(['log', '--first-parent', '--format=%H %cI', tip]).trim().split('\n').map(line => {
    const [sha, time] = line.split(' ')
    return { sha, time }
  })
  return {
    history,
    lines(sha, path) {
      const text = attempt(['show', `${sha}:${path}`])
      return text === null ? null : text.replace(/\r?\n$/, '').split(/\r?\n/)
    },
    paths: sha => git(['ls-tree', '-r', '--name-only', sha]).split('\n').filter(Boolean),
    subject: sha => git(['log', '-1', '--format=%s', sha]).trim(),
    resolve: rev => attempt(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`])?.trim() || null,
    diff: (from, to) => git(['diff', '-U0', '-M', '--no-color', '--no-ext-diff', '--no-textconv', '--src-prefix=a/', '--dst-prefix=b/', from, to]),
  }
}

function trackerLocation(config) {
  const { owner, name } = JSON.parse(gh(['repo', 'view', '--json', 'owner,name']))
  return { owner: owner.login, name, project: projectLocation(config.project) }
}

const FIELD_VALUES = `nodes {
  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
  ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
}`

const REPOSITORY_QUERY = `query($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    id
    labels(first: 100) { nodes { id name } }
    milestones(first: 50, states: OPEN) { nodes { id title } }
    pullRequests(first: 50, states: OPEN) { nodes { number title closingIssuesReferences(first: 10) { nodes { number } } } }
    issues(first: 50, after: $cursor, states: OPEN, orderBy: { field: CREATED_AT, direction: ASC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id number title state body createdAt lastEditedAt updatedAt
        labels(first: 20) { nodes { name } }
        comments(last: 100) { nodes { id body createdAt lastEditedAt } }
        milestone { title }
        assignees(first: 10) { nodes { login } }
        parent { number }
        subIssues(first: 50) { nodes { number state } }
        blockedBy(first: 20) { nodes { number state } }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: false) { nodes { number } }
        projectItems(first: 10, includeArchived: false) { nodes { id project { id } fieldValues(first: 30) { ${FIELD_VALUES} } } }
      }
    }
  }
}`

const CLOSED_ISSUES_QUERY = `query($owner: String!, $name: String!, $since: DateTime!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, states: CLOSED, filterBy: { since: $since }, orderBy: { field: CREATED_AT, direction: ASC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title stateReason closedAt
        labels(first: 20) { nodes { name } }
        subIssues(first: 50) { nodes { number state } }
        comments(last: 100) { nodes { body } }
      }
    }
  }
}`

const projectQuery = ownerKind => `query($login: String!, $number: Int!, $cursor: String) {
  owner: ${ownerKind}(login: $login) {
    projectV2(number: $number) {
      id
      fields(first: 50) {
        nodes {
          ... on ProjectV2FieldCommon { id name dataType }
          ... on ProjectV2SingleSelectField { options { id name } }
        }
      }
      items(first: 100, after: $cursor, orderBy: { field: POSITION, direction: ASC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content { ... on Issue { number state repository { nameWithOwner } } }
          fieldValues(first: 30) { ${FIELD_VALUES} }
        }
      }
    }
  }
}`

function paginate(fetchPage) {
  const nodes = []
  let cursor = null
  for (;;) {
    const page = fetchPage(cursor)
    nodes.push(...page.nodes)
    if (!page.pageInfo.hasNextPage) return nodes
    cursor = page.pageInfo.endCursor
  }
}

export function boardItems({ repoName, projectId, itemNodes, issueNodes }) {
  const items = []
  const itemIds = {}
  const add = (number, state, node) => {
    const values = Object.fromEntries(node.fieldValues.nodes.filter(value => value.field).map(value => [value.field.name, value.name ?? value.text]))
    items.push({
      issue: number,
      state,
      status: values.Status ?? null,
      priority: values.Priority ?? null,
      waitingOn: values[WAITING_ON] ?? null,
      size: values[SIZE] ?? null,
    })
    itemIds[number] = node.id
  }
  for (const node of itemNodes) {
    if (node.content?.repository?.nameWithOwner === repoName) add(node.content.number, node.content.state, node)
  }
  for (const issue of issueNodes) {
    const node = issue.projectItems.nodes.find(item => item.project.id === projectId)
    if (node && !(issue.number in itemIds)) add(issue.number, issue.state, node)
  }
  return { items, itemIds }
}

function takeSnapshot(config = loadConfig()) {
  const where = trackerLocation(config)
  let repository
  const issueNodes = paginate(cursor => {
    repository = graphql(REPOSITORY_QUERY, { owner: where.owner, name: where.name, cursor }).repository
    return repository.issues
  })
  const closedNodes = paginate(cursor =>
    graphql(CLOSED_ISSUES_QUERY, { owner: where.owner, name: where.name, since: config.closingCommentSince, cursor }).repository.issues)
  let project
  const itemNodes = paginate(cursor => {
    project = graphql(projectQuery(where.project.ownerKind), { login: where.project.login, number: where.project.number, cursor }).owner.projectV2
    return project.items
  })

  const fields = {}
  const fieldIds = {}
  for (const field of project.fields.nodes) {
    if (field.dataType === 'SINGLE_SELECT') {
      fields[field.name] = field.options.map(option => option.name)
      fieldIds[field.name] = { id: field.id, options: Object.fromEntries(field.options.map(option => [option.name, option.id])) }
    } else if (field.dataType === 'TEXT') {
      fields[field.name] = 'TEXT'
      fieldIds[field.name] = { id: field.id }
    }
  }

  const { items, itemIds } = boardItems({ repoName: `${where.owner}/${where.name}`, projectId: project.id, itemNodes, issueNodes })

  return {
    takenAt: new Date().toISOString(),
    repo: { owner: where.owner, name: where.name },
    project: { url: where.project.url, fields },
    issues: issueNodes.map(node => ({
      number: node.number,
      title: node.title,
      state: node.state,
      body: node.body,
      labels: node.labels.nodes.map(label => label.name),
      milestone: node.milestone?.title ?? null,
      assignees: node.assignees.nodes.map(user => user.login),
      parent: node.parent?.number ?? null,
      subIssues: node.subIssues.nodes,
      blockedBy: node.blockedBy.nodes,
      linkedOpenPullRequests: node.closedByPullRequestsReferences.nodes.map(pr => pr.number),
      createdAt: node.createdAt,
      lastEditedAt: node.lastEditedAt,
      updatedAt: node.updatedAt,
      comments: node.comments.nodes,
    })),
    items,
    closedIssues: closedNodes.map(node => ({
      number: node.number,
      title: node.title,
      stateReason: node.stateReason,
      closedAt: node.closedAt,
      labels: node.labels.nodes.map(label => label.name),
      subIssues: node.subIssues.nodes,
      comments: node.comments.nodes.map(comment => comment.body),
    })),
    openPullRequests: repository.pullRequests.nodes.map(pr => ({
      number: pr.number,
      title: pr.title,
      closes: pr.closingIssuesReferences.nodes.map(issue => issue.number),
    })),
    ids: {
      repository: repository.id,
      project: project.id,
      issues: Object.fromEntries(issueNodes.map(node => [node.number, node.id])),
      items: itemIds,
      labels: Object.fromEntries(repository.labels.nodes.map(label => [label.name, label.id])),
      milestones: Object.fromEntries(repository.milestones.nodes.map(milestone => [milestone.title, milestone.id])),
      fields: fieldIds,
    },
  }
}

function save(kind, data) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const file = path.join(OUTPUT_DIR, `${kind}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
  return file
}

function issueQuery(snapshot, number, fields) {
  return graphql(`query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) { issue(number: $number) { ${fields} } }
  }`, { owner: snapshot.repo.owner, name: snapshot.repo.name, number }).repository.issue
}

function applier(snapshot) {
  const ids = snapshot.ids
  const issueId = number => (ids.issues[number] ??= issueQuery(snapshot, number, 'id').id)
  const itemId = number => {
    if (!ids.items[number]) throw new Error(`#${number} is not on the board`)
    return ids.items[number]
  }
  const field = name => {
    if (!ids.fields[name]) throw new Error(`no project field "${name}"`)
    return ids.fields[name]
  }
  const label = name => {
    if (!ids.labels[name]) throw new Error(`no label "${name}"`)
    return ids.labels[name]
  }
  const project = ids.project

  return {
    addToProject({ issue }) {
      const data = graphql(`mutation($project: ID!, $content: ID!) {
        addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
      }`, { project, content: issueId(issue) })
      ids.items[issue] = data.addProjectV2ItemById.item.id
    },
    setField({ issue, field: name, value }) {
      const target = field(name)
      const base = { project, item: itemId(issue), field: target.id }
      if (value === null || value === undefined) {
        graphql(`mutation($project: ID!, $item: ID!, $field: ID!) {
          clearProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field }) { clientMutationId }
        }`, base)
      } else if (target.options) {
        if (!target.options[value]) throw new Error(`"${value}" is not an option of ${name}`)
        graphql(`mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
          updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }) { clientMutationId }
        }`, { ...base, option: target.options[value] })
      } else {
        graphql(`mutation($project: ID!, $item: ID!, $field: ID!, $text: String!) {
          updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: { text: $text } }) { clientMutationId }
        }`, { ...base, text: String(value) })
      }
    },
    addLabel({ issue, label: name }) {
      graphql(`mutation($issue: ID!, $label: ID!) {
        addLabelsToLabelable(input: { labelableId: $issue, labelIds: [$label] }) { clientMutationId }
      }`, { issue: issueId(issue), label: label(name) })
    },
    removeLabel({ issue, label: name }) {
      graphql(`mutation($issue: ID!, $label: ID!) {
        removeLabelsFromLabelable(input: { labelableId: $issue, labelIds: [$label] }) { clientMutationId }
      }`, { issue: issueId(issue), label: label(name) })
    },
    ensurePartOf({ issue, parent }) {
      const current = issueQuery(snapshot, issue, 'id body')
      const body = withPartOf(current.body, parent)
      if (body === current.body) return
      graphql(`mutation($issue: ID!, $body: String!) {
        updateIssue(input: { id: $issue, body: $body }) { clientMutationId }
      }`, { issue: current.id, body })
    },
    addSubIssue({ parent, child }) {
      graphql(`mutation($parent: ID!, $child: ID!) {
        addSubIssue(input: { issueId: $parent, subIssueId: $child, replaceParent: true }) { clientMutationId }
      }`, { parent: issueId(parent), child: issueId(child) })
    },
    moveSubIssue({ parent, child, after }) {
      let anchor = { after: after ? issueId(after) : null }
      if (!after) {
        const first = issueQuery(snapshot, parent, 'subIssues(first: 1) { nodes { number id } }').subIssues.nodes[0]
        if (!first || first.number === child) return
        anchor = { before: first.id }
      }
      graphql(`mutation($parent: ID!, $child: ID!, $after: ID, $before: ID) {
        reprioritizeSubIssue(input: { issueId: $parent, subIssueId: $child, afterId: $after, beforeId: $before }) { clientMutationId }
      }`, { parent: issueId(parent), child: issueId(child), ...anchor })
    },
    moveItem({ issue, after }) {
      graphql(`mutation($project: ID!, $item: ID!, $after: ID) {
        updateProjectV2ItemPosition(input: { projectId: $project, itemId: $item, afterId: $after }) { clientMutationId }
      }`, { project, item: itemId(issue), after: after ? itemId(after) : null })
    },
    addBlockedBy({ issue, blocker }) {
      graphql(`mutation($issue: ID!, $blocker: ID!) {
        addBlockedBy(input: { issueId: $issue, blockingIssueId: $blocker }) { clientMutationId }
      }`, { issue: issueId(issue), blocker: issueId(blocker) })
    },
    removeBlockedBy({ issue, blocker }) {
      graphql(`mutation($issue: ID!, $blocker: ID!) {
        removeBlockedBy(input: { issueId: $issue, blockingIssueId: $blocker }) { clientMutationId }
      }`, { issue: issueId(issue), blocker: issueId(blocker) })
    },
    closeIssue({ issue, reason = 'COMPLETED' }) {
      graphql(`mutation($issue: ID!) {
        closeIssue(input: { issueId: $issue, stateReason: ${reason === 'NOT_PLANNED' ? 'NOT_PLANNED' : 'COMPLETED'} }) { clientMutationId }
      }`, { issue: issueId(issue) })
    },
    setMilestone({ issue, milestone }) {
      if (!milestone) {
        graphql(`mutation($issue: ID!) {
          updateIssue(input: { id: $issue, milestoneId: null }) { clientMutationId }
        }`, { issue: issueId(issue) })
        return
      }
      if (!ids.milestones[milestone]) throw new Error(`no open milestone "${milestone}"`)
      graphql(`mutation($issue: ID!, $milestone: ID!) {
        updateIssue(input: { id: $issue, milestoneId: $milestone }) { clientMutationId }
      }`, { issue: issueId(issue), milestone: ids.milestones[milestone] })
    },
    setTitle({ issue, title }) {
      graphql(`mutation($issue: ID!, $title: String!) {
        updateIssue(input: { id: $issue, title: $title }) { clientMutationId }
      }`, { issue: issueId(issue), title })
    },
    comment({ issue, body }) {
      graphql(`mutation($issue: ID!, $body: String!) {
        addComment(input: { subjectId: $issue, body: $body }) { clientMutationId }
      }`, { issue: issueId(issue), body })
    },
  }
}

function versionsOf({ id }) {
  const edits = 'userContentEdits(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { editedAt diff } }'
  return paginate(cursor => graphql(`query($id: ID!, $cursor: String) {
    node(id: $id) { ... on Issue { ${edits} } ... on IssueComment { ${edits} } }
  }`, { id, cursor }).node.userContentEdits)
    .filter(edit => edit.diff !== null)
    .map(edit => ({ body: edit.diff, editedAt: edit.editedAt }))
}

function option(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return null
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} needs a value`)
  return args[index + 1]
}

function mainReader() {
  try {
    return gitReader(ROOT, 'origin/main')
  } catch {
    return gitReader(ROOT, 'main')
  }
}

function citationPlan(snapshot, args) {
  const merged = option(args, '--merged')
  const sweep = args.includes('--citations')
  if (!merged && !sweep) return null
  if (merged && sweep) throw new Error('--merged and --citations exclude each other')
  const git = mainReader()
  const merge = merged && git.resolve(merged)
  if (merged && !git.history.some(commit => commit.sha === merge)) {
    throw new Error(`${merged} is not on main's first-parent history: run git fetch, or pass the merge commit`)
  }
  const issues = snapshot.issues.map(issue => ({ ...issue, id: snapshot.ids.issues[issue.number] }))
  return relocations({ issues, git, merge, versionsOf })
}

function printPlan(result) {
  console.log(`ops (${result.ops.length}):`)
  for (const op of result.ops) console.log(`  ${describe(op)}`)
  console.log(`judgment (${result.judgment.length}):`)
  for (const item of result.judgment) {
    const subject = item.issue ? `#${item.issue}` : item.pullRequest ? `PR #${item.pullRequest}` : '-'
    console.log(`  ${item.kind} ${subject}${item.detail ? `: ${item.detail}` : ''}`)
  }
}

const commands = {
  snapshot() {
    console.log(save('snapshot', takeSnapshot()))
  },
  plan(args) {
    const config = loadConfig()
    const snapshot = takeSnapshot(config)
    const snapshotFile = save('snapshot', snapshot)
    const result = { snapshotFile, ...plan(snapshot, { conventions: config }) }
    const relocated = citationPlan(snapshot, args)
    if (relocated) {
      result.ops.push(...relocated.ops)
      result.judgment.push(...relocated.judgment)
    }
    const out = option(args, '--out')
    const planFile = out ?? save('plan', result)
    if (out) fs.writeFileSync(planFile, JSON.stringify(result, null, 2))
    console.log(`snapshot: ${snapshotFile}`)
    console.log(`plan: ${planFile}`)
    printPlan(result)
  },
  apply([planFile]) {
    if (!planFile) throw new Error('usage: backlog.mjs apply <plan.json>')
    const { ops } = JSON.parse(fs.readFileSync(planFile, 'utf8'))
    const snapshot = takeSnapshot()
    console.log(`backup: ${save('snapshot', snapshot)}`)
    const run = applier(snapshot)
    let failed = 0
    for (const op of ops) {
      try {
        if (!run[op.op]) throw new Error(`unknown op "${op.op}"`)
        run[op.op](op)
        console.log(`ok   ${describe(op)}`)
      } catch (error) {
        failed++
        console.log(`FAIL ${describe(op)}\n     ${error.message.split('\n')[0]}`)
      }
    }
    console.log(`${ops.length - failed} applied, ${failed} failed`)
    if (failed) process.exitCode = 1
  },
  setup() {
    const snapshot = takeSnapshot()
    if (snapshot.project.fields[WAITING_ON]) return console.log(`"${WAITING_ON}" already exists`)
    graphql(`mutation($project: ID!, $name: String!) {
      createProjectV2Field(input: { projectId: $project, dataType: TEXT, name: $name }) { clientMutationId }
    }`, { project: snapshot.ids.project, name: WAITING_ON })
    console.log(`created the "${WAITING_ON}" field`)
  },
}

function main([command, ...args]) {
  if (!commands[command]) {
    console.error('usage: backlog.mjs snapshot | plan [--out file] [--merged <commit> | --citations] | apply <plan.json> | setup')
    process.exitCode = 2
    return
  }
  try {
    commands[command](args)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2))
}
