import { expect, type Locator, type Page } from "./fixtures"

const HELD_SCRIPT_MS = 1_000

const HELD_SCRIPTS = "**/_next/static/chunks/*.js"

export async function logOutWithScriptsHeld(page: Page, links: Locator[]) {
  const linksVisibleOnRelease: boolean[] = []
  const holdScript: Parameters<Page["route"]>[1] = async (route) => {
    await new Promise((resolve) => setTimeout(resolve, HELD_SCRIPT_MS))
    linksVisibleOnRelease.push(
      (await Promise.all(links.map((link) => link.isVisible()))).every(Boolean)
    )
    await route.continue()
  }
  await page.route(HELD_SCRIPTS, holdScript)
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Se déconnecter" })
    .click()
  await expect(page).toHaveURL("/login/logged-out")
  expect(linksVisibleOnRelease[0]).toBe(true)
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
  await page.unroute(HELD_SCRIPTS, holdScript)
}
