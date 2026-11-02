import { expect, test } from "vitest"

import { GAP, pageNumbersOf } from "./page-numbers"

test("up to 7 pages, every page number shows", () => {
  expect(pageNumbersOf(1, 1)).toEqual([1])
  expect(pageNumbersOf(1, 3)).toEqual([1, 2, 3])
  expect(pageNumbersOf(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
})

test("past 7 pages, the first, the last, the current page and its neighbours show, apart by a gap", () => {
  expect(pageNumbersOf(10, 20)).toEqual([1, GAP, 9, 10, 11, GAP, 20])
  expect(pageNumbersOf(1, 20)).toEqual([1, 2, GAP, 20])
  expect(pageNumbersOf(20, 20)).toEqual([1, GAP, 19, 20])
  expect(pageNumbersOf(2, 20)).toEqual([1, 2, 3, GAP, 20])
  expect(pageNumbersOf(19, 20)).toEqual([1, GAP, 18, 19, 20])
})

test("a gap hides two pages or more, and a single hidden page shows instead", () => {
  expect(pageNumbersOf(4, 20)).toEqual([1, 2, 3, 4, 5, GAP, 20])
  expect(pageNumbersOf(5, 20)).toEqual([1, GAP, 4, 5, 6, GAP, 20])
  expect(pageNumbersOf(17, 20)).toEqual([1, GAP, 16, 17, 18, 19, 20])
  expect(pageNumbersOf(5, 8)).toEqual([1, GAP, 4, 5, 6, 7, 8])
  expect(pageNumbersOf(4, 8)).toEqual([1, 2, 3, 4, 5, GAP, 8])
})

test("no page of any count shows more than 7 entries", () => {
  for (let pages = 1; pages <= 40; pages++) {
    for (let page = 1; page <= pages; page++) {
      expect(
        pageNumbersOf(page, pages).length,
        `${page} of ${pages}`
      ).toBeLessThanOrEqual(7)
    }
  }
})
