import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const HALDOR = { id: "1400000000000000005", username: "haldor" }

const LYRANDIL = {
  id: "1400000000000000006",
  username: "lyrandil",
  global_name: "Lyrandil",
}

const LYSANNE = {
  id: "1400000000000000007",
  username: "lysanne_",
  global_name: "Lysanne",
}

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

test.use({
  discordState: {
    roles: [GUARD],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYNJA, roles: [STAFF_ROLE_ID] },
      { user: LYRA, nick: "Lyra des Brumes", roles: [GUARD.id] },
      {
        user: LYRANDIL,
        communication_disabled_until: "2099-11-02T18:30:00.000000+00:00",
      },
    ],
    bans: [
      {
        user: CORVUS,
        reason: "Aldis (1400000000000000001) : insultes répétées",
      },
      { user: LYSANNE },
    ],
    users: [HALDOR],
  },
})

test("a staff member who moderates finds accounts by name through « Modération », counted, each with its standing, a timed-out member's until when, then opens a record", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const sections = page
    .getByRole("complementary")
    .getByRole("navigation", { name: "Sections du panel" })
  const moderation = sections
    .getByRole("list", { name: "Modération" })
    .getByRole("link", { name: "Modération" })
  const main = page.getByRole("main")
  const found = main
    .getByRole("list", { name: "3 comptes commencent par « ly »" })
    .getByRole("link")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await moderation.click()
  await expect(page).toHaveURL("/records")
  await expect(page).toHaveTitle("Modération – Panel de Shor")
  await expect(moderation).toHaveAttribute("aria-current", "page")
  await expect(
    main.getByRole("heading", { level: 1, name: "Modération" })
  ).toBeVisible()
  await page.getByLabel("Compte").fill("ly")
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL("/records?query=ly")
  await expect(found).toHaveCount(3)
  await expect(found.nth(0)).toHaveAccessibleName(
    /^Lyra des Brumes\s*@lyra_gates\s*Membre du serveur$/
  )
  await expect(found.nth(1)).toHaveAccessibleName(
    /^Lyrandil\s*@lyrandil\s*Exclu jusqu’au 2 nov\. 2099, 19:30$/
  )
  await expect(found.nth(2)).toHaveAccessibleName(
    /^Lysanne\s*@lysanne_\s*Compte banni$/
  )
  await expect(main).toContainText("Heures de Paris.")
  await checkAccessibility()

  await found.nth(0).click()
  await expect(page).toHaveURL(`/records/${LYRA.id}`)
  await expect(page).toHaveTitle("Fiche – Panel de Shor")
  await expect(
    main.getByRole("heading", { level: 1, name: "Lyra des Brumes" })
  ).toBeVisible()
  await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1)
  await expect(main).toContainText("Membre du serveur@lyra_gates")
  await expect(
    main.getByRole("region", { name: "Détails" }).getByRole("listitem")
  ).toHaveText(["Garde"])
  await expect(main).not.toContainText("État")
  await expect(moderation).toHaveAttribute("aria-current", "page")
  await checkAccessibility()

  const breadcrumb = main.getByRole("navigation", { name: "Fil d’Ariane" })
  await expect(breadcrumb.getByText("Fiche")).toHaveAttribute(
    "aria-current",
    "page"
  )
  await breadcrumb.getByRole("link", { name: "Modération" }).click()
  await expect(page).toHaveURL("/records")
  await expect(
    main.getByRole("heading", { level: 1, name: "Modération" })
  ).toBeVisible()
})

test("a record shows its details and its history on the left and its sanctions on the right, which stay in view as the page scrolls, and puts them in one column, details, sanctions then history, where both columns do not fit and on a 360 px screen", async ({
  page,
  logIn,
}) => {
  const main = page.getByRole("main")
  const details = main.getByRole("region", { name: "Détails" })
  const sanctions = main.getByRole("region", { name: "Sanctions", exact: true })
  const history = main.getByRole("region", {
    name: "Historique des sanctions",
  })
  async function boxOf(region: typeof details) {
    const box = await region.boundingBox()
    if (box === null) {
      throw new Error("A region of the record is not shown.")
    }
    return box
  }
  async function boxes() {
    return {
      details: await boxOf(details),
      sanctions: await boxOf(sanctions),
      history: await boxOf(history),
    }
  }

  await page.setViewportSize({ width: 1280, height: 400 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await expect(sanctions).toContainText("Tu ne peux pas sanctionner ce membre")
  await page.waitForLoadState()

  const wide = await boxes()
  expect(wide.sanctions.x).toBeGreaterThan(wide.details.x + wide.details.width)
  expect(wide.sanctions.y).toBe(wide.details.y)
  expect(wide.history.x).toBe(wide.details.x)
  expect(wide.history.y).toBeGreaterThan(wide.details.y + wide.details.height)

  await page.evaluate(() => window.scrollTo(0, 300))
  const scrolled = await boxes()
  expect(scrolled.sanctions.y).toBe(24)
  expect(scrolled.details.y).toBeLessThan(0)
  await page.evaluate(() => window.scrollTo(0, 0))

  for (const width of [1024, 360]) {
    await page.setViewportSize({ width, height: 400 })
    const narrow = await boxes()
    expect(narrow.sanctions.x, `at ${width} px`).toBe(narrow.details.x)
    expect(narrow.history.x, `at ${width} px`).toBe(narrow.details.x)
    expect(narrow.sanctions.y, `at ${width} px`).toBeGreaterThan(
      narrow.details.y + narrow.details.height
    )
    expect(narrow.history.y, `at ${width} px`).toBeGreaterThan(
      narrow.sanctions.y + narrow.sanctions.height
    )
  }
})

test("a mention or an ID opens its account's record directly, banned, absent or timed out, each saying so beside its name, and an ID that names no account says so", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const name = main.getByRole("heading", { level: 1 })
  const details = main.getByRole("region", { name: "Détails" })

  await logIn(ALDIS)
  await page.goto("/records")
  await expect(page.getByLabel("Compte")).toHaveValue("")
  await checkAccessibility()
  await page.getByLabel("Compte").fill(`<@${CORVUS.id}>`)
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records/${CORVUS.id}`)
  await expect(name).toHaveText("corvus")
  await expect(main).toContainText("Compte banni@corvus")
  await expect(details).toContainText("insultes répétées")
  await expect(details).toContainText("Aldis")
  await checkAccessibility()

  await page.goto("/records")
  await page.waitForLoadState()
  await page.getByLabel("Compte").fill(HALDOR.id)
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records/${HALDOR.id}`)
  await expect(name).toHaveText("haldor")
  await expect(main).toContainText("Absent du serveur@haldor")
  await expect(
    main.getByRole("region", { name: "Sanctions", exact: true })
  ).toHaveCount(0)
  expect((await details.boundingBox())?.width).toBe(
    (await main.boundingBox())?.width
  )
  await checkAccessibility()

  await page.goto(`/records/${LYRANDIL.id}`)
  await expect(name).toHaveText("Lyrandil")
  await expect(main).toContainText("Exclu jusqu’au 2 nov. 2099, 19:30@lyrandil")
  await checkAccessibility()

  await page.goto("/records/1400000000000000009")
  await expect(name).toHaveText("Fiche")
  await expect(main).toContainText("Aucun compte Discord n’a cet ID.")
  await expect(details).toHaveCount(0)
  await checkAccessibility()
})

test("a staff member who does not moderate sees no « Modération », and the section's pages show the not-found page", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const sidebar = page.getByRole("complementary")

  await logIn(BRYNJA)
  await expect(page).toHaveURL("/blocked-words")
  await expect(sidebar).toContainText("brynja")
  await page.waitForLoadState()
  await expect(sidebar.getByRole("link", { name: "Modération" })).toHaveCount(0)
  await expect(sidebar).not.toContainText("Modération")

  await page.goto("/records")
  await expect(
    page.getByRole("heading", { name: "This page could not be found." })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "Modération" })).toHaveCount(0)
  await checkAccessibility()

  await page.goto(`/records/${LYRA.id}`)
  await expect(
    page.getByRole("heading", { name: "This page could not be found." })
  ).toBeVisible()
  await expect(page.getByText("Lyra des Brumes")).toHaveCount(0)
  await checkAccessibility()
})

test("on a 360 px screen, a staff member who moderates reaches « Modération » through the menu, which then marks it", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const header = page.getByRole("banner")
  const menu = page.getByRole("dialog", { name: "Menu" })

  await page.setViewportSize({ width: 360, height: 760 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  await header.getByRole("button", { name: "Ouvrir le menu" }).click()
  await menu.getByRole("link", { name: "Modération" }).click()
  await expect(page).toHaveURL("/records")
  await expect(menu).toBeHidden()
  await checkAccessibility()

  await header.getByRole("button", { name: "Ouvrir le menu" }).click()
  await expect(menu.getByRole("link", { name: "Modération" })).toHaveAttribute(
    "aria-current",
    "page"
  )
})
