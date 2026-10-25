import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseMonitoringEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

test("ALERT_WEBHOOK_URL is required in production", () => {
  expect(
    thrownBy(() => parseMonitoringEnv({ VERCEL_ENV: "production" }))
  ).toContain("ALERT_WEBHOOK_URL")
})

test("ALERT_WEBHOOK_URL is refused outside https://discord.com/api/webhooks/, without its value", () => {
  for (const url of [
    "https://example.com/api/webhooks/1/token-4f7c",
    "http://discord.com/api/webhooks/1/token-4f7c",
    "https://discord.com/api/v10/token-4f7c",
    "token-4f7c",
  ]) {
    const error = thrownBy(() => parseMonitoringEnv({ ALERT_WEBHOOK_URL: url }))

    expect(error).toContain("ALERT_WEBHOOK_URL")
    expect(error).not.toContain("token-4f7c")
  }
})

test("Vercel's variables give the environment and the short commit, and outside Vercel the environment is local", () => {
  expect(
    parseMonitoringEnv({
      ALERT_WEBHOOK_URL: "https://discord.com/api/webhooks/1234/a-token",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "8348758a1b2c3d4e5f60718293a4b5c6d7e8f901",
    })
  ).toEqual({
    alertWebhookUrl: "https://discord.com/api/webhooks/1234/a-token",
    environment: "preview",
    commit: "8348758",
  })
  expect(parseMonitoringEnv({})).toEqual({
    alertWebhookUrl: undefined,
    environment: "local",
    commit: undefined,
  })
})

test("an empty ALERT_WEBHOOK_URL, as copied from .env.example, counts as unset", () => {
  expect(parseMonitoringEnv({ ALERT_WEBHOOK_URL: "" })).toMatchObject({
    alertWebhookUrl: undefined,
  })
  expect(
    thrownBy(() =>
      parseMonitoringEnv({ ALERT_WEBHOOK_URL: "", VERCEL_ENV: "production" })
    )
  ).toContain("ALERT_WEBHOOK_URL")
})
