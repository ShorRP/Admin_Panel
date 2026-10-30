import { readFileSync } from "node:fs"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const STAFF_PAGE_MARK = "data-from-staff-page"

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("a staff page, and a login page once the member logs out, each carry their own link to Shor's favicon, which the panel serves", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const expectedFavicon = {
    status: 200,
    type: "image/svg+xml",
    body: readFileSync("src/app/icon.svg", "utf8"),
  }
  const icons = page.locator('link[rel="icon"]')
  const ownIcons = page.locator(`link[rel="icon"]:not([${STAFF_PAGE_MARK}])`)
  function distinctIconHrefs() {
    return icons.evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute("href"))),
    ])
  }
  async function servedIcon(iconsToRead: typeof icons) {
    await expect(iconsToRead).not.toHaveCount(0)
    await expect.poll(distinctIconHrefs).toHaveLength(1)
    const href = await iconsToRead.first().getAttribute("href")
    if (href === null) {
      throw new Error("The page's icon link has no href.")
    }
    const response = await page.request.get(href, { maxRedirects: 0 })
    return {
      status: response.status(),
      type: response.headers()["content-type"],
      body: await response.text(),
    }
  }

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  expect(await servedIcon(icons)).toEqual(expectedFavicon)
  await page.waitForLoadState()
  await icons.evaluateAll((links, mark) => {
    for (const link of links) {
      link.setAttribute(mark, "")
    }
  }, STAFF_PAGE_MARK)

  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Se déconnecter" })
    .click()
  await expect(page).toHaveURL("/login/logged-out")
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
  expect(await servedIcon(ownIcons)).toEqual(expectedFavicon)
  await checkAccessibility()
})
