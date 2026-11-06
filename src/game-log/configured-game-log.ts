import "server-only"

import { parseGameLogEnv } from "./env"

export function configuredGameLog() {
  return parseGameLogEnv(process.env).gameLog
}
