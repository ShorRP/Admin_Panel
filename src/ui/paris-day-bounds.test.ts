import { expect, test } from "vitest"

import {
  parisDayAfter,
  parisDayStart,
  parisPeriodOf,
} from "@/ui/paris-day-bounds"

test("a period runs from the start of its first Paris day to the start of the day after its last, and a missing day leaves that side open", () => {
  expect(parisPeriodOf({ from: null, to: null })).toEqual({
    start: null,
    end: null,
  })
  expect(parisPeriodOf({ from: "2026-10-05", to: null })).toEqual({
    start: new Date("2026-10-04T22:00:00Z"),
    end: null,
  })
  expect(parisPeriodOf({ from: null, to: "2026-10-31" })).toEqual({
    start: null,
    end: new Date("2026-10-31T23:00:00Z"),
  })
  expect(parisPeriodOf({ from: "2026-10-24", to: "2026-10-25" })).toEqual({
    start: new Date("2026-10-23T22:00:00Z"),
    end: new Date("2026-10-25T23:00:00Z"),
  })
})

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
