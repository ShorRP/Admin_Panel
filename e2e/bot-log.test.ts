import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10"

import { botLogChannel, botLogMessage } from "@/bot-log/bot-log-message"
import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import {
  BOT_LOG_CHANNEL_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { minifiedReactError } from "./minified-react-error"

const DEVELOPERS_ID = "1300000000000000060"

const MEMBER_ROLE_ID = "1400000000000000010"

const TICKET_CHANNEL_ID = "1400000000000000020"

const GONE_CHANNEL_ID = "1400000000000000021"

const FILLER_CHANNEL_ID = "1400000000000000022"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = { id: "1400000000000000003", username: "lyra" }

const CASSIAN = { id: "1400000000000000004", username: "cassian" }

const SKY_ID = "1400000000000000009"

const GUILD_ID = "1100000000000000000"

const FILLERS = 25

function line(
  example: Parameters<typeof botLogMessage>[0]["example"],
  sentAt: string,
  extra: Partial<Parameters<typeof botLogMessage>[0]> = {}
) {
  return botLogMessage({
    example,
    channelId: BOT_LOG_CHANNEL_ID,
    sentAt: new Date(sentAt),
    ...extra,
  })
}

test.use({
  discordState: {
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 3 },
      { id: MODERATION_ROLE_ID, name: "Modération", position: 2 },
      { id: DEVELOPERS_ID, name: "Développeurs", position: 1 },
      { id: MEMBER_ROLE_ID, name: "Membre", position: 0 },
    ],
    members: [
      {
        user: ALDIS,
        roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID, DEVELOPERS_ID],
      },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
      { user: LYRA, roles: [MEMBER_ROLE_ID] },
      { user: CASSIAN, roles: [STAFF_ROLE_ID, DEVELOPERS_ID] },
    ],
    channels: [
      botLogChannel({ id: BOT_LOG_CHANNEL_ID, viewerRoleIds: [DEVELOPERS_ID] }),
      {
        id: TICKET_CHANNEL_ID,
        name: "🎫・ticket-0042",
        permission_overwrites: [
          {
            id: STAFF_ROLE_ID,
            type: OverwriteType.Role,
            allow: String(PermissionFlagsBits.ViewChannel),
            deny: "0",
          },
        ],
      },
    ],
    channelMessages: [
      line("rules-membre-role-given", "2026-11-04T09:12:00Z", {
        ids: { "1400000000000000001": LYRA.id },
      }),
      line("tickets-ticket-opened", "2026-11-04T08:30:00Z", {
        ids: { "1400000000000000001": LYRA.id },
      }),
      line("tickets-ticket-closed", "2026-11-04T09:00:00Z", {
        ids: {
          "1400000000000000001": LYRA.id,
          "1400000000000000002": ALDIS.id,
        },
      }),
      line("voice-channels-channel-created", "2026-11-03T22:30:00Z", {
        ids: {
          "1400000000000000001": LYRA.id,
          [TICKET_CHANNEL_ID]: GONE_CHANNEL_ID,
        },
      }),
      {
        channelId: BOT_LOG_CHANNEL_ID,
        sentAt: new Date("2026-11-03T21:00:00Z"),
        embeds: [
          {
            title: "Serveur redémarré",
            description: "Redémarrage planifié",
            fields: [{ name: "Durée", value: "12 s" }],
          },
        ],
      },
      line("tickets-ticket-opened", "2026-11-04T09:30:00Z", {
        authorId: SKY_ID,
        ids: { "1400000000000000001": BRYNJA.id },
      }),
      ...Array.from({ length: FILLERS }, (_, index) =>
        line(
          "voice-channels-focus-mode-on",
          new Date(Date.UTC(2026, 9, 30, 10, index)).toISOString(),
          {
            ids: {
              "1400000000000000001": LYRA.id,
              [TICKET_CHANNEL_ID]: FILLER_CHANNEL_ID,
            },
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

test("a staff member who views the channel on Discord finds the Bot log last under « Journaux », and reads its lines newest first under the day of Paris, each with its fields, the names of its mentions and a link to its message, and none of Sky's", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const sidebar = page.getByRole("complementary")
  const main = page.getByRole("main")
  const lines = main.locator("ol").getByRole("listitem")

  await logIn(CASSIAN)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  const logs = sidebar.getByRole("list", { name: "Journaux" })
  await expect(logs.getByRole("link")).toHaveText([
    "Journal d’audit",
    "Journal du Bot",
  ])

  await logs.getByRole("link", { name: "Journal du Bot" }).click()
  await expect(page).toHaveURL("/bot-log")
  await expect(page).toHaveTitle("Journal du Bot – Panel de Shor")
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal du Bot" })
  ).toBeVisible()
  await expect(
    logs.getByRole("link", { name: "Journal du Bot" })
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
  await expect(
    page.getByRole("navigation", { name: "Filtrer par famille" })
  ).toBeVisible()

  const given = lines.first()
  await expect(given).toContainText("10:12")
  await expect(given).toContainText("Règlement · Rôle Membre donné")
  await expect(given).toContainText(
    "Membre : lyra · Rôle : Membre · Déclencheur : Réaction ✅"
  )
  const toDiscord = given.getByRole("link", { name: "Voir dans Discord" })
  await expect(toDiscord).toHaveAttribute(
    "href",
    new RegExp(
      `^https://discord\\.com/channels/${GUILD_ID}/${BOT_LOG_CHANNEL_ID}/\\d+$`
    )
  )
  await expect(toDiscord).toHaveAttribute("target", "_blank")

  const closed = lines.filter({ hasText: "Ticket fermé" })
  await expect(closed).toContainText("Tickets · Ticket fermé")
  await expect(closed).toContainText("Type de demande : 🔧 Problème technique")
  await expect(closed).toContainText("Ouvert par : lyra")
  await expect(closed).toContainText("Salon : #🎫・ticket-0042")
  await expect(closed).toContainText("Fermé par : aldis")
  await expect(closed).toContainText("Motif : Problème résolu")
  await expect(closed.getByRole("link")).toHaveCount(1)

  const gone = lines.filter({ hasText: "Vocal créé" })
  await expect(gone).toContainText(`Salon : ${GONE_CHANNEL_ID}`)

  const raw = lines.filter({ hasText: "Serveur redémarré" })
  await expect(raw).toContainText("Redémarrage planifié")
  await expect(raw).toContainText("Durée : 12 s")
  await expect(
    raw.getByRole("link", { name: "Voir dans Discord" })
  ).toBeVisible()
  await expect(lines.filter({ hasText: "Ticket ouvert" })).toHaveCount(1)
  await checkAccessibility()
})

test("a staff member who moderates finds each account of a line a link to its record, and one who does not reads their names as text", async ({
  page,
  logIn,
}) => {
  const closed = page
    .getByRole("main")
    .locator("ol")
    .getByRole("listitem")
    .filter({ hasText: "Ticket fermé" })

  await logIn(ALDIS)
  await page.goto("/bot-log")
  await expect(closed).toBeVisible()
  await expect(closed.getByRole("link", { name: "lyra" })).toHaveAttribute(
    "href",
    `/records/${LYRA.id}`
  )
  await expect(closed.getByRole("link", { name: "aldis" })).toHaveAttribute(
    "href",
    `/records/${ALDIS.id}`
  )
  await expect(closed.getByRole("link")).toHaveText([
    "lyra",
    "aldis",
    "Voir dans Discord",
  ])
})

test("the lines of a staff member who does not moderate show the accounts as text", async ({
  page,
  logIn,
}) => {
  const closed = page
    .getByRole("main")
    .locator("ol")
    .getByRole("listitem")
    .filter({ hasText: "Ticket fermé" })

  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await expect(closed).toContainText("Ouvert par : lyra")
  await expect(closed.getByRole("link")).toHaveText(["Voir dans Discord"])
})

test("the older lines come through « Plus anciens », by the ID of the last line, and « Revenir aux plus récents » brings the newest back", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")

  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await expect(lines).toHaveCount(25)
  await expect(
    page.getByRole("link", { name: "Revenir aux plus récents" })
  ).toHaveCount(0)

  await page.getByRole("link", { name: "Plus anciens" }).click()
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/bot-log\?before=\d+$/)
  await expect(lines).toHaveCount(5)
  await expect(page.getByText(/^Jusqu’au /)).toBeVisible()
  await expect(page.getByRole("link", { name: "Plus anciens" })).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Revenir aux plus récents" }).click()
  await expect(page).toHaveURL("/bot-log")
  await expect(lines).toHaveCount(25)
})

test("a family chosen in the pills keeps the lines of that family, in the address, and the form keeps it", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const pills = page.getByRole("navigation", { name: "Filtrer par famille" })

  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await page.waitForLoadState()
  await expect(pills.getByRole("link")).toHaveText([
    "Tout",
    "Règlement",
    "Vocaux",
    "Tickets",
    "Serveurs de jeu",
    "Sanctions automatiques",
  ])
  await expect(pills.getByRole("link", { name: "Tout" })).toHaveAttribute(
    "aria-current",
    "true"
  )

  await pills.getByRole("link", { name: "Tickets" }).click()
  await expect(page).toHaveURL("/bot-log?family=tickets")
  await expect(lines).toHaveCount(2)
  await expect(lines.first()).toContainText("Ticket fermé")
  await expect(pills.getByRole("link", { name: "Tickets" })).toHaveAttribute(
    "aria-current",
    "true"
  )
  await checkAccessibility()

  await page.getByLabel("Action").fill("ouvert")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toMatchObject({ family: "tickets", action: "ouvert" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Ticket ouvert")

  await pills.getByRole("link", { name: "Sanctions automatiques" }).click()
  await expect(page).toHaveURL(
    "/bot-log?family=automatic-sanctions&action=ouvert"
  )
  await expect(
    page.getByText(
      "Aucune ligne du Journal du Bot ne correspond à ces filtres."
    )
  ).toBeVisible()
  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
  await expect(page).toHaveURL("/bot-log")
  await expect(lines).toHaveCount(25)
})

test("an action, an account, a channel and a text each keep the lines they find, in the address, and the form holds what was searched", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const filter = page.getByRole("button", { name: "Filtrer" })
  const query = () => Object.fromEntries(new URL(page.url()).searchParams)

  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await page.waitForLoadState()

  await page.getByLabel("Action").fill("fermé")
  await filter.click()
  await expect.poll(query).toMatchObject({ action: "fermé" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Ticket fermé")
  await expect(page.getByLabel("Action")).toHaveValue("fermé")
  await checkAccessibility()

  await page.getByLabel("Action").fill("")
  await page.getByLabel("Compte").fill("aldis")
  await filter.click()
  await expect.poll(query).toMatchObject({ account: "aldis" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Fermé par : aldis")

  await page.getByLabel("Compte").fill(`<@${BRYNJA.id}>`)
  await filter.click()
  await expect(
    page.getByText(
      "Aucune ligne du Journal du Bot ne correspond à ces filtres."
    )
  ).toBeVisible()

  await page.getByLabel("Compte").fill("zzz")
  await filter.click()
  await expect(
    page.getByText(/^Aucun membre ni compte banni ne commence par/)
  ).toBeVisible()
  await expect(page.getByLabel("Compte")).toHaveValue("zzz")
  await checkAccessibility()

  await page.getByLabel("Compte").fill("")
  await page.getByLabel("Salon").fill("ticket-0042")
  await filter.click()
  await expect.poll(query).toMatchObject({ channel: "ticket-0042" })
  await expect(lines).toHaveCount(2)

  await page.getByLabel("Salon").fill(GONE_CHANNEL_ID)
  await filter.click()
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Vocal créé")

  await page.getByLabel("Salon").fill("")
  await page.getByLabel("Texte").fill("résolu")
  await filter.click()
  await expect.poll(query).toMatchObject({ text: "résolu" })
  await expect(lines).toHaveCount(1)
  await expect(lines).toContainText("Motif : Problème résolu")

  await page.getByLabel("Texte").fill("introuvable")
  await filter.click()
  await expect(
    page.getByText(
      "Aucune ligne du Journal du Bot ne correspond à ces filtres."
    )
  ).toBeVisible()
  await page.getByRole("link", { name: "Réinitialiser" }).first().click()
  await expect(page).toHaveURL("/bot-log")
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Texte")).toHaveValue("")
})

test("a period keeps the lines of its days of Paris, in the address, and a period that ends before it starts reads nothing", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const lines = page.getByRole("main").locator("ol").getByRole("listitem")
  const from = page.getByLabel("Du", { exact: true })
  const to = page.getByLabel("Au", { exact: true })
  const filter = page.getByRole("button", { name: "Filtrer" })

  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await page.waitForLoadState()
  await from.fill("2026-11-03")
  await to.fill("2026-11-03")
  await filter.click()
  await expect(lines).toHaveCount(2)
  await expect(lines.first()).toContainText("Vocal créé")
  await expect(lines.last()).toContainText("Serveur redémarré")
  await expect(from).toHaveValue("2026-11-03")
  await expect(to).toHaveValue("2026-11-03")
  await checkAccessibility()

  await from.fill("2026-11-05")
  await to.fill("2026-11-04")
  await filter.click()
  await expect(
    page.getByText(
      "Aucune ligne du Journal du Bot ne correspond à ces filtres."
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
  await expect(sidebar).not.toContainText("Journal du Bot")

  await page.goto("/bot-log")
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" })
  ).toBeVisible()
  await expect(page.getByText("lyra")).toHaveCount(0)
  await expect(sidebar).toContainText("brynja")
  await expect(sidebar).not.toContainText("Journal du Bot")
  await expect(page).toHaveTitle("Journal du Bot – Panel de Shor")
  await checkAccessibility()
})

test("a staff member logs out from the Bot log with its pills, its pagination and its form in view, and no page is prefetched", async ({
  page,
  logIn,
  prefetchedPaths,
}) => {
  await page.setViewportSize({ width: 1280, height: 6000 })
  await logIn(CASSIAN)
  await page.goto("/bot-log")
  await page.waitForLoadState()
  const pills = page
    .getByRole("navigation", { name: "Filtrer par famille" })
    .getByRole("link")
  const older = page.getByRole("link", { name: "Plus anciens" })
  const filter = page.getByRole("button", { name: "Filtrer" })
  await expect(older).toBeInViewport()
  await expect(filter).toBeInViewport()
  await expect(pills.first()).toBeInViewport()
  await expect(pills.last()).toBeInViewport()

  await logOutWithScriptsHeld(page, [
    pills.first(),
    pills.last(),
    older,
    filter,
  ])

  expect(prefetchedPaths).toEqual([])
})

test("on a 360 px screen, the menu leads to the Bot log, whose filters fold behind a button", async ({
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
  await logIn(CASSIAN)
  await page.waitForLoadState()
  await page.getByRole("button", { name: "Ouvrir le menu" }).click()
  await menu.getByRole("link", { name: "Journal du Bot" }).click()
  await expect(page).toHaveURL("/bot-log")
  await expect(menu).toBeHidden()
  await expect(lines).toHaveCount(25)
  await expect(page.getByLabel("Texte")).toBeHidden()
  await expect(chips).toHaveCount(0)
  await checkAccessibility()

  await page
    .getByRole("navigation", { name: "Filtrer par famille" })
    .getByRole("link", { name: "Tickets" })
    .click()
  await expect(page).toHaveURL("/bot-log?family=tickets")
  await expect(lines).toHaveCount(2)

  await fold.click()
  await expect(sheet).toBeVisible()
  await sheet.getByLabel("Action").fill("fermé")
  await sheet.getByLabel("Compte").fill("aldis")
  await sheet.getByLabel("Salon").fill("ticket-0042")
  await sheet.getByLabel("Texte").fill("résolu")
  await sheet.getByLabel("Du", { exact: true }).fill("2026-11-04")
  await sheet.getByLabel("Au", { exact: true }).fill("2026-11-04")
  await sheet.getByRole("button", { name: "Filtrer" }).click()
  await expect(sheet).toBeHidden()
  await expect
    .poll(() => Object.fromEntries(new URL(page.url()).searchParams))
    .toEqual({
      family: "tickets",
      action: "fermé",
      account: "aldis",
      channel: "ticket-0042",
      text: "résolu",
      from: "2026-11-04",
      to: "2026-11-04",
    })
  await expect(lines).toHaveCount(1)
  await expect(fold).toHaveAccessibleName(/^Filtres\s?6 filtres actifs$/)
  await expect(chips.getByRole("link")).toHaveText([
    "Retirer le filtre Action : fermé",
    "Retirer le filtre Compte : aldis",
    "Retirer le filtre Salon : ticket-0042",
    "Retirer le filtre Texte : résolu",
    "Retirer le filtre Du : 4 nov. 2026",
    "Retirer le filtre Au : 4 nov. 2026",
  ])
  await checkAccessibility()

  await chips.getByRole("link").first().click()
  await expect(chips.getByRole("link")).toHaveCount(5)
  await expect(page).toHaveURL(/family=tickets/)
  await expect(page).not.toHaveURL(/action=/)
})

test("Discord being unavailable while the log is read shows the error page, with its reference, then « Réessayer » shows the log", async ({
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

  await logIn(CASSIAN)
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

  await page.goto("/bot-log")

  await expect(
    page.getByRole("heading", { level: 1, name: "Page indisponible" })
  ).toBeVisible()
  await expect(main).toContainText(/avec la référence \d+\./)
  await checkAccessibility()

  await main.getByRole("button", { name: "Réessayer" }).click()

  await expect(
    page.getByRole("heading", { level: 1, name: "Journal du Bot" })
  ).toBeVisible()
  await expect(main.locator("ol").getByRole("listitem")).toHaveCount(25)
  await checkAccessibility()
})

test.describe("on a 768 px screen", () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test("the rail stands at the left, the six fields stay in the page's form with no button and no chip, the pills are 44 px high, and the form sends the address of the sheet", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const pills = page
      .getByRole("navigation", { name: "Filtrer par famille" })
      .getByRole("link")

    await logIn(CASSIAN)
    await page.goto("/bot-log?family=tickets")
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
    for (const label of ["Action", "Compte", "Salon", "Texte"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await page.getByLabel("Action").fill("fermé")
    await page.getByLabel("Compte").fill("aldis")
    await page.getByLabel("Salon").fill("ticket-0042")
    await page.getByLabel("Texte").fill("résolu")
    await page.getByLabel("Du", { exact: true }).fill("2026-11-04")
    await page.getByLabel("Au", { exact: true }).fill("2026-11-04")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect(page).toHaveURL(
      "/bot-log?family=tickets&action=ferm%C3%A9&account=aldis&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-04&to=2026-11-04"
    )
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
    await logIn(CASSIAN)
    await page.goto("/bot-log?family=tickets")
    await page.waitForLoadState()
    expect((await page.getByRole("complementary").boundingBox())?.width).toBe(
      252
    )
    await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0)
    const fields = [
      page.getByLabel("Action"),
      page.getByLabel("Compte", { exact: true }),
      page.getByLabel("Salon"),
      page.getByLabel("Texte"),
      page.getByLabel("Du", { exact: true }),
      page.getByLabel("Au", { exact: true }),
    ]
    const main = await page.getByRole("main").boundingBox()
    for (const field of fields) {
      await expect(field).toBeInViewport()
      const box = await field.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(main?.x ?? 0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        (main?.x ?? 0) + (main?.width ?? 0)
      )
    }
    await fields[0]?.fill("fermé")
    await fields[1]?.fill("aldis")
    await fields[2]?.fill("ticket-0042")
    await fields[3]?.fill("résolu")
    await fields[4]?.fill("2026-11-04")
    await fields[5]?.fill("2026-11-04")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect(page).toHaveURL(
      "/bot-log?family=tickets&action=ferm%C3%A9&account=aldis&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-04&to=2026-11-04"
    )
    await expect(
      page.getByRole("main").locator("ol").getByRole("listitem")
    ).toHaveCount(1)
    await checkAccessibility()
  })
})
