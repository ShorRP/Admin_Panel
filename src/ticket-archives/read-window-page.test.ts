import { RESTJSONErrorCodes } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import {
  FakeDiscord,
  type FakeChannelMessage,
  type FakeDiscordState,
} from "@/discord/fake-discord"
import { archiveMessage } from "./archive-message"
import { readTicketArchivePage } from "./read-ticket-archive-page"
import type { TicketArchiveSearchParams } from "./ticket-archive-filters"

const CHANNEL_ID = "1562505523490848881"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja",
  global_name: "Brynja",
}

const LYRA = { id: "1400000000000000004", username: "lyra_gates" }

const LYRIA = { id: "1400000000000000005", username: "lyria" }

const TECHNICAL = "🔧 Problème technique"

const REPORT = "🚨 Signaler un joueur"

const RATE_LIMITED = new DiscordError({
  method: "GET",
  route: "/guilds/{guild.id}/messages/search",
  status: 429,
  code: RESTJSONErrorCodes.MissingAccess,
  discordMessage: "You are being rate limited.",
  retryAfter: 4.4,
})

function archive(reason: string, overrides = {}): FakeChannelMessage {
  return archiveMessage({
    channelId: CHANNEL_ID,
    openerId: ALDIS.id,
    closerId: BRYNJA.id,
    reason,
    ...overrides,
  })
}

function serverWith(
  messages: FakeChannelMessage[],
  state: FakeDiscordState = {}
) {
  return new FakeDiscord({
    members: [
      { user: ALDIS },
      { user: BRYNJA },
      { user: LYRA },
      { user: LYRIA },
    ],
    channels: [CHANNEL_ID],
    channelMessages: messages,
    ...state,
  })
}

async function pageOf(
  discord: FakeDiscord,
  searchParams: TicketArchiveSearchParams
) {
  const read = await readTicketArchivePage(discord, CHANNEL_ID, searchParams)
  if (read.kind !== "page") {
    throw new Error("The archives are not configured.")
  }
  return read
}

function reasonsOf({ archives }: { archives: { reason: string }[] }) {
  return archives.map(({ reason }) => reason)
}

const OPENED_BY_ALDIS = archive("Ouverte par Aldis")

const CLOSED_BY_ALDIS = archive("Fermée par Aldis", {
  openerId: BRYNJA.id,
  closerId: ALDIS.id,
})

const BY_OTHERS = archive("Sans Aldis", {
  openerId: LYRA.id,
  closerId: BRYNJA.id,
})

test("an opener keeps the archives that account opened, not those it closed", async () => {
  const read = await pageOf(
    serverWith([OPENED_BY_ALDIS, CLOSED_BY_ALDIS, BY_OTHERS]),
    { opener: ALDIS.id }
  )

  expect(reasonsOf(read)).toEqual(["Ouverte par Aldis"])
  expect(read).toMatchObject({ total: 1, pages: 1, complete: true })
})

test("a closer keeps the archives that account closed, not those it opened", async () => {
  const read = await pageOf(
    serverWith([OPENED_BY_ALDIS, CLOSED_BY_ALDIS, BY_OTHERS]),
    { closer: ALDIS.id }
  )

  expect(reasonsOf(read)).toEqual(["Fermée par Aldis"])
})

test("an opener and a closer together keep the archives that fit both, whichever Discord's text served", async () => {
  const messages = [
    OPENED_BY_ALDIS,
    archive("Entre eux", { openerId: ALDIS.id, closerId: LYRA.id }),
    CLOSED_BY_ALDIS,
    BY_OTHERS,
  ]

  const read = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    closer: BRYNJA.id,
  })
  const swapped = await pageOf(serverWith(messages), {
    opener: BRYNJA.id,
    closer: ALDIS.id,
  })

  expect(reasonsOf(read)).toEqual(["Ouverte par Aldis"])
  expect(reasonsOf(swapped)).toEqual(["Fermée par Aldis"])
})

test("an account is found by its mention, or by its ID though it left the Discord server", async () => {
  const left = archive("Compte parti", { openerId: "1400000000000000099" })

  expect(
    reasonsOf(
      await pageOf(serverWith([left, OPENED_BY_ALDIS]), {
        opener: "<@1400000000000000099>",
      })
    )
  ).toEqual(["Compte parti"])
  expect(
    reasonsOf(
      await pageOf(serverWith([left, OPENED_BY_ALDIS]), {
        opener: "1400000000000000099",
      })
    )
  ).toEqual(["Compte parti"])
})

test("an account is found by the start of its name, whatever its case, as a member and as a banned account", async () => {
  const banned = archive("Compte banni", { openerId: "1400000000000000098" })
  const discord = serverWith([OPENED_BY_ALDIS, banned], {
    bans: [{ user: { id: "1400000000000000098", username: "korvald" } }],
  })

  expect(reasonsOf(await pageOf(discord, { opener: "ALD" }))).toEqual([
    "Ouverte par Aldis",
  ])
  expect(reasonsOf(await pageOf(discord, { opener: "kor" }))).toEqual([
    "Compte banni",
  ])
  expect(reasonsOf(await pageOf(discord, { closer: "bryn" }))).toEqual([
    "Compte banni",
    "Ouverte par Aldis",
  ])
})

test("a name that no member and no banned account starts gives no archive and says which filter found no account", async () => {
  const read = await pageOf(serverWith([OPENED_BY_ALDIS]), { closer: "zzz" })

  expect(read).toMatchObject({
    archives: [],
    total: 0,
    first: 0,
    accountNotice: { filter: "closer", text: "zzz", kind: "none" },
  })
})

test("a name that several accounts start gives no archive and says so, but an exact name is the account", async () => {
  const discord = serverWith([OPENED_BY_ALDIS, BY_OTHERS])

  expect(await pageOf(discord, { opener: "ly" })).toMatchObject({
    archives: [],
    accountNotice: { filter: "opener", text: "ly", kind: "several" },
  })
  expect(reasonsOf(await pageOf(discord, { opener: "lyra_gates" }))).toEqual([
    "Sans Aldis",
  ])
})

test("a reason keeps the archives whose reason holds every word of the text, whatever the case and the order, and never a part of a word", async () => {
  const messages = [
    archive("Launcher cassé après la mise à jour"),
    archive("Cassé : le LAUNCHER"),
    archive("Launchers cassés"),
    archive("Problème de connexion"),
  ]

  const read = await pageOf(serverWith(messages), {
    reason: "launcher cassé",
  })

  expect(reasonsOf(read)).toEqual([
    "Cassé : le LAUNCHER",
    "Launcher cassé après la mise à jour",
  ])
  expect(
    reasonsOf(await pageOf(serverWith(messages), { reason: "launche" }))
  ).toEqual([])
})

test("a reason is searched in the reason alone: a word of the archive's other fields, or of its other texts, is no match", async () => {
  const messages = [
    archive("Résolu", { openerId: ALDIS.id }),
    archive("Le motif est ouvert", { kind: TECHNICAL }),
  ]

  expect(
    reasonsOf(await pageOf(serverWith(messages), { reason: "motif" }))
  ).toEqual(["Le motif est ouvert"])
  expect(
    reasonsOf(await pageOf(serverWith(messages), { reason: "ouvert" }))
  ).toEqual(["Le motif est ouvert"])
  expect(
    reasonsOf(await pageOf(serverWith(messages), { reason: "archive" }))
  ).toEqual([])
})

test("a kind, a reason and an account combine in memory over what Discord's text found", async () => {
  const messages = [
    archive("Bug du launcher", { kind: TECHNICAL }),
    archive("Bug du launcher", { kind: REPORT }),
    archive("Bug du launcher", { kind: TECHNICAL, openerId: LYRA.id }),
    archive("Autre souci", { kind: TECHNICAL }),
  ]

  const read = await pageOf(serverWith(messages), {
    kind: "technical-issue",
    reason: "bug",
    opener: ALDIS.id,
  })

  expect(reasonsOf(read)).toEqual(["Bug du launcher"])
  expect(read.archives).toMatchObject([
    { requestKind: TECHNICAL, opener: { id: ALDIS.id } },
  ])
})

test("a kind alone is no window, but with a reason the kind is checked in memory: the archives of another kind that cite its emoji are out", async () => {
  const read = await pageOf(
    serverWith([
      archive("Bug", { kind: TECHNICAL }),
      archive("Bug 🔧", { kind: REPORT }),
    ]),
    { kind: "technical-issue", reason: "bug" }
  )

  expect(reasonsOf(read)).toEqual(["Bug"])
})

test("the kind counts of a window are the archives of each kind that pass every other filter", async () => {
  const messages = [
    archive("A", { kind: TECHNICAL }),
    archive("B", { kind: TECHNICAL }),
    archive("C", { kind: REPORT }),
    archive("D", { kind: "🎭 Demande RP" }),
    archive("E", { kind: null }),
    archive("F", { kind: TECHNICAL, openerId: LYRA.id }),
  ]

  const read = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    kind: "player-report",
  })

  expect(reasonsOf(read)).toEqual(["C"])
  expect(read.kindCounts).toEqual({
    kind: "known",
    counts: {
      "technical-issue": 2,
      "player-report": 1,
      "rp-request": 1,
      "other-request": 0,
    },
  })
})

const OPENED = {
  early: new Date("2026-10-04T21:59:59Z"),
  start: new Date("2026-10-04T22:00:00Z"),
  middle: new Date("2026-10-15T12:00:00Z"),
  end: new Date("2026-10-31T22:59:59Z"),
  after: new Date("2026-10-31T23:00:00Z"),
}

const closedLater = (reason: string, openedAt: Date, day: number) =>
  archive(reason, {
    openedAt,
    closedAt: new Date(`2026-11-${String(day).padStart(2, "0")}T10:00:00Z`),
    sentAt: new Date(`2026-11-${String(day).padStart(2, "0")}T10:00:01Z`),
  })

test("a period on opening keeps the archives opened in it, whenever they were closed, from the first Paris day to the last", async () => {
  const messages = [
    closedLater("Trop tôt", OPENED.early, 1),
    closedLater("Début", OPENED.start, 2),
    closedLater("Milieu", OPENED.middle, 3),
    closedLater("Fin", OPENED.end, 4),
    closedLater("Trop tard", OPENED.after, 5),
  ]

  const read = await pageOf(serverWith(messages), {
    from: "2026-10-05",
    to: "2026-10-31",
    on: "opened",
  })

  expect(reasonsOf(read)).toEqual(["Fin", "Milieu", "Début"])
})

test("a period on opening reads the archives closed since its start, the oldest first, and shows them as the sort says", async () => {
  const messages = [
    archive("Fermée avant", {
      openedAt: OPENED.middle,
      sentAt: new Date("2026-10-01T10:00:00Z"),
    }),
    closedLater("Ouverte en octobre", OPENED.middle, 2),
    closedLater("Ouverte en octobre aussi", OPENED.middle, 3),
  ]

  const newest = await pageOf(serverWith(messages), {
    from: "2026-10-05",
    on: "opened",
  })
  const oldest = await pageOf(serverWith(messages), {
    from: "2026-10-05",
    on: "opened",
    sort: "oldest",
  })

  expect(reasonsOf(newest)).toEqual([
    "Ouverte en octobre aussi",
    "Ouverte en octobre",
  ])
  expect(reasonsOf(oldest)).toEqual([
    "Ouverte en octobre",
    "Ouverte en octobre aussi",
  ])
})

test("a period on opening with no date is no filter: Discord's pages are read", async () => {
  const read = await pageOf(serverWith([archive("Une")]), { on: "opened" })

  expect(read).toMatchObject({ limit: "offset", total: 1 })
})

test("a period on closing is the sending of the archive even beside an account", async () => {
  const messages = [
    archive("Tôt", { sentAt: new Date("2026-10-01T10:00:00Z") }),
    archive("Tard", { sentAt: new Date("2026-10-20T10:00:00Z") }),
  ]

  const read = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    from: "2026-10-10",
  })

  expect(reasonsOf(read)).toEqual(["Tard"])
})

test("the archives of a window are paged in memory, 25 a page, and a page past the last reads the first", async () => {
  const messages = Array.from({ length: 60 }, (_, index) =>
    archive(`Archive ${index}`)
  )

  const second = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    page: "2",
  })
  const past = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    page: "4",
  })

  expect(second).toMatchObject({
    page: 2,
    pages: 3,
    first: 26,
    last: 50,
    total: 60,
    complete: true,
    limit: "window",
  })
  expect(reasonsOf(second)[0]).toBe("Archive 34")
  expect(past).toMatchObject({ page: 1, pages: 3 })
})

test("a window reads the 100 newest messages Discord found: the 101st is not read, and the page says the read is incomplete", async () => {
  const messages = Array.from({ length: 101 }, (_, index) =>
    archive(`Archive ${index}`)
  )
  const discord = serverWith(messages)

  const last = await pageOf(discord, { opener: ALDIS.id, page: "4" })

  expect(last).toMatchObject({
    page: 4,
    pages: 4,
    first: 76,
    last: 100,
    total: 100,
    complete: false,
    limit: "window",
  })
  expect(reasonsOf(last).at(-1)).toBe("Archive 1")
})

test("100 messages are all read: the window is complete", async () => {
  const messages = Array.from({ length: 100 }, (_, index) =>
    archive(`Archive ${index}`)
  )

  const last = await pageOf(serverWith(messages), {
    opener: ALDIS.id,
    page: "4",
  })

  expect(last).toMatchObject({ total: 100, complete: true })
  expect(reasonsOf(last).at(-1)).toBe("Archive 0")
})

test("a window that reads the oldest first keeps the oldest 100, and shows them from the newest unless asked", async () => {
  const messages = Array.from({ length: 101 }, (_, index) =>
    closedLater(`Archive ${index}`, OPENED.middle, 1 + (index % 28))
  )

  const read = await pageOf(serverWith(messages), {
    from: "2026-10-01",
    on: "opened",
    sort: "oldest",
  })

  const newest = await pageOf(serverWith(messages), {
    from: "2026-10-01",
    on: "opened",
  })

  expect(read).toMatchObject({ total: 100, complete: false })
  expect(reasonsOf(read)[0]).toBe("Archive 0")
  expect(reasonsOf(newest)[0]).toBe("Archive 55")
  expect(newest).toMatchObject({ total: 100, complete: false })
})

test("an archive posted by a member is no archive in a window either", async () => {
  const forged = archive("Forgée", { authorId: LYRA.id })

  const read = await pageOf(serverWith([forged, OPENED_BY_ALDIS]), {
    opener: ALDIS.id,
  })

  expect(reasonsOf(read)).toEqual(["Ouverte par Aldis"])
})

test("a window with no archive is one empty page", async () => {
  expect(await pageOf(serverWith([]), { opener: ALDIS.id })).toMatchObject({
    archives: [],
    page: 1,
    pages: 1,
    first: 0,
    last: 0,
    total: 0,
    complete: true,
  })
})

test("a rate limit that comes back fails the read with Discord's error", async () => {
  const discord = serverWith([OPENED_BY_ALDIS])
  discord.failNext("searchMessages", RATE_LIMITED)

  await expect(pageOf(discord, { opener: ALDIS.id })).rejects.toBe(RATE_LIMITED)
})

test("the members of the Discord server failing fails the read of a name with Discord's error", async () => {
  const discord = serverWith([OPENED_BY_ALDIS])
  discord.failNext("listMembers", RATE_LIMITED)

  await expect(pageOf(discord, { opener: "ald" })).rejects.toBe(RATE_LIMITED)
})
