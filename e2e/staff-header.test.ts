import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("a staff member moves between sections through the header, which marks the current one, then logs out from it", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const header = page.getByRole("banner")
  const sections = header.getByRole("navigation", {
    name: "Sections du panel",
  })
  const blockedWords = sections.getByRole("link", { name: "Mots interdits" })
  const auditLog = sections.getByRole("link", { name: "Journal d’audit" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await expect(blockedWords).toHaveAttribute("aria-current", "page")
  await expect(auditLog).not.toHaveAttribute("aria-current")

  await auditLog.click()
  await expect(page).toHaveURL("/audit-log")
  await expect(page).toHaveTitle("Journal d’audit – Panel de Shor")
  await expect(auditLog).toHaveAttribute("aria-current", "page")
  await expect(blockedWords).not.toHaveAttribute("aria-current")
  await expect(header).toContainText("aldis")
  await checkAccessibility()

  await header.getByRole("link", { name: "Panel de Shor" }).click()
  await expect(page).toHaveURL("/blocked-words")
  await expect(blockedWords).toHaveAttribute("aria-current", "page")
  await expect(auditLog).not.toHaveAttribute("aria-current")

  await header.getByRole("button", { name: "Se déconnecter" }).click()
  await expect(page).toHaveURL("/login/logged-out")
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
})

test("/ redirects to /blocked-words, temporarily", async ({ page }) => {
  const response = await page.request.get("/", { maxRedirects: 0 })

  expect(response.status()).toBe(307)
  expect(response.headers()["location"]).toBe("/blocked-words")
})
