import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Page } from "./fixtures"
import { settle } from "./settle"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

async function revealThrottleClock(page: Page) {
  return await page.evaluate(() => typeof Reflect.get(window, "$RT"))
}

test.describe("with the option", () => {
  test.use({ unthrottledReveals: true })

  test("React's reveal clock is never a number, so a streamed boundary shows on the next frame", async ({
    page,
    logIn,
  }) => {
    await logIn(ALDIS)
    await page.goto("/audit-log")
    await settle(page)

    expect(await revealThrottleClock(page)).toBe("undefined")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

test.describe("without the option", () => {
  test("React's reveal clock is a number, which delays each batch of reveals", async ({
    page,
    logIn,
  }) => {
    await logIn(ALDIS)
    await page.goto("/audit-log")
    await settle(page)

    expect(await revealThrottleClock(page)).toBe("number")
  })
})
