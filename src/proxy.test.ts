import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { beforeEach, expect, test, vi } from "vitest"

import { sessionCookie } from "@/staff/session"
import { config, proxy } from "./proxy"

const SESSION_SECRET = "a-session-secret-of-32-chars-xxx"

beforeEach(() => {
  vi.stubEnv("STAFF_ROLE_ID", "1300000000000000000")
  vi.stubEnv("MODERATION_ROLE_IDS", "1300000000000000002")
  vi.stubEnv("BAN_ROLE_IDS", "1300000000000000003")
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET)
})

test("everything under /login and static files get through without the proxy", () => {
  for (const url of [
    "/login",
    "/login/callback?code=a-code&state=a-state",
    "/login/refused",
    "/login/failed",
    "/login/logged-out",
    "/_next/static/chunks/main.js",
    "/_next/image?url=%2Flogo.png&w=64&q=75",
    "/favicon.ico",
    "/robots.txt",
  ]) {
    expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false)
  }
})

test("any other route goes through the proxy", () => {
  for (const url of ["/", "/blocked-words", "/audit-log", "/login-help"]) {
    expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true)
  }
})

test("a route without a readable session goes to /login", async () => {
  const response = await proxy(
    new NextRequest("http://localhost:3000/blocked-words")
  )

  expect(getRedirectUrl(response)).toBe("http://localhost:3000/login")
})

test("a route with a readable session gets through", async () => {
  const session = await sessionCookie("1400000000000000001", SESSION_SECRET)

  const response = await proxy(
    new NextRequest("http://localhost:3000/blocked-words", {
      headers: { Cookie: `${session.name}=${session.value}` },
    })
  )

  expect(getRedirectUrl(response)).toBeNull()
})
