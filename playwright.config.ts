import { defineConfig, devices } from "@playwright/test"

const PORT = 3100

const ORIGIN = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.test.ts",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: ORIGIN },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: {
      E2E_TEST_PROXY: "1",
      DISCORD_CLIENT_ID: "1200000000000000000",
      DISCORD_CLIENT_SECRET: "e2e-client-secret",
      DISCORD_REDIRECT_URI: `${ORIGIN}/login/callback`,
      DISCORD_BOT_TOKEN: "e2e-bot-token",
      DISCORD_GUILD_ID: "1100000000000000000",
    },
  },
})
