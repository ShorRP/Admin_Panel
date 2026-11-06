import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { gameLogChannel, gameLogMessage } from "@/game-log/game-log-message"
import {
  GAME_LOG_CHANNEL_ID,
  GAME_LOG_WEBHOOK_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { minifiedReactError } from "./minified-react-error"

const DEVELOPERS_ID = "1300000000000000060"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const FORGER = { id: "1400000000000000009", username: "forgeron" }

const GUILD_ID = "1100000000000000000"

const FILLERS = 25

function line(sentAt: string, hash: string, extra: object = {}) {
  return gameLogMessage({
    channelId: GAME_LOG_CHANNEL_ID,
    webhookId: GAME_LOG_WEBHOOK_ID,
    sentAt: new Date(sentAt),
    hash,
    ...extra,
  })
}

test.use({
  discordState: {
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 2 },
      { id: DEVELOPERS_ID, name: "Développeurs", position: 1 },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, DEVELOPERS_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
      { user: FORGER },
    ],
    channels: [
      gameLogChannel({
        id: GAME_LOG_CHANNEL_ID,
        viewerRoleIds: [DEVELOPERS_ID],
      }),
    ],
    channelMessages: [
      line("2026-11-04T09:12:00Z", "189b92f6"),
      line("2026-11-04T08:30:00Z", "0a1b2c3d", {
        category: "Personnages",
        action: "character:disconnect",
        character: "Lyra",
        account: "2094594321",
        reason: "Déconnexion",
      }),
      {
        channelId: GAME_LOG_CHANNEL_ID,
        authorId: GAME_LOG_WEBHOOK_ID,
        sentAt: new Date("2026-11-03T22:30:00Z"),
        embeds: [
          {
            title: "Serveur redémarré",
            description: "Redémarrage planifié",
            fields: [{ name: "Durée", value: "12 s" }],
          },
        ],
      },
      {
        ...line("2026-11-04T09:30:00Z", "deadbeef", {
          character: "Faussaire",
        }),
        authorId: FORGER.id,
      },
      ...Array.from({ length: FILLERS }, (_, index) =>
        line(
          new Date(Date.UTC(2026, 9, 30, 10, index)).toISOString(),
          `f${index.toString(16).padStart(7, "0")}`,
          { character: "Filler", action: "administration:fill" }
        )
      ),
    ],
  },
})

function parisDay(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }).format(new Date(date))
}

test("a staff member who views the channel on Discord finds the game log under « Journaux », and reads its lines newest first under the day of Paris, each with a link to its message and none of another author's", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const sidebar = page.getByRole("complementary")
  const main = page.getByRole("main")
  const lines = main.locator("ol").getByRole("listitem")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  const logs = sidebar.getByRole("list", { name: "Journaux" })
  await expect(logs.getByRole("link")).toHaveText([
    "Journal d’audit",
    "Journal du jeu",
  ])

  await logs.getByRole("link", { name: "Journal du jeu" }).click()
  await expect(page).toHaveURL("/game-log")
  await expect(page).toHaveTitle("Journal du jeu – Panel de Shor")
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal du jeu" })
  ).toBeVisible()
  await expect(
    logs.getByRole("link", { name: "Journal du jeu" })
  ).toHaveAttribute("aria-current", "page")
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: parisDay("2026-11-04T09:12:00Z"),
      exact: true,
    })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: parisDay("2026-11-03T22:30:00Z"),
      exact: true,
    })
  ).toBeVisible()
  await expect(lines).toHaveCount(25)
  await expect(main).not.toContainText("Faussaire")

  const heal = lines.first()
  await expect(heal).toContainText("10:12")
  await expect(heal).toContainText("Administration · administration:heal")
  await expect(heal).toContainText("Merida · compte 2094594320")
  await expect(heal).toContainText("Cible : 4278190080")
  await expect(heal).toContainText("Lieu : 3c:Skyrim.esm · 3816, -5303, -5681")
  await expect(heal).toContainText("Identifiant : 189b92f6")
  const toDiscord = heal.getByRole("link", { name: "Voir dans Discord" })
  await expect(toDiscord).toHaveAttribute(
    "href",
    new RegExp(
      `^https://discord\\.com/channels/${GUILD_ID}/${GAME_LOG_CHANNEL_ID}/\\d+$`
    )
  )
  await expect(toDiscord).toHaveAttribute("target", "_blank")

  const disconnect = lines.filter({ hasText: "character:disconnect" })
  await expect(disconnect).toContainText("Lyra · compte 2094594321")
  await expect(disconnect).toContainText("Motif : Déconnexion")

  const raw = lines.filter({ hasText: "Serveur redémarré" })
  await expect(raw).toContainText("Redémarrage planifié")
  await expect(raw).toContainText("Durée : 12 s")
  await expect(
    raw.getByRole("link", { name: "Voir dans Discord" })
  ).toBeVisible()
  await checkAccessibility()
})

test("the older lines come through « Plus anciens », by the ID of the last line, and « Revenir aux plus récents » brings the newest back", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")

  await logIn(ALDIS)
  await page.goto("/game-log")
  await expect(lines).toHaveCount(25)
  await expect(
    page.getByRole("link", { name: "Revenir aux plus récents" })
  ).toHaveCount(0)

  await page.getByRole("link", { name: "Plus anciens" }).click()
  await expect(page).toHaveURL(
    /^http:\/\/localhost:3100\/game-log\?before=\d+$/
  )
  await expect(lines).toHaveCount(3)
  await expect(page.getByText(/^Jusqu’au /)).toBeVisible()
  await expect(page.getByRole("link", { name: "Plus anciens" })).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Revenir aux plus récents" }).click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
})

test("a text finds the lines whose words it holds, in the address, and a text that finds nothing says so and offers to reset", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const text = page.getByLabel("Texte")

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  await text.fill("disconnect")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(page).toHaveURL("/game-log?text=disconnect&from=&to=")
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Lyra")
  await expect(text).toHaveValue("disconnect")
  await checkAccessibility()

  await text.fill("introuvable")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(page).toHaveURL("/game-log?text=introuvable&from=&to=")
  await expect(
    page.getByText(
      "Aucune ligne du journal du jeu ne correspond à ces filtres."
    )
  ).toBeVisible()
  await page.getByRole("link", { name: "Réinitialiser" }).click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
  await expect(text).toHaveValue("")
})

test("a period keeps the lines of its days of Paris, in the address, with a text beside it, and a period that ends before it starts reads nothing", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const from = page.getByLabel("Du", { exact: true })
  const to = page.getByLabel("Au", { exact: true })
  const filter = page.getByRole("button", { name: "Filtrer" })

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  await from.fill("2026-11-03")
  await to.fill("2026-11-03")
  await filter.click()
  await expect(page).toHaveURL("/game-log?text=&from=2026-11-03&to=2026-11-03")
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Serveur redémarré")
  await expect(from).toHaveValue("2026-11-03")
  await expect(to).toHaveValue("2026-11-03")
  await checkAccessibility()

  await from.fill("2026-11-04")
  await to.fill("2026-11-04")
  await page.getByLabel("Texte").fill("heal")
  await filter.click()
  await expect(page).toHaveURL(
    "/game-log?text=heal&from=2026-11-04&to=2026-11-04"
  )
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("administration:heal")

  await from.fill("2026-11-05")
  await to.fill("2026-11-04")
  await filter.click()
  await expect(page).toHaveURL(
    "/game-log?text=heal&from=2026-11-05&to=2026-11-04"
  )
  await expect(
    page.getByText(
      "Aucune ligne du journal du jeu ne correspond à ces filtres."
    )
  ).toBeVisible()
  await checkAccessibility()
})

test("a staff member who does not view the channel on Discord has no link, and the page shows the not-found page, beside the navigation, though their tab still names it", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const sidebar = page.getByRole("complementary")

  await logIn(BRYNJA)
  await expect(page).toHaveURL("/blocked-words")
  await expect(sidebar).toContainText("brynja")
  await page.waitForLoadState()
  await expect(
    sidebar.getByRole("list", { name: "Journaux" }).getByRole("link")
  ).toHaveText(["Journal d’audit"])
  await expect(sidebar).not.toContainText("Journal du jeu")

  await page.goto("/game-log")
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" })
  ).toBeVisible()
  await expect(page.getByText("Lyra")).toHaveCount(0)
  await expect(sidebar).toContainText("brynja")
  await expect(sidebar).not.toContainText("Journal du jeu")
  await expect(page).toHaveTitle("Journal du jeu – Panel de Shor")
  await checkAccessibility()
})

test("a staff member logs out from the game log with its pagination and its form in view, and no page is prefetched", async ({
  page,
  logIn,
  prefetchedPaths,
}) => {
  await page.setViewportSize({ width: 1280, height: 6000 })
  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  const older = page.getByRole("link", { name: "Plus anciens" })
  const filter = page.getByRole("button", { name: "Filtrer" })
  await expect(older).toBeInViewport()
  await expect(filter).toBeInViewport()

  await logOutWithScriptsHeld(page, [older, filter])

  expect(prefetchedPaths).toEqual([])
})

test("on a 360 px screen, the menu leads to the game log, whose filters fold behind a button", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const menu = page.getByRole("dialog", { name: "Menu" })
  const fold = page.getByRole("button", { name: /^Filtres/ })
  const sheet = page.getByRole("dialog", { name: "Filtres" })
  const chips = page.getByRole("list", { name: "Filtres actifs" })
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")

  await page.setViewportSize({ width: 360, height: 760 })
  await logIn(ALDIS)
  await page.waitForLoadState()
  await page.getByRole("button", { name: "Ouvrir le menu" }).click()
  await menu.getByRole("link", { name: "Journal du jeu" }).click()
  await expect(page).toHaveURL("/game-log")
  await expect(menu).toBeHidden()
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Texte")).toBeHidden()
  await expect(chips).toHaveCount(0)
  await checkAccessibility()

  await fold.click()
  await expect(sheet).toBeVisible()
  await sheet.getByLabel("Texte").fill("heal")
  await sheet.getByLabel("Du", { exact: true }).fill("2026-11-04")
  await sheet.getByLabel("Au", { exact: true }).fill("2026-11-04")
  await sheet.getByRole("button", { name: "Filtrer" }).click()
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(
    "/game-log?text=heal&from=2026-11-04&to=2026-11-04"
  )
  await expect(lines).toHaveCount(1)
  await expect(fold).toHaveAccessibleName(/^Filtres\s?3 filtres actifs$/)
  await expect(chips.getByRole("link")).toHaveText([
    "Retirer le filtre Texte : heal",
    "Retirer le filtre Du : 4 nov. 2026",
    "Retirer le filtre Au : 4 nov. 2026",
  ])
  await checkAccessibility()

  await chips.getByRole("link").first().click()
  await expect(page).toHaveURL("/game-log?from=2026-11-04&to=2026-11-04")
  await expect(lines).toHaveCount(2)
  await chips.getByRole("link").first().click()
  await chips.getByRole("link").first().click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
})

test("Discord being unavailable while the log is read shows the error page, with its reference, then « Réessayer » shows the log", async ({
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

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  discord.failNext(
    "searchMessages",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMessagesSearch,
      status: 503,
    })
  )

  await page.goto("/game-log")

  await expect(
    page.getByRole("heading", { level: 1, name: "Page indisponible" })
  ).toBeVisible()
  await expect(main).toContainText(/avec la référence \d+\./)
  await checkAccessibility()

  await main.getByRole("button", { name: "Réessayer" }).click()

  await expect(
    page.getByRole("heading", { level: 1, name: "Journal du jeu" })
  ).toBeVisible()
  await expect(main.locator("ol").getByRole("listitem")).toHaveCount(25)
  await checkAccessibility()
})
