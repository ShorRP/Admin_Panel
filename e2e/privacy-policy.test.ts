import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

function policyHeading(page: Page) {
  return page.getByRole("heading", {
    level: 1,
    name: "Politique de confidentialité",
  })
}

test("a visitor without a session opens the privacy policy, in French", async ({
  page,
  checkAccessibility,
}) => {
  const answer = await page.request.get("/privacy", { maxRedirects: 0 })
  expect(answer.status()).toBe(200)

  await page.goto("/privacy")

  await expect(page).toHaveURL("/privacy")
  await expect(page).toHaveTitle("Politique de confidentialité – Panel de Shor")
  await expect(page.locator("html")).toHaveAttribute("lang", "fr")
  await expect(policyHeading(page)).toBeVisible()
  await expect(
    page.getByRole("heading", { level: 2, name: "Tes droits" })
  ).toBeVisible()
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
  await checkAccessibility()
})

test("a visitor reaches the privacy policy from a login page's footer, which marks its link current there", async ({
  page,
}) => {
  const privacyLink = page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Confidentialité" })

  await page.goto("/login/logged-out")
  await expect(privacyLink).not.toHaveAttribute("aria-current")
  await privacyLink.click()

  await expect(page).toHaveURL("/privacy")
  await expect(policyHeading(page)).toBeVisible()
  await expect(privacyLink).toHaveAttribute("aria-current", "page")
})

test("a staff member reaches the privacy policy from the sidebar", async ({
  page,
  logIn,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")

  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Confidentialité" })
    .click()

  await expect(page).toHaveURL("/privacy")
  await expect(policyHeading(page)).toBeVisible()
})

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 } })

  test("a staff member reaches the privacy policy from the menu, which closes", async ({
    page,
    logIn,
  }) => {
    const menu = page.getByRole("dialog", { name: "Menu" })

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.waitForLoadState()
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ouvrir le menu" })
      .click()
    await expect(menu).toBeVisible()
    await menu.getByRole("link", { name: "Confidentialité" }).click()

    await expect(page).toHaveURL("/privacy")
    await expect(menu).toHaveCount(0)
    await expect(policyHeading(page)).toBeVisible()
  })
})
