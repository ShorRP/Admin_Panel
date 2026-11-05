import type { FakeDiscordState } from "@/discord/fake-discord"
import { archiveMessage } from "@/ticket-archives/archive-message"
import {
  ARCHIVES_CHANNEL_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = {
  id: "1400000000000000002",
  username: "brynja",
  global_name: "Brynja",
}

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 5 }

const MODERATION = { id: MODERATION_ROLE_ID, name: "Modération", position: 4 }

const PANEL = { id: "1300000000000000020", name: "Shor Panel", position: 2 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const LONG_WORD = "x".repeat(300)

function ticket(openerId: string, overrides = {}) {
  return archiveMessage({
    channelId: ARCHIVES_CHANNEL_ID,
    openerId,
    ...overrides,
  })
}

const STATE: FakeDiscordState = {
  roles: [STAFF, MODERATION, PANEL, GUARD],
  applicationRoles: [PANEL.id],
  members: [
    { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
    { user: BRYNJA, nick: "Brynja la Rousse", roles: [STAFF.id] },
    {
      user: LYRA,
      roles: [GUARD.id],
      communication_disabled_until: "2099-11-02T18:30:00.000000+00:00",
    },
    { user: CORVUS },
  ],
  users: [HALDOR],
  channelMessages: [
    ticket(LYRA.id, {
      kind: "🔧 Problème technique",
      openedAt: new Date("2026-10-20T08:00:00Z"),
      closedAt: new Date("2026-10-20T08:45:00Z"),
      closerId: BRYNJA.id,
      reason: "Launcher réinstallé",
    }),
    ticket(CORVUS.id, { reason: "Ticket de Corvus" }),
    ticket(LYRA.id, {
      kind: null,
      openedAt: new Date("2026-10-25T18:10:00Z"),
      closedAt: new Date("2026-10-25T18:20:00Z"),
      closerId: HALDOR.id,
      reason: "Ticket renommé",
    }),
    ticket(LYRA.id, {
      authorId: BRYNJA.id,
      reason: "Forgé par un membre",
    }),
    ticket(LYRA.id, {
      kind: "🚨 Signaler un joueur",
      openedAt: new Date("2026-11-03T14:32:10Z"),
      closedAt: new Date("2026-11-03T15:10:59Z"),
      closerId: ALDIS.id,
      reason: LONG_WORD,
    }),
  ],
}

test.use({ discordState: STATE })

test("a moderator reads, under the history of an account, the support tickets it opened, newest first, each with its request kind, its dates, who closed it and why, and follows the closer to their record", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const tickets = page.getByRole("region", { name: "Tickets de support" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)

  await expect(tickets.getByRole("heading", { level: 2 })).toHaveText(
    "Tickets de support"
  )
  await expect(tickets.getByRole("listitem")).toHaveText([
    `🚨 Signaler un joueurOuvert le 3 nov. 2026, 15:32, fermé le 3 nov. 2026, 16:10 par aldis.Motif : ${LONG_WORD}`,
    "Type de demande inconnuOuvert le 25 oct. 2026, 19:10, fermé le 25 oct. 2026, 19:20 par haldor.Motif : Ticket renommé",
    "🔧 Problème techniqueOuvert le 20 oct. 2026, 10:00, fermé le 20 oct. 2026, 10:45 par Brynja la Rousse.Motif : Launcher réinstallé",
  ])
  await expect(page.getByText("Ticket de Corvus")).toHaveCount(0)
  await expect(page.getByText("Forgé par un membre")).toHaveCount(0)
  await checkAccessibility()

  await tickets.getByRole("link", { name: "Brynja la Rousse" }).click()
  await expect(page).toHaveURL(`/records/${BRYNJA.id}`)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Brynja la Rousse"
  )
})

test("an account that opened no support ticket says so", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${ALDIS.id}`)

  await expect(
    page.getByRole("region", { name: "Tickets de support" })
  ).toContainText("Aucun ticket de support archivé pour ce compte.")
  await checkAccessibility()
})

test("the tickets come last in a record: under the history, on the left, with the sanctions staying in view down to the last ticket from 1,280 px, and in one column, after the history, below", async ({
  page,
  logIn,
}) => {
  const main = page.getByRole("main")
  const details = main.getByRole("region", { name: "Détails" })
  const history = main.getByRole("region", {
    name: "Historique des sanctions",
  })
  const sanctions = main.getByRole("region", { name: "Sanctions", exact: true })
  const tickets = main.getByRole("region", { name: "Tickets de support" })
  async function boxOf(region: typeof tickets) {
    const box = await region.boundingBox()
    if (box === null) {
      throw new Error("A region of the record is not shown.")
    }
    return box
  }

  await page.setViewportSize({ width: 1280, height: 1000 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await expect(tickets).toContainText("Launcher réinstallé")

  const wide = {
    details: await boxOf(details),
    history: await boxOf(history),
    sanctions: await boxOf(sanctions),
    tickets: await boxOf(tickets),
  }
  expect(wide.sanctions.height).toBeGreaterThan(
    wide.details.height + wide.history.height
  )
  expect(wide.tickets.x).toBe(wide.history.x)
  expect(wide.tickets.y - (wide.history.y + wide.history.height)).toBeCloseTo(
    wide.history.y - (wide.details.y + wide.details.height),
    0
  )
  expect(wide.sanctions.x).toBeGreaterThan(wide.tickets.x + wide.tickets.width)

  await tickets.getByRole("listitem").last().scrollIntoViewIfNeeded()
  expect((await boxOf(sanctions)).y).toBe(24)

  for (const width of [1024, 768, 360]) {
    await page.setViewportSize({ width, height: 400 })
    const narrow = {
      history: await boxOf(history),
      tickets: await boxOf(tickets),
    }
    expect(narrow.tickets.x, `at ${width} px`).toBe(narrow.history.x)
    expect(narrow.tickets.y, `at ${width} px`).toBeGreaterThan(
      narrow.history.y + narrow.history.height
    )
  }
})

test.describe("an account cited in more than 100 archives", () => {
  test.use({
    discordState: {
      ...STATE,
      channelMessages: [
        ...Array.from({ length: 100 }, (_, index) =>
          ticket(CORVUS.id, {
            closerId: ALDIS.id,
            reason: `Fermé par Aldis ${index}`,
          })
        ),
        ticket(ALDIS.id, { closerId: BRYNJA.id, reason: "Ouvert par Aldis" }),
      ],
    },
  })

  test("the record shows the tickets among the 100 newest archives that cite it, and says that its older tickets may not show", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const tickets = page.getByRole("region", { name: "Tickets de support" })

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.goto(`/records/${ALDIS.id}`)

    await expect(tickets.getByRole("listitem")).toHaveCount(1)
    await expect(tickets).toContainText("Ouvert par Aldis")
    await expect(tickets).toContainText(
      "Seules les 100 archives les plus récentes où ce compte apparaît, qu’il les ait ouvertes ou fermées, ont été lues : ses tickets plus anciens ne s’affichent peut-être pas."
    )
    await checkAccessibility()
  })
})
