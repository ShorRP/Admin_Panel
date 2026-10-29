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
    .getByRole("list", { name: "3 comptes commencent par « LY »" })
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
  await page.getByLabel("Compte").fill("LY")
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL("/records?query=LY")
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
    page.getByRole("heading", { level: 2, name: "Lyra des Brumes" })
  ).toBeVisible()
  await expect(page.getByRole("main")).toContainText("Membre du serveur")
  await expect(page.getByRole("main")).toContainText("Garde")
  await expect(moderation).toHaveAttribute("aria-current", "page")
  await checkAccessibility()
})

test("a mention or an ID opens its account's record directly, banned or absent, and an ID that names no account says so", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")

  await logIn(ALDIS)
  await page.goto("/records")
  await expect(page.getByLabel("Compte")).toHaveValue("")
  await checkAccessibility()
  await page.getByLabel("Compte").fill(`<@${CORVUS.id}>`)
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records/${CORVUS.id}`)
  await expect(main).toContainText("Compte banni")
  await expect(main).toContainText("insultes répétées")
  await expect(main).toContainText("Aldis")
  await checkAccessibility()

  await page.goto("/records")
  await page.waitForLoadState()
  await page.getByLabel("Compte").fill(HALDOR.id)
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records/${HALDOR.id}`)
  await expect(main).toContainText("Compte absent du serveur")
  await checkAccessibility()

  await page.goto("/records/1400000000000000009")
  await expect(main).toContainText("Aucun compte Discord n’a cet ID.")
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
