import { expect, test } from "vitest"

import { periodBounds } from "./period-bounds"

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
