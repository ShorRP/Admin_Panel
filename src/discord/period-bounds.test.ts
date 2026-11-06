import { expect, test } from "vitest"

import { periodBounds, searchBounds } from "./period-bounds"

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

const NOV_5 = {
  start: new Date("2026-11-04T23:00:00Z"),
  end: new Date("2026-11-05T23:00:00Z"),
}

test("a search with no period and no cursor has no bound", () => {
  expect(searchBounds({ start: null, end: null }, null)).toEqual({})
})

test("a search takes the bounds of its period when it has no cursor", () => {
  expect(searchBounds(NOV_5, null)).toEqual(periodBounds(NOV_5))
})

test("a cursor inside the period becomes the upper bound, the lower one staying the period's", () => {
  const cursor = "1568000000000000000"

  expect(searchBounds(NOV_5, cursor)).toEqual({
    minId: periodBounds(NOV_5).minId,
    maxId: cursor,
  })
})

test("a cursor past the end of the period leaves the period's own upper bound", () => {
  expect(searchBounds(NOV_5, "1999999999999999999")).toEqual(
    periodBounds(NOV_5)
  )
})

test("a cursor alone is the upper bound", () => {
  expect(
    searchBounds({ start: null, end: null }, "1568000000000000000")
  ).toEqual({ maxId: "1568000000000000000" })
})

test("a period that ends where it starts or before reads nothing", () => {
  expect(searchBounds({ start: NOV_5.end, end: NOV_5.start }, null)).toBeNull()
  expect(searchBounds({ start: NOV_5.end, end: NOV_5.end }, null)).toBeNull()
})

test("a cursor at or under the start of the period reads nothing", () => {
  const { minId } = periodBounds(NOV_5)

  expect(searchBounds(NOV_5, minId ?? "")).toBeNull()
  expect(searchBounds(NOV_5, "1500000000000000000")).toBeNull()
})
