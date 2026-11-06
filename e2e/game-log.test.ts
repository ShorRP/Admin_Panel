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
        target: null,
        reason: "Déconnexion",
      }),
      line("2026-11-04T09:00:00Z", "0b0b0b0b", {
        action: "administration:workshop:create",
        character: "Lyra",
        account: "2094594321",
        target: null,
        reason: "Atelier de test",
        place: "1a2b:Shor-City.esp · 4, 5, 6",
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
          {
            character: "Filler",
            action: "administration:fill",
            account: "1",
            target: null,
            place: "2f:Fillers.esp · 0, 0, 0",
          }
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
  await expect(disconnect).not.toContainText("Cible")

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
  await expect(lines).toHaveCount(4)
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
  const query = () => Object.fromEntries(new URL(page.url()).searchParams)

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  await text.fill("disconnect")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect.poll(query).toMatchObject({ text: "disconnect" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Lyra")
  await expect(text).toHaveValue("disconnect")
  await checkAccessibility()

  await text.fill("introuvable")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect.poll(query).toMatchObject({ text: "introuvable" })
  await expect(
    page.getByText(
      "Aucune ligne du journal du jeu ne correspond à ces filtres."
    )
  ).toBeVisible()
  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
  await expect(text).toHaveValue("")
})

test("a category chosen in the pills keeps the lines of that category, in the address, and the form keeps it", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const pills = page.getByRole("navigation", {
    name: "Filtrer par catégorie",
  })
  const query = () => Object.fromEntries(new URL(page.url()).searchParams)

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  await expect(pills.getByRole("link")).toHaveText([
    "Tout",
    "Administration",
    "Personnages",
  ])
  await expect(pills.getByRole("link", { name: "Tout" })).toHaveAttribute(
    "aria-current",
    "true"
  )

  await pills.getByRole("link", { name: "Personnages" }).click()
  await expect(page).toHaveURL("/game-log?category=characters")
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Personnages · character:disconnect")
  await expect(
    pills.getByRole("link", { name: "Personnages" })
  ).toHaveAttribute("aria-current", "true")
  await checkAccessibility()

  await page.getByLabel("Personnage").fill("lyra")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect
    .poll(query)
    .toMatchObject({ category: "characters", character: "lyra" })
  await expect(lines).toHaveCount(1)

  await pills.getByRole("link", { name: "Administration" }).click()
  await expect(page).toHaveURL(
    "/game-log?category=administration&character=lyra"
  )
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("administration:workshop:create")
  await expect(page.getByLabel("Personnage")).toHaveValue("lyra")

  await pills.getByRole("link", { name: "Tout" }).click()
  await expect(page).toHaveURL("/game-log?character=lyra")
  await expect(lines).toHaveCount(2)

  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Personnage")).toHaveValue("")
})

test("an action, a character, a game account, a target, a cell, a plugin and a reason each keep the lines they find, in the address, and the form holds what was searched", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const filter = page.getByRole("button", { name: "Filtrer" })
  const query = () => Object.fromEntries(new URL(page.url()).searchParams)
  const noLine = page.getByText(
    "Aucune ligne du journal du jeu ne correspond à ces filtres."
  )

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()

  await page.getByLabel("Action").fill("heal")
  await filter.click()
  await expect.poll(query).toMatchObject({ action: "heal" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("administration:heal")
  await expect(page.getByLabel("Action")).toHaveValue("heal")
  await checkAccessibility()

  await page.getByLabel("Action").fill("hea")
  await filter.click()
  await expect(noLine).toBeVisible()

  await page.getByLabel("Action").fill("workshop create")
  await filter.click()
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("administration:workshop:create")

  await page.getByLabel("Action").fill("")
  await page.getByLabel("Personnage").fill("merida")
  await filter.click()
  await expect.poll(query).toMatchObject({ character: "merida" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Merida · compte 2094594320")

  await page.getByLabel("Personnage").fill("")
  await page.getByLabel("Compte de jeu").fill("2094594321")
  await filter.click()
  await expect.poll(query).toMatchObject({ account: "2094594321" })
  await expect(lines).toHaveCount(2)
  await expect(lines.first()).toContainText("Lyra · compte 2094594321")

  await page.getByLabel("Compte de jeu").fill("abc")
  await filter.click()
  await expect.poll(query).toMatchObject({ account: "abc" })
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Compte de jeu")).toHaveValue("")

  await page.getByLabel("Cible").fill("4278190080")
  await filter.click()
  await expect.poll(query).toMatchObject({ target: "4278190080" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Cible : 4278190080")
  await checkAccessibility()

  await page.getByLabel("Cible").fill("")
  await page.getByLabel("Cellule").fill("3c")
  await filter.click()
  await expect.poll(query).toMatchObject({ cell: "3c" })
  await expect(lines).toHaveCount(2)
  await expect(lines.first()).toContainText("3c:Skyrim.esm")

  await page.getByLabel("Cellule").fill("")
  await page.getByLabel("Plugin").fill("shor-city")
  await filter.click()
  await expect.poll(query).toMatchObject({ plugin: "shor-city" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("1a2b:Shor-City.esp")

  await page.getByLabel("Cellule").fill("3c")
  await filter.click()
  await expect(noLine).toBeVisible()

  await page.getByLabel("Cellule").fill("")
  await page.getByLabel("Plugin").fill("")
  await page.getByLabel("Motif").fill("atelier")
  await filter.click()
  await expect.poll(query).toMatchObject({ reason: "atelier" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Motif : Atelier de test")
  await checkAccessibility()

  await page.getByLabel("Motif").fill("introuvable")
  await filter.click()
  await expect(noLine).toBeVisible()
  await expect(page.getByLabel("Motif")).toHaveValue("introuvable")
  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
  await expect(page).toHaveURL("/game-log")
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Motif")).toHaveValue("")
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
  const query = () => Object.fromEntries(new URL(page.url()).searchParams)

  await logIn(ALDIS)
  await page.goto("/game-log")
  await page.waitForLoadState()
  await from.fill("2026-11-03")
  await to.fill("2026-11-03")
  await filter.click()
  await expect
    .poll(query)
    .toMatchObject({ from: "2026-11-03", to: "2026-11-03" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Serveur redémarré")
  await expect(from).toHaveValue("2026-11-03")
  await expect(to).toHaveValue("2026-11-03")
  await checkAccessibility()

  await from.fill("2026-11-04")
  await to.fill("2026-11-04")
  await page.getByLabel("Texte").fill("heal")
  await filter.click()
  await expect
    .poll(query)
    .toMatchObject({ text: "heal", from: "2026-11-04", to: "2026-11-04" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("administration:heal")

  await from.fill("2026-11-05")
  await to.fill("2026-11-04")
  await filter.click()
  await expect
    .poll(query)
    .toMatchObject({ text: "heal", from: "2026-11-05", to: "2026-11-04" })
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

test("a staff member logs out from the game log with its pills, its pagination and its form in view, and no page is prefetched", async ({
  page,
  logIn,
  prefetchedPaths,
}) => {
  await page.setViewportSize({ width: 1280, height: 6000 })
  await logIn(ALDIS)
  await page.goto("/game-log?character=filler")
  await page.waitForLoadState()
  const pills = page
    .getByRole("navigation", { name: "Filtrer par catégorie" })
    .getByRole("link")
  const reset = page.getByRole("link", { name: "Réinitialiser" })
  const older = page.getByRole("link", { name: "Plus anciens" })
  const filter = page.getByRole("button", { name: "Filtrer" })
  await expect(older).toBeInViewport()
  await expect(filter).toBeInViewport()
  await expect(pills.first()).toBeInViewport()
  await expect(pills.last()).toBeInViewport()
  await expect(reset).toBeInViewport()

  await logOutWithScriptsHeld(page, [
    pills.first(),
    pills.last(),
    reset,
    older,
    filter,
  ])

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

  const pills = page
    .getByRole("navigation", { name: "Filtrer par catégorie" })
    .getByRole("link")
  await expect(pills).toHaveText(["Tout", "Administration", "Personnages"])
  for (const pill of await pills.all()) {
    expect((await pill.boundingBox())?.height).toBe(44)
  }
  await pills.filter({ hasText: "Personnages" }).click()
  await expect(page).toHaveURL("/game-log?category=characters")
  await expect(lines).toHaveCount(1)

  await fold.click()
  await expect(sheet).toBeVisible()
  await sheet.getByLabel("Action").fill("disconnect")
  await sheet.getByLabel("Personnage").fill("lyra")
  await sheet.getByLabel("Compte de jeu").fill("2094594321")
  await sheet.getByLabel("Cellule").fill("3c")
  await sheet.getByLabel("Plugin").fill("skyrim")
  await sheet.getByLabel("Motif").fill("déconnexion")
  await sheet.getByLabel("Texte").fill("lyra")
  await sheet.getByLabel("Du", { exact: true }).fill("2026-11-04")
  await sheet.getByLabel("Au", { exact: true }).fill("2026-11-04")
  await sheet.getByRole("button", { name: "Filtrer" }).click()
  await expect(sheet).toBeHidden()
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toMatchObject({
      category: "characters",
      action: "disconnect",
      character: "lyra",
      account: "2094594321",
      cell: "3c",
      plugin: "skyrim",
      reason: "déconnexion",
      text: "lyra",
      from: "2026-11-04",
      to: "2026-11-04",
    })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("character:disconnect")
  await expect(fold).toHaveAccessibleName(/^Filtres\s?9 filtres actifs$/)
  await expect(chips.getByRole("link")).toHaveText([
    "Retirer le filtre Action : disconnect",
    "Retirer le filtre Personnage : lyra",
    "Retirer le filtre Compte de jeu : 2094594321",
    "Retirer le filtre Cellule : 3c",
    "Retirer le filtre Plugin : skyrim",
    "Retirer le filtre Motif : déconnexion",
    "Retirer le filtre Texte : lyra",
    "Retirer le filtre Du : 4 nov. 2026",
    "Retirer le filtre Au : 4 nov. 2026",
  ])
  for (const chip of await chips.getByRole("link").all()) {
    expect((await chip.boundingBox())?.height).toBe(44)
  }
  await checkAccessibility()

  await chips.getByRole("link").first().click()
  await expect(chips.getByRole("link")).toHaveCount(8)
  await expect(page).toHaveURL(/category=characters/)
  await expect(page).not.toHaveURL(/action=/)
  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
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

const TEN_FIELDS = [
  "Action",
  "Personnage",
  "Compte de jeu",
  "Cible",
  "Cellule",
  "Plugin",
  "Motif",
  "Texte",
  "Du",
  "Au",
] as const

test.describe("on a 768 px screen", () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test("the rail stands at the left, the ten fields stay in the page's form with no button and no chip, the pills are 44 px high, and the form sends the address of the sheet", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const pills = page
      .getByRole("navigation", { name: "Filtrer par catégorie" })
      .getByRole("link")

    await logIn(ALDIS)
    await page.goto("/game-log?category=characters")
    await page.waitForLoadState()
    expect((await page.getByRole("complementary").boundingBox())?.width).toBe(
      64
    )
    await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0)
    await expect(
      page.getByRole("list", { name: "Filtres actifs" })
    ).toHaveCount(0)
    for (const pill of await pills.all()) {
      expect((await pill.boundingBox())?.height).toBe(44)
    }
    for (const label of TEN_FIELDS) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await page.getByLabel("Action").fill("disconnect")
    await page.getByLabel("Personnage").fill("lyra")
    await page.getByLabel("Compte de jeu").fill("2094594321")
    await page.getByLabel("Cellule").fill("3c")
    await page.getByLabel("Plugin").fill("skyrim")
    await page.getByLabel("Motif").fill("déconnexion")
    await page.getByLabel("Texte").fill("lyra")
    await page.getByLabel("Du", { exact: true }).fill("2026-11-04")
    await page.getByLabel("Au", { exact: true }).fill("2026-11-04")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
      .toEqual({
        category: "characters",
        action: "disconnect",
        character: "lyra",
        account: "2094594321",
        target: "",
        cell: "3c",
        plugin: "skyrim",
        reason: "déconnexion",
        text: "lyra",
        from: "2026-11-04",
        to: "2026-11-04",
      })
    await expect(
      page.getByRole("main").locator("ol").getByRole("listitem")
    ).toHaveCount(1)
    await checkAccessibility()
  })
})

test.describe("on a 1,024 px screen", () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test("the sidebar stands at the left, the fields of the page's form sit in view, in lines of the page's column, and the form sends the same address", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    await logIn(ALDIS)
    await page.goto("/game-log?category=characters")
    await page.waitForLoadState()
    expect((await page.getByRole("complementary").boundingBox())?.width).toBe(
      252
    )
    await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0)
    const fields = TEN_FIELDS.map((label) =>
      page.getByLabel(label, { exact: true })
    )
    const main = await page.getByRole("main").boundingBox()
    for (const field of fields) {
      await expect(field).toBeVisible()
      const box = await field.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(main?.x ?? 0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        (main?.x ?? 0) + (main?.width ?? 0)
      )
    }
    await fields[0]?.fill("disconnect")
    await fields[1]?.fill("lyra")
    await fields[2]?.fill("2094594321")
    await fields[4]?.fill("3c")
    await fields[5]?.fill("skyrim")
    await fields[6]?.fill("déconnexion")
    await fields[7]?.fill("lyra")
    await fields[8]?.fill("2026-11-04")
    await fields[9]?.fill("2026-11-04")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
      .toEqual({
        category: "characters",
        action: "disconnect",
        character: "lyra",
        account: "2094594321",
        target: "",
        cell: "3c",
        plugin: "skyrim",
        reason: "déconnexion",
        text: "lyra",
        from: "2026-11-04",
        to: "2026-11-04",
      })
    await expect(
      page.getByRole("main").locator("ol").getByRole("listitem")
    ).toHaveCount(1)
    await checkAccessibility()
  })
})
