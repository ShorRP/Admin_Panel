import { inspect } from "node:util"
import { expect, test, vi } from "vitest"

import { answering } from "./answering-fetch"
import { DiscordError } from "./discord-error"
import { createDiscordOAuth, restDiscordOAuth } from "./discord-oauth"

const ENV = {
  clientId: "123456789012345678",
  clientSecret: "a-client-secret",
  redirectUri: "http://localhost:3000/login/callback",
}

const CODE_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

const CODE_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

test("the authorization URL asks Discord for identify alone, with the state, a consent screen and the code verifier's S256 challenge", () => {
  const { fetch } = answering()

  const url = new URL(
    restDiscordOAuth(ENV, fetch).authorizationUrl("a-state", CODE_VERIFIER)
  )

  expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize")
  expect(Object.fromEntries(url.searchParams)).toEqual({
    client_id: "123456789012345678",
    redirect_uri: "http://localhost:3000/login/callback",
    response_type: "code",
    scope: "identify",
    state: "a-state",
    prompt: "consent",
    code_challenge: CODE_CHALLENGE,
    code_challenge_method: "S256",
  })
})

const TOKEN = {
  access_token: "an-access-token",
  token_type: "Bearer",
  expires_in: 604800,
  refresh_token: "a-refresh-token",
  scope: "identify",
}

test("exchanging a code authenticates the panel and names the redirect URI and the code verifier", async () => {
  const { fetch, requests } = answering(Response.json(TOKEN))

  const token = await restDiscordOAuth(ENV, fetch).exchangeCode(
    "a-code",
    CODE_VERIFIER
  )

  expect(token).toEqual(TOKEN)
  const [request] = requests
  expect(request?.method).toBe("POST")
  expect(request?.url).toBe("https://discord.com/api/oauth2/token")
  expect(request?.headers.get("Authorization")).toBe(
    "Basic MTIzNDU2Nzg5MDEyMzQ1Njc4OmEtY2xpZW50LXNlY3JldA=="
  )
  expect(request?.headers.get("Content-Type")).toBe(
    "application/x-www-form-urlencoded"
  )
  expect(request?.headers.get("User-Agent")).toMatch(/^DiscordBot \(/)
  expect(
    Object.fromEntries(new URLSearchParams(await request?.text()))
  ).toEqual({
    grant_type: "authorization_code",
    code: "a-code",
    redirect_uri: "http://localhost:3000/login/callback",
    code_verifier: CODE_VERIFIER,
  })
})

test("a refused code fails with Discord's OAuth2 error, and never with the code", async () => {
  const { fetch } = answering(
    Response.json(
      {
        error: "invalid_grant",
        error_description: 'Invalid "code" in request.',
      },
      { status: 400 }
    )
  )

  const error = await restDiscordOAuth(ENV, fetch)
    .exchangeCode("a-code-4b1d", CODE_VERIFIER)
    .catch((error: unknown) => error)

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({
    method: "POST",
    route: "/oauth2/token",
    status: 400,
    discordMessage: 'invalid_grant: Invalid "code" in request.',
    unavailable: false,
  })
  expect(inspect(error)).not.toContain("a-code-4b1d")
})

test("the current user is read with the member's access token", async () => {
  const user = {
    id: "222222222222222222",
    username: "gilles",
    discriminator: "0",
    global_name: "Gilles",
    avatar: null,
  }
  const { fetch, requests } = answering(Response.json(user))

  expect(
    await restDiscordOAuth(ENV, fetch).getCurrentUser("an-access-token")
  ).toEqual(user)
  const [request] = requests
  expect(request?.method).toBe("GET")
  expect(request?.url).toBe("https://discord.com/api/v10/users/@me")
  expect(request?.headers.get("Authorization")).toBe("Bearer an-access-token")
})

test("createDiscordOAuth validates Discord's variables when it is called", () => {
  vi.stubEnv("DISCORD_CLIENT_ID", ENV.clientId)
  vi.stubEnv("DISCORD_CLIENT_SECRET", ENV.clientSecret)
  vi.stubEnv("DISCORD_REDIRECT_URI", "")

  expect(() => createDiscordOAuth()).toThrow(/DISCORD_REDIRECT_URI/)

  vi.stubEnv("DISCORD_REDIRECT_URI", ENV.redirectUri)

  expect(() => createDiscordOAuth()).not.toThrow()
})
