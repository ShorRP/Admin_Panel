import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { archiveMessage } from "@/ticket-archives/archive-message"
import {
  ARCHIVES_CHANNEL_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test, type Page } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { settle } from "./settle"

const TOUCH_TARGET_PX = 44

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const LYRIA = { id: "1400000000000000006", username: "lyria" }

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

function ticket(
  reason: string,
  kind: string | null,
  openerId: string,
  closerId: string,
  openedAt: string,
  closedAt: string
) {
  return archiveMessage({
    channelId: ARCHIVES_CHANNEL_ID,
    openerId,
    closerId,
    kind,
    reason,
    openedAt: new Date(openedAt),
    closedAt: new Date(closedAt),
    sentAt: new Date(closedAt),
  })
}

const TECHNICAL = "🔧 Problème technique"

const REPORT = "🚨 Signaler un joueur"

const SEVEN_TICKETS = [
  ticket(
    "Launcher réinstallé",
    TECHNICAL,
    LYRA.id,
    BRYNJA.id,
    "2026-09-28T09:00:00Z",
    "2026-09-28T09:30:00Z"
  ),
  ticket(
    "Bug du launcher persistant",
    TECHNICAL,
    CORVUS.id,
    ALDIS.id,
    "2026-10-05T10:00:00Z",
    "2026-10-12T10:00:00Z"
  ),
  ticket(
    "Joueur averti",
    REPORT,
    LYRA.id,
    ALDIS.id,
    "2026-10-14T18:00:00Z",
    "2026-10-14T18:30:00Z"
  ),
  ticket(
    "Scène validée",
    "🎭 Demande RP",
    CORVUS.id,
    BRYNJA.id,
    "2026-10-20T08:00:00Z",
    "2026-10-20T08:20:00Z"
  ),
  ticket(
    "Question réglée",
    "❓ Autre demande",
    LYRA.id,
    BRYNJA.id,
    "2026-10-25T18:10:00Z",
    "2026-10-25T18:20:00Z"
  ),
  ticket(
    "Ticket renommé",
    null,
    LYRA.id,
    HALDOR.id,
    "2026-10-28T12:00:00Z",
    "2026-10-28T12:30:00Z"
  ),
  ticket(
    "Second bug technique",
    TECHNICAL,
    LYRA.id,
    ALDIS.id,
    "2026-11-03T14:00:00Z",
    "2026-11-03T14:40:00Z"
  ),
]

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
      { user: LYRA },
      { user: LYRIA },
      { user: CORVUS },
    ],
    users: [HALDOR],
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 5 },
      { id: MODERATION_ROLE_ID, name: "Modération", position: 4 },
    ],
    channelMessages: SEVEN_TICKETS,
  },
})

function reasons(...texts: string[]) {
  return texts.map((text) => new RegExp(`Motif\\s: ${text}$`))
}

function filtersOf(page: Page) {
  return Object.fromEntries(
    [...new URL(page.url()).searchParams].filter(([, value]) => value !== "")
  )
}

function archivesOf(page: Page) {
  return page
    .getByRole("main")
    .getByRole("list", { name: /\d sur \d+$/ })
    .getByRole("listitem")
}

function kindsOf(page: Page) {
  return page.getByRole("navigation", { name: "Filtrer par type de demande" })
}

test("a staff member filters the archives by kind, opener, closer, reason, period and order, each in the address, and resets them all", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const kinds = kindsOf(page)
  const technical = kinds.getByRole("link", { name: /Problème technique/ })

  await logIn(ALDIS)
  await page.goto("/support-tickets")

  await expect(archivesOf(page)).toHaveCount(7)
  await expect(technical).toContainText("3 archives")
  await expect(kinds.getByRole("link", { name: /Signaler/ })).toContainText(
    "1 archive"
  )
  await expect(kinds.getByRole("link", { name: /Demande RP/ })).toContainText(
    "1 archive"
  )
  await expect(
    kinds.getByRole("link", { name: /Autre demande/ })
  ).toContainText("1 archive")
  await expect(
    kinds.getByRole("link", { name: "Tout", exact: true })
  ).toHaveAttribute("aria-current", "true")
  await expect(main.getByRole("link", { name: "Réinitialiser" })).toHaveCount(0)
  await checkAccessibility()

  await technical.click()
  await expect(page).toHaveURL("/support-tickets?kind=technical-issue")
  await expect(technical).toHaveAttribute("aria-current", "true")
  await expect(archivesOf(page)).toHaveText(
    reasons(
      "Second bug technique",
      "Bug du launcher persistant",
      "Launcher réinstallé"
    )
  )
  await expect(technical).toContainText("3 archives")
  await expect(kinds.getByRole("link", { name: /Signaler/ })).toContainText(
    "1 archive"
  )
  await checkAccessibility()

  await page.getByLabel("Ouvreur").fill("lyra")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons("Second bug technique", "Launcher réinstallé")
  )
  expect(filtersOf(page)).toEqual({ kind: "technical-issue", opener: "lyra" })
  await expect(technical).toContainText("2 archives")
  await expect(kinds.getByRole("link", { name: /Signaler/ })).toContainText(
    "1 archive"
  )
  await expect(kinds.getByRole("link", { name: /Demande RP/ })).toContainText(
    "0 archive"
  )
  await checkAccessibility()

  await kinds.getByRole("link", { name: "Tout", exact: true }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons(
      "Second bug technique",
      "Ticket renommé",
      "Question réglée",
      "Joueur averti",
      "Launcher réinstallé"
    )
  )
  expect(filtersOf(page)).toEqual({ opener: "lyra" })

  await page.getByLabel("Ouvreur").fill("")
  await page.getByLabel("Fermeur").fill(`<@${ALDIS.id}>`)
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons(
      "Second bug technique",
      "Joueur averti",
      "Bug du launcher persistant"
    )
  )
  expect(filtersOf(page)).toEqual({ closer: `<@${ALDIS.id}>` })

  await page.getByLabel("Fermeur").fill("")
  await page.getByLabel("Motif").fill("launcher")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons("Bug du launcher persistant", "Launcher réinstallé")
  )
  expect(filtersOf(page)).toEqual({ reason: "launcher" })

  await page.getByLabel("Motif").fill("")
  await page.getByLabel("Du", { exact: true }).fill("2026-10-10")
  await page.getByLabel("Au", { exact: true }).fill("2026-10-20")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons("Scène validée", "Joueur averti", "Bug du launcher persistant")
  )
  expect(filtersOf(page)).toEqual({ from: "2026-10-10", to: "2026-10-20" })
  await checkAccessibility()

  await page.getByLabel("Période sur").selectOption("opened")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons("Scène validée", "Joueur averti")
  )
  expect(filtersOf(page)).toEqual({
    from: "2026-10-10",
    to: "2026-10-20",
    on: "opened",
  })

  await page.getByLabel("Ordre").selectOption("oldest")
  await page.getByRole("button", { name: "Filtrer" }).click()
  await expect(archivesOf(page)).toHaveText(
    reasons("Joueur averti", "Scène validée")
  )
  expect(filtersOf(page)).toEqual({
    from: "2026-10-10",
    to: "2026-10-20",
    on: "opened",
    sort: "oldest",
  })
  await checkAccessibility()

  await main.getByRole("link", { name: "Réinitialiser" }).click()
  await expect(page).toHaveURL("/support-tickets")
  await expect(archivesOf(page)).toHaveCount(7)
  await expect(page.getByLabel("Du", { exact: true })).toHaveValue("")
  await expect(page.getByLabel("Période sur")).toHaveValue("")
  await expect(page.getByLabel("Ordre")).toHaveValue("")
  await expect(main.getByRole("link", { name: "Réinitialiser" })).toHaveCount(0)
})

test("filters that keep no archive, and a name that no account or several accounts have, say so with a way back", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const reset = main.getByRole("link", { name: "Réinitialiser" })

  await logIn(ALDIS)
  await page.goto("/support-tickets?reason=introuvable")
  await expect(main).toContainText(
    "Aucune archive ne correspond à ces filtres."
  )
  await expect(archivesOf(page)).toHaveCount(0)
  await expect(page.getByLabel("Motif")).toHaveValue("introuvable")
  await checkAccessibility()

  await page.goto("/support-tickets?opener=zzz")
  await expect(main).toContainText(
    "Aucun membre ni compte banni ne commence par « zzz » (ouvreur) : un compte parti du serveur se cherche par son ID ou sa mention."
  )
  await page.goto("/support-tickets?closer=ly")
  await expect(main).toContainText(
    "Plusieurs comptes commencent par « ly » (fermeur) : précise le nom, ou colle l’ID ou la mention du compte."
  )
  await checkAccessibility()

  await reset.last().click()
  await expect(page).toHaveURL("/support-tickets")
  await expect(archivesOf(page)).toHaveCount(7)

  await page.goto("/support-tickets?opener=lyra&kind=rp-request")
  await expect(main).toContainText(
    "Aucune archive ne correspond à ces filtres."
  )
})

test("an invalid filter counts as absent: the page shows the archives as if it were not there", async ({
  page,
  logIn,
}) => {
  await logIn(ALDIS)
  await page.goto(
    "/support-tickets?kind=nope&from=2026-02-30&on=closed&sort=newest&opener=&opener=aldis"
  )

  await expect(archivesOf(page)).toHaveCount(7)
  await expect(page.getByLabel("Du", { exact: true })).toHaveValue("")
})

test("a search that the counts of the kinds could not make leaves the pills without numbers, with the list whole", async ({
  page,
  logIn,
  discord,
}) => {
  const search = discord.searchMessages.bind(discord)
  discord.searchMessages = (query) =>
    query.limit === 1
      ? Promise.reject(
          new DiscordError({
            method: "GET",
            route: ROUTES.guildMessagesSearch,
            status: 429,
            retryAfter: 4.4,
          })
        )
      : search(query)

  await logIn(ALDIS)
  await page.goto("/support-tickets")
  await settle(page)

  await expect(archivesOf(page)).toHaveCount(7)
  await expect(kindsOf(page).getByRole("link")).toHaveCount(5)
  await expect(kindsOf(page)).not.toContainText("archive")
  await expect(
    page.getByRole("heading", { level: 1, name: "Tickets de support" })
  ).toBeVisible()
})

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 }, hasTouch: true })

  test("the filters fold behind a button that opens a sheet docked to the bottom, which sends the address of the inline form, each filter set is a chip that removes it, and a staff member logs out with the pills, the button and the chips in view, and no page is prefetched", async ({
    page,
    logIn,
    prefetchedPaths,
    checkAccessibility,
  }) => {
    const fold = page.getByRole("button", { name: /^Filtres/ })
    const sheet = page.getByRole("dialog", { name: "Filtres" })
    const chips = page.getByRole("list", { name: "Filtres actifs" })
    const removers = chips.getByRole("link")
    const menu = page.getByRole("dialog", { name: "Menu" })

    await logIn(ALDIS)
    await page.goto("/support-tickets")
    await expect(archivesOf(page)).toHaveCount(7)
    await expect(page.getByLabel("Ouvreur")).toBeHidden()
    await expect(page.getByRole("button", { name: "Filtrer" })).toHaveCount(0)
    await expect(fold).toHaveAccessibleName("Filtres")
    await expect(chips).toHaveCount(0)
    const [button, main] = await Promise.all([
      fold.boundingBox(),
      page.getByRole("main").boundingBox(),
    ])
    expect(button).toMatchObject({
      width: main?.width,
      height: TOUCH_TARGET_PX,
    })
    for (const pill of await kindsOf(page).getByRole("link").all()) {
      expect((await pill.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await checkAccessibility()

    await kindsOf(page)
      .getByRole("link", { name: /Problème technique/ })
      .click()
    await expect(page).toHaveURL("/support-tickets?kind=technical-issue")
    await fold.tap()
    await expect(sheet).toBeVisible()
    await expect(sheet).toBeFocused()
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox()
        return [
          box?.x,
          box?.width,
          Math.round((box?.y ?? 0) + (box?.height ?? 0)),
        ]
      })
      .toEqual([0, 360, 760])
    await expect(sheet.getByLabel("Ouvreur")).toHaveValue("")
    await expect(
      sheet.getByRole("link", { name: "Réinitialiser" })
    ).toBeVisible()
    await checkAccessibility()

    await sheet.getByLabel("Ouvreur").fill("lyra")
    await sheet.getByLabel("Ordre").selectOption("oldest")
    await sheet.getByRole("button", { name: "Filtrer" }).click()
    await expect(sheet).toBeHidden()
    await expect(archivesOf(page)).toHaveText(
      reasons("Launcher réinstallé", "Second bug technique")
    )
    expect(filtersOf(page)).toEqual({
      kind: "technical-issue",
      opener: "lyra",
      sort: "oldest",
    })
    await expect(fold).toHaveAccessibleName(/^Filtres\s?2 filtres actifs$/)
    await expect(removers).toHaveText([
      "Retirer le filtre Ouvreur : lyra",
      "Retirer le filtre Ordre : Plus anciennes d’abord",
    ])
    for (const chip of await removers.all()) {
      expect((await chip.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await checkAccessibility()

    await removers.first().click()
    await expect(page).toHaveURL(
      "/support-tickets?kind=technical-issue&sort=oldest"
    )
    await expect(removers).toHaveText([
      "Retirer le filtre Ordre : Plus anciennes d’abord",
    ])
    await fold.click()
    await expect(sheet.getByLabel("Ouvreur")).toHaveValue("")
    await expect(sheet.getByLabel("Ordre")).toHaveValue("oldest")
    await sheet.getByRole("link", { name: "Réinitialiser" }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL("/support-tickets")
    await expect(chips).toHaveCount(0)
    await checkAccessibility()

    await page.goto(
      "/support-tickets?kind=technical-issue&opener=lyra&sort=oldest"
    )
    await page.waitForLoadState()
    await expect(removers).toHaveCount(2)
    const inView = [
      ...(await kindsOf(page).getByRole("link").all()),
      page.getByRole("link", { name: "Réinitialiser" }),
      fold,
      ...(await removers.all()),
    ]
    for (const control of inView) {
      await expect(control).toBeInViewport()
    }
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ouvrir le menu" })
      .click()
    await expect(menu).toBeVisible()
    const mounted = await page
      .locator('main a[href], main button[aria-haspopup="dialog"]')
      .all()
    await logOutWithScriptsHeld(
      page,
      mounted,
      menu.getByRole("button", { name: "Se déconnecter" })
    )
    expect(prefetchedPaths).toEqual([])
  })
})

test.describe("on a 768 px screen", () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test("the filters are in the page's form, with no button and no chip, the pills are 44 px high, and the form sends the address of the sheet", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    await logIn(ALDIS)
    await page.goto("/support-tickets")

    await expect(archivesOf(page)).toHaveCount(7)
    await expect(page.getByRole("button", { name: /^Filtres/ })).toBeHidden()
    await expect(
      page.getByRole("list", { name: "Filtres actifs" })
    ).toHaveCount(0)
    for (const label of [
      "Ouvreur",
      "Fermeur",
      "Motif",
      "Du",
      "Au",
      "Période sur",
      "Ordre",
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    for (const pill of await kindsOf(page).getByRole("link").all()) {
      expect((await pill.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await checkAccessibility()

    await page.getByLabel("Ouvreur").fill("lyra")
    await page.getByLabel("Ordre").selectOption("oldest")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect(archivesOf(page)).toHaveCount(5)
    expect(filtersOf(page)).toEqual({ opener: "lyra", sort: "oldest" })
    await checkAccessibility()
  })
})

test.describe("on a 1,280 px screen", () => {
  test("a staff member logs out from the page with the pills and the reset link in view, and no page is prefetched", async ({
    page,
    logIn,
    prefetchedPaths,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1600 })
    await logIn(ALDIS)
    await page.goto("/support-tickets?opener=lyra&kind=technical-issue")
    await page.waitForLoadState()
    await expect(archivesOf(page)).toHaveCount(2)

    const links = [
      ...(await kindsOf(page).getByRole("link").all()),
      page.getByRole("main").getByRole("link", { name: "Réinitialiser" }),
    ]
    for (const link of links) {
      await expect(link).toBeInViewport()
    }
    await logOutWithScriptsHeld(page, links)
    expect(prefetchedPaths).toEqual([])
  })
})
