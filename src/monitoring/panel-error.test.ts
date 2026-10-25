import { expect, test, vi } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { isPanelError } from "./panel-error"

test("Discord unavailable is no panel error", () => {
  expect(
    isPanelError(
      new DiscordError({
        method: "GET",
        route: ROUTES.guildMember,
        status: 503,
      })
    )
  ).toBe(false)
})

test("Discord refusing a call is a panel error, as is any other error", () => {
  expect(
    isPanelError(
      new DiscordError({
        method: "GET",
        route: ROUTES.guildMember,
        status: 403,
        code: 50001,
        discordMessage: "Missing Access",
      })
    )
  ).toBe(true)
  expect(isPanelError(new Error("Invalid environment variables"))).toBe(true)
  expect(isPanelError("a thrown string")).toBe(true)
})

test("a DiscordError from another copy of its class, as instrumentation.ts receives the pages' errors, is still Discord unavailable", async () => {
  vi.resetModules()
  const { DiscordError: OtherCopy } = await import("@/discord/discord-error")
  const error = new OtherCopy({
    method: "GET",
    route: ROUTES.guildMember,
    status: 503,
  })

  expect(error).not.toBeInstanceOf(DiscordError)
  expect(isPanelError(error)).toBe(false)
})
