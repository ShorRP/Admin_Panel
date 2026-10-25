import type { NextConfig } from "next"

import { parseDiscordApiEnv, parseDiscordOAuthEnv } from "@/discord/env"

if (process.env.VERCEL) {
  parseDiscordApiEnv(process.env)
  parseDiscordOAuthEnv(process.env)
}

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
}

export default nextConfig
