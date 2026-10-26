import { inspect } from "node:util"
import { NextRequest } from "next/server"
import { unsealData } from "iron-session"
import { beforeEach, expect, test, vi } from "vitest"

import { createDiscordApi } from "@/discord/discord-api"
import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeUser } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { InMemoryMonitor } from "@/monitoring/in-memory-monitor"
import { completeLogin, startLogin } from "./login"

const ORIGIN = "http://localhost:3000"

const STAFF_ROLE_ID = "1300000000000000000"

const SESSION_SECRET = "a-session-secret-of-32-chars-xxx"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

beforeEach(() => {
  vi.stubEnv("STAFF_ROLE_ID", STAFF_ROLE_ID)
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET)
})

function discordWithStaff() {
  return new FakeDiscord({
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYNJA, roles: [] },
    ],
  })
}

type Cookie = { value: string; attributes: Map<string, string> }

function splitOnEquals(text: string) {
  const index = text.indexOf("=")
  return index === -1
    ? [text, ""]
    : [text.slice(0, index), text.slice(index + 1)]
}

function cookiesOf(response: Response) {
  const cookies = new Map<string, Cookie>()
  for (const header of response.headers.getSetCookie()) {
    const [pair = "", ...attributes] = header
      .split(";")
      .map((part) => part.trim())
    const [name = "", value = ""] = splitOnEquals(pair)
    cookies.set(name, {
      value,
      attributes: new Map(
        attributes.map((attribute) => {
          const [key = "", setting = ""] = splitOnEquals(attribute)
          return [key.toLowerCase(), setting.toLowerCase()]
        })
      ),
    })
  }
  return cookies
}

function clientsOf(discord: FakeDiscord) {
  return { discord: () => discord, oauth: () => discord }
}

function locationOf(response: Response) {
  return response.headers.get("Location")
}

function callback(query: Record<string, string>, stateCookie?: string) {
  const url = new URL("/login/callback", ORIGIN)
  url.search = new URLSearchParams(query).toString()
  return new NextRequest(url, {
    headers:
      stateCookie === undefined
        ? {}
        : { Cookie: `__Host-oauth-state=${stateCookie}` },
  })
}

function startedLogin(discord: FakeDiscord) {
  const response = startLogin(discord)
  const authorization = new URL(locationOf(response) ?? "").searchParams
  const state = authorization.get("state")
  const codeChallenge = authorization.get("code_challenge")
  const stateCookie = cookiesOf(response).get("__Host-oauth-state")?.value
  if (state === null || codeChallenge === null || stateCookie === undefined) {
    throw new Error("No state, code challenge or state cookie")
  }
  return { response, state, codeChallenge, stateCookie }
}

async function loggedIn(discord: FakeDiscord, user: FakeUser) {
  const monitor = new InMemoryMonitor()
  const { state, codeChallenge, stateCookie } = startedLogin(discord)
  const response = await completeLogin(
    callback(
      { code: discord.issueOAuth2Code(user, codeChallenge), state },
      stateCookie
    ),
    monitor,
    clientsOf(discord)
  )
  return { response, monitor }
}

function expectStateCookieDeleted(response: Response) {
  const cookie = cookiesOf(response).get("__Host-oauth-state")
  expect(cookie?.value).toBe("")
  expect(cookie?.attributes.get("path")).toBe("/")
  expect(cookie?.attributes.has("secure")).toBe(true)
}

test("logging in sends the browser to Discord with a fresh state and code challenge, which a cookie keeps for 10 minutes with their code verifier", () => {
  const discord = discordWithStaff()
  const first = startedLogin(discord)
  const second = startedLogin(discord)

  expect(locationOf(first.response)).toMatch(
    /^https:\/\/discord\.com\/oauth2\/authorize\?/
  )
  expect(first.state).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(second.state).not.toBe(first.state)
  expect(first.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(second.codeChallenge).not.toBe(first.codeChallenge)
  const [cookieState, codeVerifier] = first.stateCookie.split(".")
  expect(cookieState).toBe(first.state)
  expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
  const cookie = cookiesOf(first.response).get("__Host-oauth-state")
  expect(Object.fromEntries(cookie?.attributes ?? [])).toMatchObject({
    path: "/",
    "max-age": "600",
    httponly: "",
    secure: "",
    samesite: "lax",
  })
})

test("a staff member who logs in lands on / with a 7-day session that holds only their Discord ID", async () => {
  const { response, monitor } = await loggedIn(discordWithStaff(), ALDIS)

  expect(locationOf(response)).toBe(`${ORIGIN}/`)
  const session = cookiesOf(response).get("__Host-session")
  expect(Object.fromEntries(session?.attributes ?? [])).toMatchObject({
    path: "/",
    "max-age": "604800",
    httponly: "",
    secure: "",
    samesite: "lax",
  })
  expect(
    await unsealData(session?.value ?? "", { password: SESSION_SECRET })
  ).toEqual({ userId: ALDIS.id })
  expectStateCookieDeleted(response)
  expect(monitor.reports).toEqual([])
})

test("a member without the staff role is refused, with no session and no report", async () => {
  const { response, monitor } = await loggedIn(discordWithStaff(), BRYNJA)

  expect(locationOf(response)).toBe(`${ORIGIN}/login/refused`)
  expect(cookiesOf(response).has("__Host-session")).toBe(false)
  expectStateCookieDeleted(response)
  expect(monitor.reports).toEqual([])
})

test("a missing or differing state, or a state cookie without its code verifier, fails the login, reported at warn without either", async () => {
  const discord = discordWithStaff()
  const { state, codeChallenge, stateCookie } = startedLogin(discord)
  const code = discord.issueOAuth2Code(ALDIS, codeChallenge)

  for (const request of [
    callback({ code, state }),
    callback({ code }, stateCookie),
    callback({ code, state: `${state.slice(1)}x` }, stateCookie),
    callback({ code, state: "short" }, stateCookie),
    callback({ code, state }, state),
  ]) {
    const monitor = new InMemoryMonitor()
    const response = await completeLogin(request, monitor, clientsOf(discord))

    expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
    expect(cookiesOf(response).has("__Host-session")).toBe(false)
    expectStateCookieDeleted(response)
    expect(monitor.reports.map(({ level }) => level)).toEqual(["warn"])
    expect(inspect(monitor.reports)).not.toContain(state)
    expect(inspect(monitor.reports)).not.toContain(stateCookie)
    expect(inspect(monitor.reports)).not.toContain(code)
  }
})

test("a login cancelled on Discord fails, with no report", async () => {
  const discord = discordWithStaff()
  const monitor = new InMemoryMonitor()
  const { state, stateCookie } = startedLogin(discord)

  const response = await completeLogin(
    callback({ error: "access_denied", state }, stateCookie),
    monitor,
    clientsOf(discord)
  )

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expectStateCookieDeleted(response)
  expect(monitor.reports).toEqual([])
})

test("Discord unavailable fails the login, reported at warn", async () => {
  const discord = discordWithStaff()
  const unavailable = new DiscordError({
    method: "POST",
    route: ROUTES.oauth2Token,
    status: 503,
  })
  discord.failNext("exchangeCode", unavailable)

  const { response, monitor } = await loggedIn(discord, ALDIS)

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expect(cookiesOf(response).has("__Host-session")).toBe(false)
  expectStateCookieDeleted(response)
  expect(monitor.reports).toEqual([{ level: "warn", error: unavailable }])
})

test("a panel error fails the login, reported at error without the member's Discord ID", async () => {
  const discord = discordWithStaff()
  const missingAccess = new DiscordError({
    method: "GET",
    route: ROUTES.guildMember,
    status: 403,
    code: 50001,
    discordMessage: "Missing Access",
  })
  discord.failNext("getMember", missingAccess)

  const { response, monitor } = await loggedIn(discord, ALDIS)

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expect(cookiesOf(response).has("__Host-session")).toBe(false)
  expectStateCookieDeleted(response)
  expect(monitor.reports).toEqual([{ level: "error", error: missingAccess }])
  expect(inspect(monitor.reports)).not.toContain(ALDIS.id)
})

test("a code Discord refuses fails the login, reported at error", async () => {
  const discord = discordWithStaff()
  const monitor = new InMemoryMonitor()
  const { state, stateCookie } = startedLogin(discord)

  const response = await completeLogin(
    callback({ code: "code-unknown", state }, stateCookie),
    monitor,
    clientsOf(discord)
  )

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expectStateCookieDeleted(response)
  expect(monitor.reports.map(({ level }) => level)).toEqual(["error"])
})

test("a missing session secret fails the login, reported at error", async () => {
  vi.stubEnv("SESSION_SECRET", undefined)

  const { response, monitor } = await loggedIn(discordWithStaff(), ALDIS)

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expect(cookiesOf(response).has("__Host-session")).toBe(false)
  expectStateCookieDeleted(response)
  expect(monitor.reports.map(({ level }) => level)).toEqual(["error"])
  expect(inspect(monitor.reports)).toContain("SESSION_SECRET")
})

test("a missing Discord variable fails the login, reported at error", async () => {
  vi.stubEnv("DISCORD_BOT_TOKEN", undefined)
  const discord = discordWithStaff()
  const monitor = new InMemoryMonitor()
  const { state, codeChallenge, stateCookie } = startedLogin(discord)

  const response = await completeLogin(
    callback(
      { code: discord.issueOAuth2Code(ALDIS, codeChallenge), state },
      stateCookie
    ),
    monitor,
    { discord: createDiscordApi, oauth: () => discord }
  )

  expect(locationOf(response)).toBe(`${ORIGIN}/login/failed`)
  expectStateCookieDeleted(response)
  expect(monitor.reports.map(({ level }) => level)).toEqual(["error"])
  expect(inspect(monitor.reports)).toContain("DISCORD_BOT_TOKEN")
})
