import { expect, test } from "vitest"

import { restDiscordApi } from "./discord-api"
import { describeDiscordApiContract } from "./discord-api-contract"
import { DiscordError } from "./discord-error"
import { restDiscordOAuth } from "./discord-oauth"
import { FakeDiscord } from "./fake-discord"
import { httpAdapter } from "./http-adapter"
import { ROUTES } from "./routes"

function apiOver(fake: FakeDiscord) {
  return restDiscordApi(
    { botToken: "a-bot-token", guildId: fake.guildId },
    httpAdapter(fake, fake)
  )
}

function oauthOver(fake: FakeDiscord) {
  return restDiscordOAuth(
    {
      clientId: fake.applicationUser.id,
      clientSecret: "a-client-secret",
      redirectUri: "http://localhost:3000/login/callback",
    },
    httpAdapter(fake, fake)
  )
}

describeDiscordApiContract("The real DiscordApi over the HTTP adapter", () => ({
  discord: apiOver(new FakeDiscord()),
  outsider: "222222222222222222",
  cleanUp: () => Promise.resolve(),
}))

test("the real DiscordOAuth logs a member in over the HTTP adapter", async () => {
  const fake = new FakeDiscord()
  const oauth = oauthOver(fake)
  const code = fake.issueOAuth2Code({
    id: "222222222222222222",
    username: "gilles",
  })

  const token = await oauth.exchangeCode(code)

  expect(await oauth.getCurrentUser(token.access_token)).toMatchObject({
    id: "222222222222222222",
    username: "gilles",
  })
})

test("a code the fake did not issue is refused over the HTTP adapter", async () => {
  await expect(
    oauthOver(new FakeDiscord()).exchangeCode("a-code")
  ).rejects.toMatchObject({ status: 400, unavailable: false })
})

test("Discord unavailable reaches the real DiscordApi with its status", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({
      method: "GET",
      route: ROUTES.autoModerationRules,
      status: 503,
    })
  )

  await expect(apiOver(fake).listAutoModerationRules()).rejects.toMatchObject({
    status: 503,
    unavailable: true,
  })
})

test("a failure without a response reaches the real DiscordApi as one", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  await expect(apiOver(fake).listAutoModerationRules()).rejects.toMatchObject({
    status: undefined,
    unavailable: true,
  })
})

test("a 429 carries its delay, which the real DiscordApi waits out before it retries", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({
      method: "GET",
      route: ROUTES.autoModerationRules,
      status: 429,
      retryAfter: 0.01,
    })
  )

  expect(await apiOver(fake).listAutoModerationRules()).toEqual([])
})

test("a route the panel does not call is answered as Discord answers an unknown one", async () => {
  const fake = new FakeDiscord()
  const adapter = httpAdapter(fake, fake)

  const response = await adapter("https://discord.com/api/v10/gateway")

  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ message: "404: Not Found", code: 0 })
})

test("a user who is not on the Discord server is answered as Discord answers, with Unknown Member", async () => {
  const fake = new FakeDiscord()
  const adapter = httpAdapter(fake, fake)

  const response = await adapter(
    `https://discord.com/api/v10/guilds/${fake.guildId}/members/222222222222222222`
  )

  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    message: "Unknown Member",
    code: 10007,
  })
})
