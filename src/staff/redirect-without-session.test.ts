import { NextRequest } from "next/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { InMemoryMonitor } from "@/monitoring/in-memory-monitor"
import { redirectWithoutSession } from "./redirect-without-session"
import { sessionCookie } from "./session"

const SESSION_SECRET = "a-session-secret-of-32-chars-xxx"

const ALDIS_ID = "1400000000000000001"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.stubEnv("STAFF_ROLE_ID", "1300000000000000000")
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET)
})

afterEach(() => {
  vi.useRealTimers()
})

function requestWith(session?: string) {
  return new NextRequest("http://localhost:3000/blocked-words", {
    headers:
      session === undefined ? {} : { Cookie: `__Host-session=${session}` },
  })
}

async function sealed(userId: string, sessionSecret: string) {
  return (await sessionCookie(userId, sessionSecret)).value
}

function locationOf(response: Response) {
  return response.headers.get("Location")
}

test("a request with a readable session gets through", async () => {
  const monitor = new InMemoryMonitor()

  const response = await redirectWithoutSession(
    requestWith(await sealed(ALDIS_ID, SESSION_SECRET)),
    monitor
  )

  expect(locationOf(response)).toBeNull()
  expect(response.headers.get("x-middleware-next")).toBe("1")
  expect(monitor.reports).toEqual([])
})

test("a request without a readable session goes to /login", async () => {
  for (const session of [
    undefined,
    "not-a-seal",
    await sealed(ALDIS_ID, "another-session-secret-of-32-chars"),
  ]) {
    const monitor = new InMemoryMonitor()

    const response = await redirectWithoutSession(requestWith(session), monitor)

    expect(locationOf(response)).toBe("http://localhost:3000/login")
    expect(monitor.reports).toEqual([])
  }
})

test("a session is readable for 7 days from the login, and never extended", async () => {
  const loggedInAt = Date.parse("2026-10-26T10:00:00Z")
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(loggedInAt)
  const session = await sealed(ALDIS_ID, SESSION_SECRET)

  async function locationAt(time: number) {
    vi.setSystemTime(time)
    return locationOf(
      await redirectWithoutSession(requestWith(session), new InMemoryMonitor())
    )
  }

  expect(await locationAt(loggedInAt + SEVEN_DAYS_MS - 60_000)).toBeNull()
  expect(await locationAt(loggedInAt + SEVEN_DAYS_MS + 60_000)).toBe(
    "http://localhost:3000/login"
  )
})

test("an error is reported at error, and the request gets through to the page's own check", async () => {
  vi.stubEnv("SESSION_SECRET", undefined)
  const monitor = new InMemoryMonitor()

  const response = await redirectWithoutSession(requestWith(), monitor)

  expect(locationOf(response)).toBeNull()
  expect(response.headers.get("x-middleware-next")).toBe("1")
  expect(monitor.reports.map(({ level }) => level)).toEqual(["error"])
})
