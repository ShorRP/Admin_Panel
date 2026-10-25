import type { Monitor } from "./monitor"

export type Report = {
  level: keyof Monitor
  error: unknown
}

export class InMemoryMonitor implements Monitor {
  readonly reports: Report[] = []

  error(error: unknown) {
    this.reports.push({ level: "error", error })
  }

  warn(error: unknown) {
    this.reports.push({ level: "warn", error })
  }
}
