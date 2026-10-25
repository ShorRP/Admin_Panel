import { expect, onTestFinished, test, vi } from "vitest"

import { answering } from "@/discord/answering-fetch"
import type { Fetch } from "./alert"
import { monitorWith } from "./monitor"

function monitorOver(fetch: Fetch) {
  const sends: Promise<void>[] = []
  const monitor = monitorWith({
    env: {
      alertWebhookUrl: "https://discord.com/api/webhooks/1234/a-webhook-token",
      environment: "production",
      commit: "8348758",
    },
    fetch,
    waitUntil: (send) => {
      sends.push(send)
    },
  })
  return { monitor, sent: () => Promise.all(sends) }
}

function capturedLines(method: "error" | "warn") {
  const lines: unknown[][] = []
  const spy = vi.spyOn(console, method).mockImplementation((...line) => {
    lines.push(line)
  })
  onTestFinished(() => {
    spy.mockRestore()
  })
  return lines
}

test("Monitor.error writes the error and sends its alert", async () => {
  const lines = capturedLines("error")
  const webhook = answering(new Response(null, { status: 204 }))
  const { monitor, sent } = monitorOver(webhook.fetch)
  const error = new Error("Invalid environment variables")

  monitor.error(error)
  await sent()

  expect(lines).toEqual([[error]])
  expect(webhook.requests).toHaveLength(1)
})

test("Monitor.warn writes the error, and sends no alert", async () => {
  const lines = capturedLines("warn")
  const webhook = answering(new Response(null, { status: 204 }))
  const { monitor, sent } = monitorOver(webhook.fetch)
  const error = new Error("The login's state differs")

  monitor.warn(error)
  await sent()

  expect(lines).toEqual([[error]])
  expect(webhook.requests).toHaveLength(0)
})
