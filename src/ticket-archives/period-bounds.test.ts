import { expect, test } from "vitest"

import { parisDayStart, periodBounds } from "./period-bounds"

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

test("no period has no bound", () => {
  expect(periodBounds({ from: null, to: null })).toEqual({})
})

test("the start of a period is the ID just under the first ID of its first millisecond, so that a message sent then is kept", () => {
  expect(periodBounds({ from: "2026-10-05", to: null })).toEqual({
    minId: "1556425683763199999",
  })
})

test("the end of a period is the first ID of the next Paris day, which the bound leaves out", () => {
  expect(periodBounds({ from: null, to: "2026-10-31" })).toEqual({
    maxId: "1566225255628800000",
  })
})

test("a period starting before the first ID that Discord gave has no lower bound", () => {
  expect(periodBounds({ from: "2015-01-01", to: "2015-01-01" })).toEqual({
    maxId: "347288371200000",
  })
})
