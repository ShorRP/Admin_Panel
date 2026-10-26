import type { NextConfig } from "next"

import {
  parseDiscordApiEnv,
  parseDiscordOAuthEnv,
  parseTestProxyEnv,
} from "@/discord/env"
import { parseMonitoringEnv } from "@/monitoring/env"
import { parseStaffEnv } from "@/staff/env"

const { testProxy } = parseTestProxyEnv(process.env)

if (process.env.VERCEL) {
  parseDiscordApiEnv(process.env)
  parseDiscordOAuthEnv(process.env)
  parseMonitoringEnv(process.env)
  parseStaffEnv(process.env)
}

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: testProxy ? { testProxy } : {},
}

export default nextConfig
