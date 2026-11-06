import "server-only"

import { parseBotLogEnv } from "./env"

export function configuredBotLog() {
  return parseBotLogEnv(process.env).botLog
}
