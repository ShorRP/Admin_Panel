const EXTENSIONS = 'js|jsx|mjs|cjs|json|md|css|html|yml|yaml|sh|sql|txt'
const PATH = `(?:[\\w.-]+/)*[\\w-][\\w.-]*\\.(?:${EXTENSIONS})`
const LINES = '\\d+(?:-\\d+)?(?:,\\d+(?:-\\d+)?)*'
const TOKEN = new RegExp([
  `(?<![\\w./-])(${PATH}):(${LINES})(?![\\w-])`,
  `\`:(${LINES})\``,
  `\`(${PATH})\``,
].join('|'), 'g')

function withoutCodeBlocks(text) {
  let fence = null
  return text.split('\n').map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1][0]
    if (fence) {
      if (marker === fence) fence = null
      return ''
    }
    if (marker) {
      fence = marker
      return ''
    }
    return line
  }).join('\n')
}

function isArrow(gap, before) {
  if (gap.includes('\n')) return false
  const plain = gap.replace(/`/g, '')
  return plain.includes('→') || (/^\s+à\s+$/.test(plain) && /\bde\s*$/.test(before.replace(/`/g, '')))
}

const DELETED = /^[^\n]*→[^\S\n]*supprim(?:é|ée|és|ées)(?![\p{L}\d])/iu

const basename = path => path.slice(path.lastIndexOf('/') + 1)

const NAMED_COMMIT = /\b[Cc]ommit\s+`?([0-9a-f]{7,40})(?![\w-])/

function commitNamedOn(text, offset) {
  const end = text.indexOf('\n', offset)
  return text.slice(text.lastIndexOf('\n', offset) + 1, end < 0 ? undefined : end).match(NAMED_COMMIT)?.[1]
}

export function citationsIn(text) {
  const scanned = withoutCodeBlocks(text ?? '')
  const matches = [...scanned.matchAll(TOKEN)]
  const citations = []
  const folders = []
  let lastFile = null
  let previous = null
  for (const [i, match] of matches.entries()) {
    const [token, path, lines, aloneLines, named] = match
    if (named) {
      lastFile = named.replace(/^\.\//, '')
      if (lastFile.includes('/')) folders.push({ path: lastFile, offset: match.index })
      continue
    }
    const arrow = previous && isArrow(scanned.slice(previous.end, match.index), scanned.slice(0, previous.start))
    const file = path ? path.replace(/^\.\//, '') : arrow ? citations[previous.first].path : lastFile
    const tokenEnd = match.index + token.length
    const next = matches.slice(i + 1).find(([, , , , namedNext]) => !namedNext)
    const deleted = DELETED.test(scanned.slice(tokenEnd, next?.index).replace(/`/g, ''))
    const commit = commitNamedOn(scanned, match.index)
    const plain = token.replace(/`/g, '')
    const spans = (lines ?? aloneLines).split(',')
    const first = citations.length
    for (const [k, span] of spans.entries()) {
      const [start, end = start] = span.split('-').map(Number)
      const own = `${plain.slice(0, plain.indexOf(':') + 1)}${spans.slice(0, k + 1).join(',')}`
      const citation = { token: own, path: file, start, end, offset: match.index }
      if (arrow && k < previous.count) citation.replaces = previous.first + k
      if (deleted) citation.deleted = true
      if (commit) citation.commit = commit
      citations.push(citation)
    }
    if (path || arrow) lastFile = file
    if (file?.includes('/')) folders.push({ path: file, offset: match.index })
    previous = deleted ? null : { first, count: citations.length - first, start: match.index, end: tokenEnd }
  }
  return citations.map(({ offset, ...citation }) => {
    if (!citation.path || citation.path.includes('/')) return citation
    const same = folders.filter(folder => basename(folder.path) === citation.path)
    const before = same.filter(folder => folder.offset < offset).at(-1)
    const folder = before ?? same[0]
    return folder ? { ...citation, path: folder.path } : citation
  })
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

export function parseDiff(text) {
  const files = {}
  let section = null
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      const [, a, b] = line.match(/^diff --git a\/(.+) b\/(.+)$/) ?? []
      section = { from: a, to: b, hunks: [], inHunks: false }
      files[a] = section
      continue
    }
    if (!section) continue
    const hunk = line.match(HUNK)
    if (hunk) {
      section.inHunks = true
      section.hunks.push({
        oldStart: Number(hunk[1]),
        oldCount: hunk[2] === undefined ? 1 : Number(hunk[2]),
        newStart: Number(hunk[3]),
        newCount: hunk[4] === undefined ? 1 : Number(hunk[4]),
      })
      continue
    }
    if (section.inHunks) continue
    if (line.startsWith('rename from ')) section.from = line.slice('rename from '.length)
    else if (line.startsWith('rename to ')) section.to = line.slice('rename to '.length)
    else if (line.startsWith('--- ')) section.from = line === '--- /dev/null' ? null : line.slice('--- a/'.length)
    else if (line.startsWith('+++ ')) section.to = line === '+++ /dev/null' ? null : line.slice('+++ b/'.length)
  }
  return Object.fromEntries(Object.values(files)
    .filter(file => file.from !== null)
    .map(file => [file.from, { path: file.to, hunks: file.hunks }]))
}

export function applyDiff(diff, { path, start, end }) {
  const file = diff[path]
  if (!file) return { path, start, end }
  if (file.path === null) return { path: null }
  let shift = 0
  for (const hunk of file.hunks) {
    const net = hunk.newCount - hunk.oldCount
    if (hunk.oldCount === 0) {
      if (hunk.oldStart >= start && hunk.oldStart < end) return { path: file.path, touched: true }
      if (hunk.oldStart < start) shift += net
    } else {
      const last = hunk.oldStart + hunk.oldCount - 1
      if (hunk.oldStart <= end && last >= start) return { path: file.path, touched: true }
      if (last < start) shift += net
    }
  }
  return { path: file.path, start: start + shift, end: end + shift }
}

const short = sha => sha.slice(0, 7)
const lineSpan = ({ start, end }) => (start === end ? `${start}` : `${start}-${end}`)
const cite = place => `${place.path}:${lineSpan(place)}`
const samePlace = (a, b) => a.path === b.path && a.start === b.start && a.end === b.end
const sameLines = (a, b) => a.length === b.length && a.every((line, i) => line === b[i])
const isLater = (a, b) => (a.time - b.time || a.textIndex - b.textIndex || a.order - b.order) > 0

function findBlock(lines, block) {
  const hits = []
  for (let i = 0; i + block.length <= lines.length; i++) {
    if (block.every((line, k) => lines[i + k] === line)) hits.push(i + 1)
  }
  return hits
}

function pullRequestOf(subject) {
  const number = subject.match(/^Merge pull request #(\d+)\b/)?.[1] ?? subject.match(/\(#(\d+)\)\s*$/)?.[1]
  return number ? Number(number) : null
}

function codeSpan(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length))
  const fence = '`'.repeat(longest + 1)
  const pad = longest ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

function excerpt(block) {
  const line = block.find(text => text.trim() !== '')?.trim().replace(/\s+/g, ' ')
  if (!line || citationsIn(line).length || NAMED_COMMIT.test(line)) return ''
  return ` : ${codeSpan(line.length > 60 ? `${line.slice(0, 59)}…` : line)}`
}

const RELOCATION_HEADER = /Les lignes citées ici (?:bougent avec (?:#\d+ \(|le commit )|ont bougé[^\n]*?jusqu'à )([0-9a-f]{7,40})\b/

function memoize(compute) {
  const cache = new Map()
  return (...args) => {
    const key = args.join('\0')
    if (!cache.has(key)) cache.set(key, compute(...args))
    return cache.get(key)
  }
}

export function relocations({ issues, git, merge = null, versionsOf = () => [] }) {
  const history = git.history
  const position = new Map(history.map((commit, i) => [commit.sha, i]))
  const commitAt = time => history.find(commit => Date.parse(commit.time) <= Date.parse(time))?.sha ?? null
  const head = merge ?? history[0].sha
  const base = merge ? history[position.get(merge) + 1]?.sha : null
  if (merge && !base) throw new Error(`${merge} has no parent on main's first-parent history`)
  const pullRequest = merge ? pullRequestOf(git.subject(merge)) : null
  const mergeName = merge ? (pullRequest ? `#${pullRequest}` : short(merge)) : null

  const diffBetween = memoize((from, to) => parseDiff(git.diff(from, to)))
  const linesAt = memoize((sha, path) => git.lines(sha, path))
  const pathsAt = memoize(sha => git.paths(sha))
  const resolveCommit = memoize(rev => git.resolve(rev))

  const locate = (from, to, place, block, rewritten) => {
    if (from === to) return place
    const moved = applyDiff(diffBetween(from, to), place)
    if (moved.path === null) return { error: `${place.path} is deleted on ${short(to)}` }
    const now = linesAt(to, moved.path) ?? []
    if (!moved.touched) return sameLines(now.slice(moved.start - 1, moved.end), block) ? moved : { error: `changed on ${short(to)}` }
    const hits = findBlock(now, block)
    if (hits.length === 1) return { path: moved.path, start: hits[0], end: hits[0] + block.length - 1 }
    return { error: hits.length ? `found ${hits.length} times on ${short(to)}` : rewritten }
  }

  const basePaths = merge ? new Set(pathsAt(base)) : null
  const mergedPaths = merge ? [...Object.keys(diffBetween(base, head)), ...pathsAt(head).filter(file => !basePaths.has(file))] : null
  const concerned = path => !mergedPaths || mergedPaths.some(file => file === path || basename(file) === path)
  const isAfter = (a, b) => position.has(a) && position.get(a) < position.get(b)

  const resolvePath = (path, commit) => {
    if (!path) return { error: 'no file named before it' }
    if (path.includes('/')) return { path }
    const same = pathsAt(commit).filter(file => basename(file) === path)
    if (same.length === 1) return { path: same[0] }
    return { error: same.length ? `${same.length} files named ${path} on ${short(commit)}` : `no file named ${path} on ${short(commit)}` }
  }

  const versions = new Map()
  const writtenAt = (text, token) => {
    if (!text.lastEditedAt) return text.createdAt
    if (!versions.has(text)) versions.set(text, [...versionsOf(text)].sort((a, b) => Date.parse(a.editedAt) - Date.parse(b.editedAt)))
    const holds = new RegExp(`(?<![\\w./-])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d-])`)
    return versions.get(text).find(version => holds.test(version.body))?.editedAt ?? text.createdAt
  }

  const citationsOf = issue => {
    const texts = [{ body: issue.body, createdAt: issue.createdAt, lastEditedAt: issue.lastEditedAt, id: issue.id }, ...(issue.comments ?? [])]
    return texts.flatMap((text, textIndex) => {
      const statedCommit = text.body?.match(RELOCATION_HEADER)?.[1]
      const list = citationsIn(text.body).map(({ commit: lineCommit, ...citation }, order) => {
        if (merge && !(citation.path && concerned(citation.path))) return null
        const time = writtenAt(text, citation.token)
        const namedCommit = statedCommit ?? lineCommit
        const commit = namedCommit ? resolveCommit(namedCommit) : commitAt(time)
        const entry = { ...citation, textIndex, order, time: Date.parse(time) }
        if (!commit) return namedCommit ? { ...entry, error: `commit ${namedCommit} not found` } : null
        return { ...entry, commit, ...resolvePath(citation.path, commit) }
      })
      for (const entry of list) if (entry?.replaces !== undefined) entry.replaced = list[entry.replaces]
      return list.filter(Boolean)
    })
  }

  const follow = entry => {
    if (entry.error) return { error: entry.error }
    const place = { path: entry.path, start: entry.start, end: entry.end }
    const content = linesAt(entry.commit, entry.path)
    if (!content) return { error: `absent from ${short(entry.commit)}` }
    if (place.start < 1 || place.end < place.start || place.end > content.length) return { error: `beyond the end of the file on ${short(entry.commit)}` }
    const block = content.slice(place.start - 1, place.end)
    if (!merge) return { place, block, before: place, now: locate(entry.commit, head, place, block, `rewritten since ${short(entry.commit)}`) }
    if (isAfter(entry.commit, head)) return { skip: true }
    if (entry.commit === head) return { place, block, before: place, now: place }
    const before = locate(entry.commit, base, place, block, 'rewritten')
    if (!before.error) return { place, block, before, now: locate(base, head, before, block, `rewritten by ${mergeName}`) }
    if (position.has(entry.commit)) return { skip: true }
    const now = locate(entry.commit, head, place, block, 'rewritten')
    return now.error ? { skip: true } : { place, block, before: place, now }
  }

  const ops = []
  const judgment = []
  for (const issue of issues) {
    const found = citationsOf(issue)
    const key = entry => entry.path && `${entry.path}:${entry.start}-${entry.end}`
    const arrows = found.filter(entry => entry.replaced?.path)
    const live = found.filter(entry => !entry.deleted && (!key(entry)
      || (!found.some(other => key(other) === key(entry) && isLater(other, entry))
        && !arrows.some(arrow => arrow !== entry && key(arrow.replaced) === key(entry) && entry.time <= arrow.time))))

    const latest = new Map()
    const unresolved = new Set()
    for (const entry of live) {
      const followed = follow(entry)
      if (followed.skip) continue
      const error = followed.error ?? followed.now.error
      if (error) {
        unresolved.add(`\`${entry.path ? cite(entry) : `:${lineSpan(entry)}`}\`: ${error}`)
        continue
      }
      const previous = latest.get(cite(followed.now))
      if (!previous || isLater(entry, previous)) latest.set(cite(followed.now), { ...entry, ...followed })
    }

    for (const detail of unresolved) judgment.push({ kind: 'unresolved-citation', issue: issue.number, detail })
    const items = [...latest.values()]
      .filter(({ place, before, now }) => !samePlace(now, place) && !samePlace(now, before))
      .sort((a, b) => a.textIndex - b.textIndex || a.order - b.order)
    if (items.length) ops.push(relocationComment(issue.number, items))
  }
  return { ops, judgment }

  function relocationComment(issue, items) {
    const header = merge
      ? `Les lignes citées ici bougent avec ${pullRequest ? `#${pullRequest} (${short(head)})` : `le commit ${short(head)}`}. Vérifié ligne à ligne contre ${short(base)} : chaque passage est identique à sa nouvelle place.`
      : `Les lignes citées ici ont bougé depuis qu'elles ont été écrites. Chaque passage est vérifié ligne à ligne, du commit où il a été cité jusqu'à ${short(head)}.`
    const lines = items.map(({ place, before, now, block, commit }) => {
      const target = now.path === place.path ? `:${lineSpan(now)}` : cite(now)
      const notes = []
      if (!merge || !position.has(commit)) notes.push(`cité sur ${short(commit)}`)
      if (merge && !samePlace(before, place)) {
        notes.push(`déjà ${before.start === before.end ? 'à la ligne' : 'aux lignes'} ${lineSpan(before)}${before.path === place.path ? '' : ` de ${before.path}`} avant ${mergeName}`)
      }
      return `- \`${cite(place)}\` → \`${target}\`${notes.length ? ` (${notes.join(', ')})` : ''}${excerpt(block)}`
    })
    return {
      op: 'comment',
      issue,
      why: merge ? `cited lines moved by ${mergeName}` : 'cited lines moved since they were written',
      body: [header, '', ...lines, ''].join('\n'),
    }
  }
}
