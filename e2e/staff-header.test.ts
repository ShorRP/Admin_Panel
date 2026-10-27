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
  await page.waitForLoadState()

  await header.getByRole("button", { name: "Se déconnecter" }).click()
  await expect(page).toHaveURL("/login/logged-out")
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
})

for (const { title, prefersReducedMotion } of [
  {
    title: "under reduced motion, every test's default",
    prefersReducedMotion: true,
  },
  {
    title: "with motion, which a test can ask for",
    prefersReducedMotion: false,
  },
]) {
  test.describe(title, () => {
    if (!prefersReducedMotion) {
      test.use({ reducedMotion: "no-preference" })
    }

    test("moving between sections fades the old content out and the new one in, moving nothing", async ({
      page,
      logIn,
      checkAccessibility,
    }) => {
      await logIn(ALDIS)
      await expect(page).toHaveURL("/blocked-words")
      expect(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches
        )
      ).toBe(prefersReducedMotion)

      const keyframes = page.waitForFunction(
        () => {
          const values = document.documentElement
            .getAnimations({ subtree: true })
            .flatMap(({ effect }) =>
              effect instanceof KeyframeEffect &&
              effect.pseudoElement?.startsWith("::view-transition") &&
              effect.getComputedTiming().duration !== 0
                ? effect.getKeyframes().flatMap((keyframe) =>
                    Object.entries(keyframe)
                      .filter(
                        ([key]) =>
                          ![
                            "offset",
                            "computedOffset",
                            "easing",
                            "composite",
                          ].includes(key)
                      )
                      .map(
                        ([property, value]) =>
                          `${effect.pseudoElement?.replace(/\(.*\)$/, "")} ${property} ${String(value)} at ${keyframe.computedOffset * 100}%`
                      )
                  )
                : []
            )
          return values.length > 0 && [...new Set(values)].sort()
        },
        undefined,
        { polling: "raf" }
      )
      await page
        .getByRole("banner")
        .getByRole("link", { name: "Journal d’audit" })
        .click()

      expect(await (await keyframes).jsonValue()).toEqual([
        "::view-transition-new opacity 0 at 0%",
        "::view-transition-new opacity 1 at 100%",
        "::view-transition-old opacity 0 at 100%",
        "::view-transition-old opacity 1 at 0%",
      ])
      await expect(page).toHaveURL("/audit-log")
      await checkAccessibility()
    })
  })
}

test("/ redirects to /blocked-words, temporarily", async ({ page }) => {
  const response = await page.request.get("/", { maxRedirects: 0 })

  expect(response.status()).toBe(307)
  expect(response.headers()["location"]).toBe("/blocked-words")
})
