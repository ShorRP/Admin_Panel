import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("a staff member moves between sections through the header, which marks the current one and prefetches none, then logs out from it", async ({
  page,
  logIn,
  prefetchedPaths,
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
  await expect(
    header.getByRole("button", { name: "Ouvrir le menu" })
  ).toBeHidden()

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
  expect(prefetchedPaths).toEqual([])
})

test.describe("for a staff member with an avatar on the Discord server", () => {
  test.use({
    discordState: {
      members: [
        {
          user: { ...BRYNJA, avatar: "6b1d8f0c2a7e4f3b9d5c1e8a0f2b4d6c" },
          avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
          roles: [STAFF_ROLE_ID],
        },
      ],
    },
  })

  test("the header shows that avatar from Discord's CDN beside the member's name, then beside the menu button on a 360 px screen, where the name moves into the menu", async ({
    page,
    logIn,
    discordCdnRequests,
    checkAccessibility,
  }) => {
    const header = page.getByRole("banner")
    const avatar = header.locator("img")
    const avatarUrl =
      "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000002/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64"

    await logIn(BRYNJA)
    await expect(page).toHaveURL("/blocked-words")
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute("src", avatarUrl)
    await expect(avatar).toHaveAttribute("alt", "")
    expect(
      await avatar.evaluate((image: HTMLImageElement) => image.naturalWidth)
    ).toBe(64)
    expect(discordCdnRequests).toContain(avatarUrl)
    await expect(header.getByText("brynja", { exact: true })).toBeVisible()
    await checkAccessibility()

    await page.setViewportSize({ width: 360, height: 760 })
    await expect(avatar).toBeVisible()
    await expect(
      header.getByRole("button", { name: "Ouvrir le menu" })
    ).toBeVisible()
    await expect(header.getByText("brynja", { exact: true })).toBeHidden()
  })
})

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 } })

  test("a staff member opens the menu, which comes from the right and prefetches no section, moves to the other section, which closes it, then logs out from it", async ({
    page,
    logIn,
    prefetchedPaths,
    checkAccessibility,
  }) => {
    const header = page.getByRole("banner")
    const openMenu = header.getByRole("button", { name: "Ouvrir le menu" })
    const menu = page.getByRole("dialog", { name: "Menu" })
    const sections = menu.getByRole("navigation", {
      name: "Sections du panel",
    })
    const blockedWords = sections.getByRole("link", { name: "Mots interdits" })
    const auditLog = sections.getByRole("link", { name: "Journal d’audit" })

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await expect(
      header.getByRole("navigation", { name: "Sections du panel" })
    ).toBeHidden()
    await expect(
      header.getByRole("link", { name: "Panel de Shor" })
    ).toBeVisible()
    await expect(
      header.getByRole("button", { name: "Se déconnecter" })
    ).toBeHidden()

    await openMenu.click()
    await expect(menu).toBeVisible()
    const edges = await menu.evaluate((element) => {
      const { left, right } = element.getBoundingClientRect()
      return {
        left,
        right,
        viewportRight: document.documentElement.clientWidth,
      }
    })
    expect(edges.right).toBe(edges.viewportRight)
    expect(edges.left).toBeGreaterThan(0)
    await expect(blockedWords).toHaveAttribute("aria-current", "page")
    await expect(auditLog).not.toHaveAttribute("aria-current")
    await expect(menu).toContainText("aldis")
    await checkAccessibility()

    await auditLog.click()
    await expect(page).toHaveURL("/audit-log")
    await expect(menu).toBeHidden()
    await checkAccessibility()

    await openMenu.click()
    await expect(auditLog).toHaveAttribute("aria-current", "page")
    await expect(blockedWords).not.toHaveAttribute("aria-current")

    await menu.getByRole("button", { name: "Se déconnecter" }).click()
    await expect(page).toHaveURL("/login/logged-out")
    expect(
      (await page.context().cookies()).filter(
        ({ name }) => name === "__Host-session"
      )
    ).toEqual([])
    expect(prefetchedPaths).toEqual([])
  })
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

    test("moving between sections fades the old content out and the new one in, moving nothing but the current section's underline, which slides over unless motion is reduced", async ({
      page,
      logIn,
      checkAccessibility,
    }) => {
      await logIn(ALDIS)
      await expect(page).toHaveURL("/blocked-words")
      await expect(
        page.getByText("Aucun mot interdit pour l’instant.")
      ).toBeVisible()
      await page.waitForFunction(() => document.activeViewTransition === null)
      expect(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches
        )
      ).toBe(prefersReducedMotion)

      const transition = page.waitForFunction(
        () => {
          const underline = "(current-section-underline)"
          const effects = document.documentElement
            .getAnimations({ subtree: true })
            .flatMap(({ effect }) =>
              effect instanceof KeyframeEffect &&
              effect.pseudoElement?.startsWith("::view-transition") &&
              effect.getComputedTiming().duration !== 0
                ? [
                    {
                      pseudoElement: effect.pseudoElement,
                      keyframes: effect.getKeyframes(),
                    },
                  ]
                : []
            )
          function properties(keyframe: ComputedKeyframe) {
            return Object.entries(keyframe).filter(
              ([key]) =>
                !["offset", "computedOffset", "easing", "composite"].includes(
                  key
                )
            )
          }
          function unique(values: string[]) {
            return [...new Set(values)].sort()
          }
          return (
            effects.length > 0 && {
              content: unique(
                effects
                  .filter(
                    ({ pseudoElement }) => !pseudoElement.endsWith(underline)
                  )
                  .flatMap(({ pseudoElement, keyframes }) =>
                    keyframes.flatMap((keyframe) =>
                      properties(keyframe).map(
                        ([property, value]) =>
                          `${pseudoElement.replace(/\(.*\)$/, "")} ${property} ${String(value)} at ${keyframe.computedOffset * 100}%`
                      )
                    )
                  )
              ),
              underlineMoves: unique(
                effects
                  .filter(
                    ({ pseudoElement }) =>
                      pseudoElement === `::view-transition-group${underline}`
                  )
                  .flatMap(({ keyframes }) =>
                    keyframes.flatMap((keyframe) =>
                      properties(keyframe)
                        .filter(([property, value]) =>
                          keyframes.some((other) => other[property] !== value)
                        )
                        .map(([property]) => property)
                    )
                  )
              ),
            }
          )
        },
        undefined,
        { polling: "raf" }
      )
      await page
        .getByRole("banner")
        .getByRole("link", { name: "Journal d’audit" })
        .click()

      expect(await (await transition).jsonValue()).toEqual({
        content: [
          "::view-transition-new opacity 0 at 0%",
          "::view-transition-new opacity 1 at 100%",
          "::view-transition-old opacity 0 at 100%",
          "::view-transition-old opacity 1 at 0%",
        ],
        underlineMoves: prefersReducedMotion ? [] : ["transform", "width"],
      })
      await expect(page).toHaveURL("/audit-log")
      await checkAccessibility()
    })

    test.describe("on a 360 px screen", () => {
      test.use({ viewport: { width: 360, height: 760 } })

      test("the menu fades in, and slides in only with motion", async ({
        page,
        logIn,
      }) => {
        await logIn(ALDIS)
        await expect(page).toHaveURL("/blocked-words")
        await page.waitForLoadState()

        const transitions = page.waitForFunction(
          () => {
            const properties = document
              .getAnimations()
              .flatMap((animation) =>
                animation instanceof CSSTransition &&
                animation.effect instanceof KeyframeEffect &&
                animation.effect.target?.getAttribute("role") === "dialog"
                  ? [animation.transitionProperty]
                  : []
              )
            return properties.length > 0 && [...new Set(properties)].sort()
          },
          undefined,
          { polling: "raf" }
        )
        await page
          .getByRole("banner")
          .getByRole("button", { name: "Ouvrir le menu" })
          .click()

        expect(await (await transitions).jsonValue()).toEqual(
          prefersReducedMotion ? ["opacity"] : ["opacity", "translate"]
        )
      })
    })
  })
}

test("/ redirects to /blocked-words, temporarily", async ({ page }) => {
  const response = await page.request.get("/", { maxRedirects: 0 })

  expect(response.status()).toBe(307)
  expect(response.headers()["location"]).toBe("/blocked-words")
})
