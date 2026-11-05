import { expect, test } from "vitest"

import { GAP, pageNumbersOf } from "@/ui/page-numbers"

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

test("in the compact form, up to 5 pages show every number, and past them the first, the last, the current page and its neighbours show", () => {
  expect(pageNumbersOf(1, 1, { compact: true })).toEqual([1])
  expect(pageNumbersOf(3, 5, { compact: true })).toEqual([1, 2, 3, 4, 5])
  expect(pageNumbersOf(5, 9, { compact: true })).toEqual([
    1,
    GAP,
    4,
    5,
    6,
    GAP,
    9,
  ])
  expect(pageNumbersOf(1, 9, { compact: true })).toEqual([1, 2, GAP, 9])
  expect(pageNumbersOf(9, 9, { compact: true })).toEqual([1, GAP, 8, 9])
})

test("in the compact form, a gap may hide a single page, where the full form shows it, so that no page shows more than 5 numbers", () => {
  expect(pageNumbersOf(4, 9)).toEqual([1, 2, 3, 4, 5, GAP, 9])
  expect(pageNumbersOf(4, 9, { compact: true })).toEqual([
    1,
    GAP,
    3,
    4,
    5,
    GAP,
    9,
  ])
  expect(pageNumbersOf(3, 6, { compact: true })).toEqual([1, 2, 3, 4, GAP, 6])
  expect(pageNumbersOf(6, 9, { compact: true })).toEqual([
    1,
    GAP,
    5,
    6,
    7,
    GAP,
    9,
  ])
})

test("no page of any count shows more than 5 numbers in the compact form, always the first, the last and the current page", () => {
  for (let pages = 1; pages <= 40; pages++) {
    for (let page = 1; page <= pages; page++) {
      const numbers = pageNumbersOf(page, pages, { compact: true }).filter(
        (entry) => entry !== GAP
      )
      expect(numbers.length, `${page} of ${pages}`).toBeLessThanOrEqual(5)
      expect(numbers[0], `${page} of ${pages}`).toBe(1)
      expect(numbers.at(-1), `${page} of ${pages}`).toBe(pages)
      expect(numbers, `${page} of ${pages}`).toContain(page)
    }
  }
})

test("a compact gap sits between two numbers that are not neighbours, never at an end", () => {
  for (let pages = 6; pages <= 30; pages++) {
    for (let page = 1; page <= pages; page++) {
      const entries = pageNumbersOf(page, pages, { compact: true })
      for (const [index, entry] of entries.entries()) {
        if (entry === GAP) {
          const before = entries[index - 1]
          const after = entries[index + 1]
          if (typeof before !== "number" || typeof after !== "number") {
            throw new Error(`${page} of ${pages} has a gap beside a gap.`)
          }
          expect(after - before, `${page} of ${pages}`).toBeGreaterThan(1)
        }
      }
    }
  }
})
