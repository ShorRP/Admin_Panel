import { parisDayOf } from "@/ui/paris-day"
import { parisDayAfter, parisDayStart } from "@/ui/paris-day-bounds"

const RETENTION_DAYS = 45

const DAY_MS = 86_400_000

export type Period = { from: string | null; to: string | null }

export type PeriodReach =
  "within" | "starts-before-retention" | "outside-retention" | "reversed"

export function periodMatcher(
  { from, to }: Period,
  toleranceMs = 0
): (date: Date) => boolean {
  const start = from === null ? null : parisDayStart(from).getTime()
  const end = to === null ? null : parisDayAfter(to).getTime()
  return (date) =>
    (start === null || date.getTime() >= start - toleranceMs) &&
    (end === null || date.getTime() < end + toleranceMs)
}

export function periodReachOf({ from, to }: Period, now: Date): PeriodReach {
  if (from !== null && to !== null && from > to) {
    return "reversed"
  }
  const oldestKept = new Date(now.getTime() - RETENTION_DAYS * DAY_MS)
  if (
    (to !== null && parisDayAfter(to) <= oldestKept) ||
    (from !== null && parisDayStart(from) > now)
  ) {
    return "outside-retention"
  }
  if (
    from !== null &&
    parisDayStart(from) < parisDayStart(parisDayOf(oldestKept))
  ) {
    return "starts-before-retention"
  }
  return "within"
}

export function readsNothing(reach: PeriodReach) {
  return reach === "reversed" || reach === "outside-retention"
}
