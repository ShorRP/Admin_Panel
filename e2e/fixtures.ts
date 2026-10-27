import { test as base, expect } from "next/experimental/testmode/playwright"
import AxeBuilder from "@axe-core/playwright"

import { DiscordError } from "@/discord/discord-error"
import {
  FakeDiscord,
  type FakeDiscordState,
  type FakeUser,
} from "@/discord/fake-discord"
import { httpAdapter } from "@/discord/http-adapter"

type Fixtures = {
  discordState: FakeDiscordState
  discord: FakeDiscord
  logIn: (user: FakeUser) => Promise<void>
  holdDiscord: () => () => void
  checkAccessibility: (options?: { waitForLoad?: boolean }) => Promise<void>
  browserConsole: void
}

const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

const SMALLEST_SCREEN_WIDTH = 360

export { expect }

export const test = base.extend<Fixtures>({
  discordState: [{}, { option: true }],
  discord: [
    async ({ next, discordState }, use) => {
      const discord = new FakeDiscord(discordState)
      const answer = httpAdapter(discord, discord)
      const adapterErrors: unknown[] = []
      next.onFetch(async (request) => {
        try {
          return await answer(request)
        } catch (error) {
          if (!(error instanceof DiscordError)) {
            adapterErrors.push(error)
          }
          return "abort"
        }
      })
      await use(discord)
      expect(adapterErrors).toEqual([])
    },
    { auto: true },
  ],
  logIn: async ({ page, discord }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(async (user) => {
      let authorization = new URLSearchParams()
      await page.route(
        "/login",
        async (route) => {
          const answer = await route.fetch({ maxRedirects: 0 })
          const location = new URL(answer.headers()["location"] ?? "")
          expect(location.origin + location.pathname).toBe(
            "https://discord.com/oauth2/authorize"
          )
          authorization = location.searchParams
          await route.fulfill({
            contentType: "text/html",
            headers: { "set-cookie": answer.headers()["set-cookie"] ?? "" },
            body: '<!doctype html><html lang="en"><title>Discord</title></html>',
          })
        },
        { times: 1 }
      )
      await page.goto("/login")
      await page.goto(
        `/login/callback?${new URLSearchParams({
          code: discord.issueOAuth2Code(
            user,
            authorization.get("code_challenge") ?? ""
          ),
          state: authorization.get("state") ?? "",
        })}`
      )
    })
  },
  holdDiscord: async ({ next }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(() => {
      let release = () => {}
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      next.onFetch(async () => {
        await held
        return undefined
      })
      return release
    })
  },
  checkAccessibility: async ({ page, colorScheme }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(async ({ waitForLoad = true } = {}) => {
      if (waitForLoad) {
        await page.waitForLoadState()
      }
      const backgrounds = new Map<string, string>()
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme })
        await page.waitForFunction(() => document.getAnimations().length === 0)
        backgrounds.set(
          scheme,
          await page.evaluate(
            () => getComputedStyle(document.body).backgroundColor
          )
        )
        const { violations } = await new AxeBuilder({ page })
          .withTags(WCAG_22_AA_TAGS)
          .analyze()
        expect(
          violations.flatMap(({ id, nodes }) =>
            nodes.map(({ target, failureSummary }) => ({
              rule: id,
              target: target.join(" "),
              failureSummary,
            }))
          ),
          `axe's WCAG 2.2 AA rules in ${scheme}`
        ).toEqual([])
      }
      expect(
        backgrounds.get("dark"),
        "the page's background in dark, against light's"
      ).not.toBe(backgrounds.get("light"))
      await page.emulateMedia({ colorScheme })

      const viewport = page.viewportSize()
      if (viewport === null) {
        throw new Error("The page has no viewport to narrow.")
      }
      await page.setViewportSize({ ...viewport, width: SMALLEST_SCREEN_WIDTH })
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      await page.setViewportSize(viewport)
      expect(
        scrollWidth,
        `the page's width at ${SMALLEST_SCREEN_WIDTH} px`
      ).toBeLessThanOrEqual(clientWidth)
    })
  },
  browserConsole: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
          problems.push(`console.${message.type()}: ${message.text()}`)
        }
      })
      page.on("pageerror", (error) => {
        problems.push(`pageerror: ${error.message}`)
      })
      await use()
      expect(problems).toEqual([])
    },
    { auto: true },
  ],
})
