import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseDiscordApiEnv, parseDiscordOAuthEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

test("a missing Discord variable is named in the error", () => {
  expect(
    thrownBy(() =>
      parseDiscordApiEnv({ DISCORD_GUILD_ID: "123456789012345678" })
    )
  ).toContain("DISCORD_BOT_TOKEN")
})

test("an invalid Discord variable is named in the error, without its value", () => {
  const error = thrownBy(() =>
    parseDiscordApiEnv({
      DISCORD_BOT_TOKEN: "a-bot-token",
      DISCORD_GUILD_ID: "guild-4f7c",
    })
  )

  expect(error).toContain("DISCORD_GUILD_ID")
  expect(error).not.toContain("guild-4f7c")
})

const OAUTH_ENV = {
  DISCORD_CLIENT_ID: "123456789012345678",
  DISCORD_CLIENT_SECRET: "a-client-secret",
}

test("the redirect URI may use http: on localhost", () => {
  expect(
    parseDiscordOAuthEnv({
      ...OAUTH_ENV,
      DISCORD_REDIRECT_URI: "http://localhost:3000/login/callback",
    })
  ).toEqual({
    clientId: "123456789012345678",
    clientSecret: "a-client-secret",
    redirectUri: "http://localhost:3000/login/callback",
  })
})

test("the redirect URI uses https: anywhere but on localhost", () => {
  expect(
    thrownBy(() =>
      parseDiscordOAuthEnv({
        ...OAUTH_ENV,
        DISCORD_REDIRECT_URI: "http://panel.example/login/callback",
      })
    )
  ).toContain("DISCORD_REDIRECT_URI")
})
