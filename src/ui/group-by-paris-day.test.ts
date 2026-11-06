import { expect, test } from "vitest"

import { groupByParisDay } from "@/ui/group-by-paris-day"

function at(moment: string) {
  return { date: new Date(moment) }
}

test("entries are grouped by day of Paris, a group keeping the date of its first entry", () => {
  const afterMidnight = at("2026-11-05T23:30:00Z")
  const evening = at("2026-11-05T22:30:00Z")
  const morning = at("2026-11-05T10:00:00Z")
  const before = at("2026-11-04T10:00:00Z")

  expect(groupByParisDay([afterMidnight, evening, morning, before])).toEqual([
    { date: afterMidnight.date, entries: [afterMidnight] },
    { date: evening.date, entries: [evening, morning] },
    { date: before.date, entries: [before] },
  ])
})

test("midnight in Paris, not in UTC, starts a new day", () => {
  const night = at("2026-11-05T23:01:00Z")
  const evening = at("2026-11-05T22:59:00Z")

  expect(
    groupByParisDay([night, evening]).map(({ entries }) => entries)
  ).toEqual([[night], [evening]])
})

test("no entry gives no day", () => {
  expect(groupByParisDay([])).toEqual([])
})
