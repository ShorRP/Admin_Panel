import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
}

export default nextConfig
