import { test as base, expect } from "next/experimental/testmode/playwright"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { httpAdapter } from "@/discord/http-adapter"

type Fixtures = {
  discord: FakeDiscord
  browserConsole: void
}

export { expect }

export const test = base.extend<Fixtures>({
  discord: [
    async ({ next }, use) => {
      const discord = new FakeDiscord()
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
