import { expect, test } from "vitest"

import { periodBounds } from "./period-bounds"

test("no period has no bound", () => {
  expect(periodBounds({ start: null, end: null })).toEqual({})
})

test("the start of a period is the ID just under the first ID of its first millisecond, so that a message sent then is kept", () => {
  expect(
    periodBounds({ start: new Date("2026-10-04T22:00:00Z"), end: null })
  ).toEqual({ minId: "1556425683763199999" })
})

test("the end of a period is the first ID of its last millisecond, which the bound leaves out", () => {
  expect(
    periodBounds({ start: null, end: new Date("2026-10-31T23:00:00Z") })
  ).toEqual({ maxId: "1566225255628800000" })
})

test("a period starting before the first ID that Discord gave has no lower bound", () => {
  expect(
    periodBounds({
      start: new Date("2014-12-31T23:00:00Z"),
      end: new Date("2015-01-01T23:00:00Z"),
    })
  ).toEqual({ maxId: "347288371200000" })
})
