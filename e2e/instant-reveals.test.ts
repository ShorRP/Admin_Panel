import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Page } from "./fixtures"
import { settle } from "./settle"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const HELD_FOR_MS = 1000

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

async function revealClock(page: Page) {
  return await page.evaluate(() => typeof Reflect.get(window, "$RT"))
}

async function watchTransitionDurations(page: Page) {
  await page.addInitScript(() => {
    const durations = new Set<number>()
    Reflect.set(window, "transitionDurations", durations)
    function frame() {
      for (const { effect } of document.getAnimations()) {
        if (
          effect instanceof KeyframeEffect &&
          effect.pseudoElement?.startsWith("::view-transition")
        ) {
          durations.add(Number(effect.getComputedTiming().duration))
        }
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

async function transitionDurations(page: Page) {
  return await page.evaluate(() =>
    [...Reflect.get(window, "transitionDurations")].toSorted((a, b) => a - b)
  )
}

test.describe("with instantReveals on", () => {
  test.use({ instantReveals: true })

  test("React's reveal clock is never a number", async ({ page, logIn }) => {
    await logIn(ALDIS)
    await page.goto("/audit-log")
    await settle(page)

    expect(await revealClock(page)).toBe("undefined")
  })

  test("the reveal still runs in a view transition, whose animations last no time", async ({
    page,
    logIn,
  }) => {
    await logIn(ALDIS)
    await watchTransitionDurations(page)
    await page.goto("/audit-log")
    await settle(page)

    expect(await transitionDurations(page)).toEqual([0])
  })

  test("settle still waits for a boundary that Discord holds back, and returns with the page whole", async ({
    page,
    logIn,
    holdDiscord,
  }) => {
    await logIn(ALDIS)
    await page.waitForLoadState()
    const release = holdDiscord()
    await page.goto("/audit-log", { waitUntil: "commit" })
    const skeletons = page
      .getByRole("status")
      .filter({ hasText: /^Chargement/ })
    await expect(
      skeletons.filter({ hasText: "Chargement du journal d’audit…" })
    ).toBeVisible()

    const settled = settle(page).then(() => "settled" as const)
    const held = new Promise<"held">((resolve) =>
      setTimeout(() => resolve("held"), HELD_FOR_MS)
    )
    expect(await Promise.race([settled, held])).toBe("held")

    release()
    await settled

    expect(await skeletons.count()).toBe(0)
    expect(
      await page
        .getByText(
          "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
        )
        .isVisible()
    ).toBe(true)
    expect(await page.evaluate(() => document.activeViewTransition)).toBeNull()
  })
})

test.describe("with instantReveals off", () => {
  test("React's reveal clock is a number and the reveal's view transition fades for 250 ms", async ({
    page,
    logIn,
  }) => {
    await logIn(ALDIS)
    await watchTransitionDurations(page)
    await page.goto("/audit-log")
    await settle(page)

    expect(await revealClock(page)).toBe("number")
    expect(await transitionDurations(page)).toContain(250)
  })
})
