import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { archiveMessage } from "@/ticket-archives/archive-message"
import {
  ARCHIVES_CHANNEL_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { minifiedReactError } from "./minified-react-error"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 5 }

const MODERATION = { id: MODERATION_ROLE_ID, name: "Modération", position: 4 }

const LONG_WORD = "x".repeat(300)

function ticket(openerId: string, overrides = {}) {
  return archiveMessage({
    channelId: ARCHIVES_CHANNEL_ID,
    openerId,
    ...overrides,
  })
}

const MEMBERS = [
  { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
  { user: BRYNJA, nick: "Brynja la Rousse", roles: [STAFF.id] },
  { user: LYRA },
  { user: CORVUS },
]

const THREE_TICKETS = [
  ticket(LYRA.id, {
    kind: "🔧 Problème technique",
    openedAt: new Date("2026-10-20T08:00:00Z"),
    closedAt: new Date("2026-10-20T08:45:00Z"),
    closerId: BRYNJA.id,
    reason: "Launcher réinstallé",
  }),
  ticket(CORVUS.id, {
    openedAt: new Date("2026-10-22T10:00:00Z"),
    closedAt: new Date("2026-10-22T10:10:00Z"),
    closerId: ALDIS.id,
    reason: "Ticket de Corvus",
  }),
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
]

const NEWEST_FIRST = [
  `🚨 Signaler un joueurOuvert parLyra3 nov. 2026, 15:32Fermé paraldis3 nov. 2026, 16:10Motif : ${LONG_WORD}`,
  "Type de demande inconnuOuvert parLyra25 oct. 2026, 19:10Fermé parhaldor25 oct. 2026, 19:20Motif : Ticket renommé",
  "🔧 Problème techniqueOuvert parcorvus22 oct. 2026, 12:00Fermé paraldis22 oct. 2026, 12:10Motif : Ticket de Corvus",
  "🔧 Problème techniqueOuvert parLyra20 oct. 2026, 10:00Fermé parBrynja la Rousse20 oct. 2026, 10:45Motif : Launcher réinstallé",
]

test.describe("a few tickets", () => {
  test.use({
    discordState: {
      members: MEMBERS,
      users: [HALDOR],
      channelMessages: THREE_TICKETS,
    },
  })

  test("a staff member who does not moderate finds « Tickets de support » under « Support », and reads the archives the application posted, newest first, with the opener and the closer as text", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const sidebar = page.getByRole("complementary")
    const main = page.getByRole("main")

    await logIn(BRYNJA)
    await expect(page).toHaveURL("/blocked-words")
    await expect(
      sidebar
        .getByRole("list", { name: "Support" })
        .getByRole("link", { name: "Tickets de support" })
    ).toBeVisible()
    await sidebar.getByRole("link", { name: "Tickets de support" }).click()

    await expect(page).toHaveURL("/support-tickets")
    await expect(page).toHaveTitle("Tickets de support – Panel de Shor")
    await expect(
      sidebar.getByRole("link", { name: "Tickets de support" })
    ).toHaveAttribute("aria-current", "page")
    await expect(
      main.getByRole("heading", { level: 1, name: "Tickets de support" })
    ).toBeVisible()
    await expect(main.getByRole("listitem")).toHaveText(NEWEST_FIRST)
    await expect(page.getByText("Forgé par un membre")).toHaveCount(0)
    await expect(main.getByRole("list", { name: "1–4 sur 4" })).toBeVisible()
    await expect(main.getByRole("link")).toHaveCount(0)
    await expect(main.getByRole("navigation")).toHaveCount(0)
    await checkAccessibility()
  })

  test("a staff member who moderates follows the opener and the closer of an archive to their record", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const main = page.getByRole("main")

    await logIn(ALDIS)
    await page.goto("/support-tickets")

    await expect(main.getByRole("listitem")).toHaveText(NEWEST_FIRST)
    const links = await main
      .getByRole("link")
      .evaluateAll((elements) =>
        elements.map((link) => [link.textContent, link.getAttribute("href")])
      )
    expect(links).toEqual([
      ["Lyra", `/records/${LYRA.id}`],
      ["aldis", `/records/${ALDIS.id}`],
      ["Lyra", `/records/${LYRA.id}`],
      ["haldor", `/records/${HALDOR.id}`],
      ["corvus", `/records/${CORVUS.id}`],
      ["aldis", `/records/${ALDIS.id}`],
      ["Lyra", `/records/${LYRA.id}`],
      ["Brynja la Rousse", `/records/${BRYNJA.id}`],
    ])
    await checkAccessibility()

    await main.getByRole("link", { name: "Brynja la Rousse" }).click()
    await expect(page).toHaveURL(`/records/${BRYNJA.id}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Brynja la Rousse"
    )
  })

  test("a staff member logs out from the page of the archives, with the links to the records in view while the next page's script loads, and no page is prefetched", async ({
    page,
    logIn,
    prefetchedPaths,
    checkAccessibility,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1600 })
    await logIn(ALDIS)
    await page.goto("/support-tickets")
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(4)
    await checkAccessibility()

    const links = await page.getByRole("main").getByRole("link").all()
    expect(links).toHaveLength(8)
    for (const link of links) {
      await expect(link).toBeInViewport()
    }
    await logOutWithScriptsHeld(page, links)
    expect(prefetchedPaths).toEqual([])
  })
})

test.describe("sixty tickets", () => {
  test.use({
    discordState: {
      members: MEMBERS,
      channelMessages: Array.from({ length: 60 }, (_, index) =>
        ticket(CORVUS.id, { closerId: ALDIS.id, reason: `Archive ${index}` })
      ),
    },
  })

  test("the archives are paged 25 at a time through the page's numbers, arrows and URL, and a page that does not exist is the first", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const main = page.getByRole("main")
    const pagination = main.getByRole("navigation", {
      name: "Pages des archives",
    })
    function archivesNamed(name: string) {
      return main.getByRole("list", { name }).getByRole("listitem")
    }

    await logIn(BRYNJA)
    await page.goto("/support-tickets")

    await expect(archivesNamed("1–25 sur 60")).toHaveCount(25)
    await expect(archivesNamed("1–25 sur 60").first()).toContainText(
      "Motif : Archive 59"
    )
    await expect(pagination.getByRole("link", { name: "Page 1" })).toHaveCount(
      0
    )
    await expect(
      pagination.getByRole("link", { name: "Page précédente" })
    ).toHaveCount(0)
    await checkAccessibility()

    await pagination.getByRole("link", { name: "Page suivante" }).click()
    await expect(page).toHaveURL("/support-tickets?page=2")
    await expect(archivesNamed("26–50 sur 60")).toHaveCount(25)
    await expect(archivesNamed("26–50 sur 60").first()).toContainText(
      "Motif : Archive 34"
    )
    await expect(page.getByText("Motif : Archive 59")).toHaveCount(0)
    await checkAccessibility()

    await pagination.getByRole("link", { name: "Page 3" }).click()
    await expect(page).toHaveURL("/support-tickets?page=3")
    await expect(archivesNamed("51–60 sur 60")).toHaveCount(10)
    await expect(archivesNamed("51–60 sur 60").last()).toContainText(
      "Motif : Archive 0"
    )
    await expect(
      pagination.getByRole("link", { name: "Page suivante" })
    ).toHaveCount(0)

    await pagination.getByRole("link", { name: "Page précédente" }).click()
    await expect(page).toHaveURL("/support-tickets?page=2")
    await expect(archivesNamed("26–50 sur 60")).toHaveCount(25)

    await pagination.getByRole("link", { name: "Page 1" }).click()
    await expect(page).toHaveURL("/support-tickets")
    await expect(archivesNamed("1–25 sur 60")).toHaveCount(25)

    for (const notAPage of ["9", "0", "abc", "2.5", "401"]) {
      await page.goto(`/support-tickets?page=${notAPage}`)
      await expect(archivesNamed("1–25 sur 60")).toHaveCount(25)
    }
  })

  test("a staff member logs out from the middle page, with the navigation between the pages in view while the next page's script loads, and no page is prefetched", async ({
    page,
    logIn,
    prefetchedPaths,
    checkAccessibility,
  }) => {
    const pagination = page
      .getByRole("main")
      .getByRole("navigation", { name: "Pages des archives" })

    await logIn(BRYNJA)
    await page.goto("/support-tickets?page=2")
    await expect(pagination.getByRole("link", { name: "Page 3" })).toBeVisible()
    await checkAccessibility()

    await pagination.scrollIntoViewIfNeeded()
    const links = await pagination.getByRole("link").all()
    expect(links).toHaveLength(4)
    for (const link of links) {
      await expect(link).toBeInViewport()
    }
    await logOutWithScriptsHeld(page, links)
    expect(prefetchedPaths).toEqual([])
  })
})

test.describe("no ticket", () => {
  test.use({ discordState: { members: MEMBERS } })

  test("an archives channel with no archive says so, with no list and no navigation", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    await logIn(BRYNJA)
    await page.goto("/support-tickets")

    const main = page.getByRole("main")
    await expect(main).toContainText("Aucune archive de ticket à afficher.")
    await expect(main.getByRole("listitem")).toHaveCount(0)
    await expect(main.getByRole("navigation")).toHaveCount(0)
    await checkAccessibility()
  })

  test("a rate limit of the search that Discord's answer outlasts shows the error page, with its reference, then « Réessayer » shows the page", async ({
    page,
    discord,
    logIn,
    checkAccessibility,
    browserConsole,
  }) => {
    const main = page.getByRole("main")
    browserConsole.expectProblems([
      `console.error: Error: ${minifiedReactError(441)}`,
      `pageerror: ${minifiedReactError(419)}`,
    ])

    await logIn(BRYNJA)
    await expect(page).toHaveURL("/blocked-words")
    await page.waitForLoadState()
    discord.failNext(
      "searchMessages",
      new DiscordError({
        method: "GET",
        route: ROUTES.guildMessagesSearch,
        status: 429,
        retryAfter: 4.4,
      })
    )

    await page.goto("/support-tickets")

    await expect(
      page.getByRole("heading", { level: 1, name: "Page indisponible" })
    ).toBeVisible()
    await expect(main).toContainText(
      /^Page indisponibleLe panel n’a pas pu afficher cette page\. Discord ne répond peut-être pas\s: réessaie dans un instant\. Si ça continue, signale-le dans #créer-ticket avec la référence \d+\.Réessayer$/
    )
    await expect(
      page.getByRole("complementary", { includeHidden: true })
    ).toHaveCount(0)
    await checkAccessibility()

    await main.getByRole("button", { name: "Réessayer" }).click()

    await expect(
      page.getByText("Aucune archive de ticket à afficher.")
    ).toBeVisible()
    await expect(page.getByRole("complementary")).toContainText("Brynja")
    await checkAccessibility()
  })
})
