import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local")
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url)
      ),
    },
  },
  test: {
    include: ["src/**/*.contract.test.ts"],
    testTimeout: 60_000,
  },
})
