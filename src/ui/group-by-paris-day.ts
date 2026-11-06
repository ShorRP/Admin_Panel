import { parisDayOf } from "@/ui/paris-day"

export type DayGroup<Entry> = { date: Date; entries: Entry[] }

export function groupByParisDay<Entry extends { date: Date }>(
  entries: readonly Entry[]
) {
  const days: DayGroup<Entry>[] = []
  for (const entry of entries) {
    const day = days.at(-1)
    if (day !== undefined && parisDayOf(day.date) === parisDayOf(entry.date)) {
      day.entries.push(entry)
    } else {
      days.push({ date: entry.date, entries: [entry] })
    }
  }
  return days
}
