import "server-only"

import { createAlerting, sendAlert, type Alerting } from "./alert"

export type Monitor = {
  error(error: unknown): void
  warn(error: unknown): void
}

export function createMonitor(): Monitor {
  return monitorWith(createAlerting)
}

export function monitorWith(alerting: () => Alerting): Monitor {
  return {
    error(error) {
      console.error(error)
      sendAlert(alerting(), error)
    },
    warn(error) {
      console.warn(error)
    },
  }
}
