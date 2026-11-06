import { expect, test } from "vitest"

import { parisDayAfter, parisDayStart } from "@/ui/paris-day-bounds"

test("a Paris day starts at midnight in Paris, whatever the offset that day", () => {
  expect(parisDayStart("2026-01-15")).toEqual(new Date("2026-01-14T23:00:00Z"))
  expect(parisDayStart("2026-07-15")).toEqual(new Date("2026-07-14T22:00:00Z"))
})

test("a Paris day starts at midnight on the days the clocks change", () => {
  expect(parisDayStart("2026-03-28")).toEqual(new Date("2026-03-27T23:00:00Z"))
  expect(parisDayStart("2026-03-29")).toEqual(new Date("2026-03-28T23:00:00Z"))
  expect(parisDayStart("2026-03-30")).toEqual(new Date("2026-03-29T22:00:00Z"))
  expect(parisDayStart("2026-10-25")).toEqual(new Date("2026-10-24T22:00:00Z"))
  expect(parisDayStart("2026-10-26")).toEqual(new Date("2026-10-25T23:00:00Z"))
})

test("the day after a Paris day starts at the next midnight in Paris, a day of 23 or 25 hours included", () => {
  expect(parisDayAfter("2026-01-15")).toEqual(new Date("2026-01-15T23:00:00Z"))
  expect(parisDayAfter("2026-03-28")).toEqual(new Date("2026-03-28T23:00:00Z"))
  expect(parisDayAfter("2026-03-29")).toEqual(new Date("2026-03-29T22:00:00Z"))
  expect(parisDayAfter("2026-10-25")).toEqual(new Date("2026-10-25T23:00:00Z"))
  expect(parisDayAfter("2026-12-31")).toEqual(new Date("2026-12-31T23:00:00Z"))
})
