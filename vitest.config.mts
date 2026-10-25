import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

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
    include: ["src/**/*.test.{ts,tsx}", "next.config.test.ts"],
    exclude: [...configDefaults.exclude, "src/**/*.contract.test.ts"],
    unstubEnvs: true,
  },
})
