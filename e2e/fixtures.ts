import { test as base, expect } from "next/experimental/testmode/playwright"

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
  browserConsole: void
}

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
