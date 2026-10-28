import { defineConfig, devices } from "@playwright/test"

const PORT = 3100

const ORIGIN = `http://localhost:${PORT}`

export const STAFF_ROLE_ID = "1300000000000000000"

export const MODERATION_ROLE_ID = "1300000000000000002"

export const BAN_ROLE_ID = "1300000000000000003"

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.test.ts",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: ORIGIN, reducedMotion: "reduce" },
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
      ALERT_WEBHOOK_URL: "",
      STAFF_ROLE_ID,
      MODERATION_ROLE_IDS: MODERATION_ROLE_ID,
      BAN_ROLE_IDS: BAN_ROLE_ID,
      SESSION_SECRET: "e2e-session-secret-of-32-chars-x",
    },
  },
})
