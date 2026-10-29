import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_FILE = path.join(SKILL_DIR, 'config.json')
const MUTEX = '.mutex'
const MUTEX_STALE_MS = 10_000
const POLL_MS = 1_000

const USAGE = [
  'usage: node .claude/skills/deliver-epic/scripts/slots.mjs <command>',
  '  run <slot> <holder> -- <command line>   wait for a place in the slot, run the command line, then free the place',
  '  acquire <slot> <holder>                 wait for a place in the slot and keep it until release',
  '  release <holder> [<slot>]               free the places a holder took, or its place in that slot',
  '  list                                    show each slot and its holders',
].join('\n')

export function loadSlots(file = CONFIG_FILE) {
  const { slots = {} } = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!slots.merge) throw new Error(`${file} needs a "merge" slot, which the skill takes from main's merge into the branch to the end of groom-backlog`)
  for (const [name, slot] of Object.entries(slots)) {
    if (!Number.isInteger(slot.count) || slot.count < 1) throw new Error(`"${name}" needs a count of 1 or more in ${file}`)
  }
  return slots
}

export function slotsDir(cwd = process.cwd()) {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  return path.join(os.tmpdir(), 'deliver-epic', `${path.basename(path.dirname(common))}-slots`)
}

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function exclusively(dir, work) {
  fs.mkdirSync(dir, { recursive: true })
  const mutex = path.join(dir, MUTEX)
  for (;;) {
    try {
      fs.mkdirSync(mutex)
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const age = Date.now() - fs.statSync(mutex, { throwIfNoEntry: false })?.mtimeMs
      if (age > MUTEX_STALE_MS) fs.rmSync(mutex, { recursive: true, force: true })
      else pause(20)
    }
  }
  try {
    return work()
  } finally {
    fs.rmSync(mutex, { recursive: true, force: true })
  }
}

function placeFile(dir, { slot, holder, pid }) {
  return path.join(dir, `${slot}--${holder}--${pid ?? 'held'}.json`)
}

function readPlace(file) {
  try {
    return { file, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function readPlaces(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => readPlace(path.join(dir, file)))
    .filter(Boolean)
    .sort((a, b) => a.since.localeCompare(b.since) || a.holder.localeCompare(b.holder))
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

function livePlaces(dir) {
  return readPlaces(dir).filter(place => {
    if (place.pid === null || isRunning(place.pid)) return true
    fs.rmSync(place.file, { force: true })
    return false
  })
}

function checkRequest(slots, slot, holder) {
  if (!slots[slot]) throw new Error(`no slot "${slot}": the config names ${Object.keys(slots).join(', ')}`)
  if (!/^[\w-]+$/.test(holder ?? '')) throw new Error(`holder "${holder}" must be letters, digits, - or _`)
}

export function takeSlot(dir, slots, { slot, holder, pid = null }) {
  checkRequest(slots, slot, holder)
  return exclusively(dir, () => {
    const held = livePlaces(dir).filter(place => place.slot === slot)
    const holders = held.map(place => place.holder)
    if (held.some(place => place.holder === holder && place.pid === pid)) return { taken: true, holders }
    if (held.length >= slots[slot].count) return { taken: false, holders }
    fs.writeFileSync(placeFile(dir, { slot, holder, pid }), JSON.stringify({ slot, holder, pid, since: new Date().toISOString() }))
    return { taken: true, holders: [...holders, holder] }
  })
}

async function waitForSlot(dir, slots, request, onWait) {
  for (let attempt = 0; ; attempt++) {
    const result = takeSlot(dir, slots, request)
    if (result.taken) return result
    if (attempt === 0) onWait(result.holders)
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
  }
}

export function releaseSlots(dir, holder, slot) {
  return exclusively(dir, () => {
    const released = readPlaces(dir).filter(place => place.holder === holder && (slot === undefined || place.slot === slot))
    for (const place of released) fs.rmSync(place.file, { force: true })
    return released.map(place => place.slot)
  })
}

function describeSlots(dir, slots) {
  const places = exclusively(dir, () => livePlaces(dir))
  return Object.entries(slots).map(([name, { count }]) => {
    const held = places.filter(place => place.slot === name)
    const holders = held.map(place => (place.pid === null ? place.holder : `${place.holder} (pid ${place.pid})`))
    return `${name} ${held.length}/${count}${holders.length ? `: ${holders.join(', ')}` : ''}`
  })
}

function commandLine(words) {
  return words.map(word => (/^[\w@+=:,./-]+$/.test(word) ? word : `"${word.replace(/"/g, '\\"')}"`)).join(' ')
}

function waitingNotice(slot) {
  return holders => console.error(`waiting for ${slot}, held by ${holders.join(', ')}`)
}

async function run(dir, slots, slot, holder, words) {
  const request = { slot, holder, pid: process.pid }
  await waitForSlot(dir, slots, request, waitingNotice(slot))
  try {
    return await new Promise(resolve => {
      const child = spawn(commandLine(words), { shell: true, stdio: 'inherit' })
      child.on('error', error => {
        console.error(`could not run ${commandLine(words)}: ${error.message}`)
        resolve(1)
      })
      child.on('exit', code => resolve(code ?? 1))
    })
  } finally {
    exclusively(dir, () => fs.rmSync(placeFile(dir, request), { force: true }))
  }
}

async function main(args) {
  const [command, ...rest] = args
  const slots = loadSlots()
  const dir = slotsDir()
  if (command === 'run' && rest.indexOf('--') === 2 && rest.length > 3) {
    const [slot, holder] = rest
    return run(dir, slots, slot, holder, rest.slice(3))
  }
  if (command === 'acquire' && rest.length === 2) {
    const [slot, holder] = rest
    await waitForSlot(dir, slots, { slot, holder }, waitingNotice(slot))
    console.log(`took ${slot} for ${holder}`)
    return 0
  }
  if (command === 'release' && (rest.length === 1 || rest.length === 2)) {
    const [holder, slot] = rest
    const released = releaseSlots(dir, holder, slot)
    console.log(released.length ? `released ${released.join(', ')} for ${holder}` : `${holder} held no slot`)
    return 0
  }
  if (command === 'list' && rest.length === 0) {
    console.log(describeSlots(dir, slots).join('\n'))
    return 0
  }
  console.error(USAGE)
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).then(
    code => {
      process.exitCode = code
    },
    error => {
      console.error(error.message)
      process.exitCode = 1
    }
  )
}
