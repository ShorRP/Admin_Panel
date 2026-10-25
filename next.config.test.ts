import { expect, test, vi } from "vitest"

async function loadedConfig() {
  vi.resetModules()
  const { default: config } = await import("./next.config")
  return config
}

test("a build without E2E_TEST_PROXY sets no test proxy", async () => {
  vi.stubEnv("VERCEL", undefined)
  vi.stubEnv("E2E_TEST_PROXY", undefined)

  expect((await loadedConfig()).experimental).not.toHaveProperty("testProxy")
})

test("E2E_TEST_PROXY turns Next.js's test proxy on", async () => {
  vi.stubEnv("VERCEL", undefined)
  vi.stubEnv("E2E_TEST_PROXY", "1")

  expect((await loadedConfig()).experimental).toEqual({ testProxy: true })
})

test("a build on Vercel refuses E2E_TEST_PROXY", async () => {
  vi.stubEnv("VERCEL", "1")
  vi.stubEnv("DISCORD_BOT_TOKEN", "a-bot-token")
  vi.stubEnv("DISCORD_GUILD_ID", "1100000000000000000")
  vi.stubEnv("DISCORD_CLIENT_ID", "1200000000000000000")
  vi.stubEnv("DISCORD_CLIENT_SECRET", "a-client-secret")
  vi.stubEnv("DISCORD_REDIRECT_URI", "https://panel.example/login/callback")
  vi.stubEnv("E2E_TEST_PROXY", "1")

  await expect(loadedConfig()).rejects.toThrow(/E2E_TEST_PROXY/)
})

test("a production build on Vercel needs ALERT_WEBHOOK_URL", async () => {
  vi.stubEnv("VERCEL", "1")
  vi.stubEnv("VERCEL_ENV", "production")
  vi.stubEnv("DISCORD_BOT_TOKEN", "a-bot-token")
  vi.stubEnv("DISCORD_GUILD_ID", "1100000000000000000")
  vi.stubEnv("DISCORD_CLIENT_ID", "1200000000000000000")
  vi.stubEnv("DISCORD_CLIENT_SECRET", "a-client-secret")
  vi.stubEnv("DISCORD_REDIRECT_URI", "https://panel.example/login/callback")
  vi.stubEnv("E2E_TEST_PROXY", undefined)
  vi.stubEnv("ALERT_WEBHOOK_URL", undefined)

  await expect(loadedConfig()).rejects.toThrow(/ALERT_WEBHOOK_URL/)

  vi.stubEnv("ALERT_WEBHOOK_URL", "https://discord.com/api/webhooks/1/a-token")

  await expect(loadedConfig()).resolves.toBeDefined()
})
