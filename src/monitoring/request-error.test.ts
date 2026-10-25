import type { RESTPostAPIWebhookWithTokenJSONBody } from "discord-api-types/v10"
import { expect, onTestFinished, test, vi } from "vitest"

import { answering } from "@/discord/answering-fetch"
import { restDiscordApi } from "@/discord/discord-api"
import { readJson } from "@/discord/read-json"
import type { Fetch } from "./alert"
import type { MonitoringEnv } from "./env"
import { requestErrorReporterWith } from "./request-error"

const WEBHOOK_URL = "https://discord.com/api/webhooks/1234/a-webhook-token"

const ENV: MonitoringEnv = {
  alertWebhookUrl: WEBHOOK_URL,
  environment: "production",
  commit: "8348758",
}

const DISCORD_SERVER_ID = "111111111111111111"
const USER_ID = "222222222222222222"

const CALLBACK_REQUEST = {
  path: "/login/callback?code=a-code-4f7c&state=a-state-9e2d",
  method: "GET",
  headers: { cookie: "__Host-oauth-state=a-state-9e2d" },
}

const CALLBACK_CONTEXT = {
  routerKind: "App Router",
  routePath: "/login/callback",
  routeType: "route",
  revalidateReason: undefined,
} as const

function reporterOver(fetch: Fetch, env: MonitoringEnv = ENV) {
  const sends: Promise<void>[] = []
  const report = requestErrorReporterWith({
    env,
    fetch,
    waitUntil: (send) => {
      sends.push(send)
    },
  })
  return { report, sent: () => Promise.all(sends) }
}

async function onlyAlert(requests: Request[]) {
  const [request, ...others] = requests
  if (request === undefined || others.length > 0) {
    throw new Error(`Expected one alert, got ${requests.length}`)
  }
  return {
    request,
    body: await readJson<RESTPostAPIWebhookWithTokenJSONBody>(request),
  }
}

test("the alert of a refused getMember names the method, the route's pattern, the status and Discord's code and message, never the member's ID, nor the request's path or headers", async () => {
  const discord = answering(
    Response.json({ message: "Missing Access", code: 50001 }, { status: 403 })
  )
  const error = await restDiscordApi(
    { botToken: "a-bot-token", guildId: DISCORD_SERVER_ID },
    discord.fetch
  )
    .getMember(USER_ID)
    .catch((error: unknown) => error)
  const webhook = answering(new Response(null, { status: 204 }))
  const { report, sent } = reporterOver(webhook.fetch)

  report(error, CALLBACK_REQUEST, CALLBACK_CONTEXT)
  await sent()

  const { request, body } = await onlyAlert(webhook.requests)
  expect(request.method).toBe("POST")
  expect(request.url).toBe(WEBHOOK_URL)
  expect(body.content).toContain(
    "DiscordError: GET /guilds/{guild.id}/members/{user.id} answered 403: 50001 Missing Access"
  )
  expect(body.content).not.toContain(USER_ID)
  expect(body.content).not.toContain("a-code-4f7c")
  expect(body.content).not.toContain("a-state-9e2d")
  expect(body.allowed_mentions).toEqual({ parse: [] })
})

const PAGE_CONTEXT = {
  routerKind: "App Router",
  routePath: "/blocked-words",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
} as const

function renderError() {
  return Object.assign(new Error("Invalid environment variables"), {
    digest: "4285364996",
  })
}

test("the alert names the environment, the commit, the route, the digest, the error and the start of its stack", async () => {
  const error = renderError()
  const webhook = answering(new Response(null, { status: 204 }))
  const { report, sent } = reporterOver(webhook.fetch)

  report(
    error,
    { path: "/blocked-words", method: "GET", headers: {} },
    PAGE_CONTEXT
  )
  await sent()

  const { body } = await onlyAlert(webhook.requests)
  expect(body.content).toContain("production")
  expect(body.content).toContain("8348758")
  expect(body.content).toContain("render /blocked-words")
  expect(body.content).toContain("4285364996")
  expect(body.content).toContain("Error: Invalid environment variables")
  expect(body.content).toContain(
    error.stack?.split("\n").find((line) => line.trimStart().startsWith("at "))
  )
})

test("an alert keeps within Discord's 2,000 characters, cutting what does not fit", async () => {
  const webhook = answering(new Response(null, { status: 204 }))
  const { report, sent } = reporterOver(webhook.fetch)

  report(
    new Error(
      `Invalid environment variables:\n${"✖ Invalid input\n".repeat(400)}`
    ),
    { path: "/blocked-words", method: "GET", headers: {} },
    PAGE_CONTEXT
  )
  await sent()

  const { body } = await onlyAlert(webhook.requests)
  expect(body.content?.length).toBeLessThanOrEqual(2_000)
  expect(body.content).toMatch(/^\*\*Panel error\*\*/)
  expect(body.content).toMatch(/…\n```$/)
})

test("Discord unavailable sends no alert", async () => {
  const webhook = answering(new Response(null, { status: 204 }))
  const { report, sent } = reporterOver(webhook.fetch)
  const discord = answering(new Response("Bad Gateway", { status: 502 }))
  const error = await restDiscordApi(
    { botToken: "a-bot-token", guildId: DISCORD_SERVER_ID },
    discord.fetch
  )
    .listAutoModerationRules()
    .catch((error: unknown) => error)

  report(
    error,
    { path: "/blocked-words", method: "GET", headers: {} },
    PAGE_CONTEXT
  )
  await sent()

  expect(webhook.requests).toHaveLength(0)
})

function capturedErrorLines() {
  const lines: unknown[][] = []
  const spy = vi.spyOn(console, "error").mockImplementation((...line) => {
    lines.push(line)
  })
  onTestFinished(() => {
    spy.mockRestore()
  })
  return lines
}

test("an alert that Discord answers with a 429 is dropped, not retried, in one line", async () => {
  const lines = capturedErrorLines()
  const webhook = answering(
    Response.json(
      {
        message: "You are being rate limited.",
        retry_after: 0.005,
        global: false,
      },
      { status: 429 }
    ),
    new Response(null, { status: 204 })
  )
  const { report, sent } = reporterOver(webhook.fetch)

  report(renderError(), CALLBACK_REQUEST, CALLBACK_CONTEXT)
  await sent()

  expect(webhook.requests).toHaveLength(1)
  expect(lines).toEqual([["Alert not sent: Discord answered 429"]])
})

test("an alert gives up once its delay runs out, in one line", async () => {
  const lines = capturedErrorLines()
  const hanging: Fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(init.signal?.reason)
      })
    })
  const { report, sent } = reporterOver(hanging)

  report(renderError(), CALLBACK_REQUEST, CALLBACK_CONTEXT)
  await sent()

  expect(lines).toEqual([["Alert not sent: TimeoutError"]])
})

test("an alert never throws, even when fetch itself throws, and says so in one line", async () => {
  const lines = capturedErrorLines()
  const throwing: Fetch = () => {
    throw new TypeError(`Failed to parse URL from ${WEBHOOK_URL}`)
  }
  const { report, sent } = reporterOver(throwing)

  report(renderError(), CALLBACK_REQUEST, CALLBACK_CONTEXT)
  await sent()

  expect(lines).toEqual([["Alert not sent: TypeError"]])
})

test("without ALERT_WEBHOOK_URL, a panel error sends no alert", async () => {
  const webhook = answering(new Response(null, { status: 204 }))
  const { report, sent } = reporterOver(webhook.fetch, {
    alertWebhookUrl: undefined,
    environment: "local",
    commit: undefined,
  })

  report(renderError(), CALLBACK_REQUEST, CALLBACK_CONTEXT)
  await sent()

  expect(webhook.requests).toHaveLength(0)
})
