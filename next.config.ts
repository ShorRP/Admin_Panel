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

const contentSecurityPolicy = [
  "default-src 'self'",
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ")

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: testProxy ? { testProxy } : {},
  headers: () =>
    Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]),
  redirects: () =>
    Promise.resolve([
      { source: "/", destination: "/blocked-words", permanent: false },
    ]),
}

export default nextConfig
