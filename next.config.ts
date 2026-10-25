import type { NextConfig } from "next"

import {
  parseDiscordApiEnv,
  parseDiscordOAuthEnv,
  parseTestProxyEnv,
} from "@/discord/env"

const { testProxy } = parseTestProxyEnv(process.env)

if (process.env.VERCEL) {
  parseDiscordApiEnv(process.env)
  parseDiscordOAuthEnv(process.env)
}

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: testProxy ? { testProxy } : {},
}

export default nextConfig
