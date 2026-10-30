import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const TITLE_MISSING_FOR_MS = 1000

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("checkAccessibility waits for the page's title to come back before running axe", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()

  await page.evaluate((delay) => {
    const title = document.querySelector("title")
    if (title === null) {
      throw new Error("The page has no title to take away.")
    }
    title.remove()
    setTimeout(() => {
      document.head.append(title)
    }, delay)
  }, TITLE_MISSING_FOR_MS)

  await checkAccessibility()

  await expect(page).toHaveTitle("Mots interdits – Panel de Shor")
})
