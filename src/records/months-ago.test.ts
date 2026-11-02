import { expect, test } from "vitest"

import { monthsAgo } from "./months-ago"

function iso(date: Date) {
  return date.toISOString()
}

test("6 months before a date is the same day six months earlier, at the same time of the day in UTC", () => {
  expect(iso(monthsAgo(new Date("2026-11-02T14:25:36.789Z"), 6))).toBe(
    "2026-05-02T14:25:36.789Z"
  )
  expect(iso(monthsAgo(new Date("2026-03-15T00:00:00.000Z"), 6))).toBe(
    "2025-09-15T00:00:00.000Z"
  )
})

test("a year is twelve months, and the year changes where the months go before January", () => {
  expect(iso(monthsAgo(new Date("2026-11-02T14:25:36.789Z"), 12))).toBe(
    "2025-11-02T14:25:36.789Z"
  )
  expect(iso(monthsAgo(new Date("2026-02-10T08:00:00.000Z"), 6))).toBe(
    "2025-08-10T08:00:00.000Z"
  )
})

test("a day the earlier month lacks becomes that month's last day, with its time of the day kept", () => {
  expect(iso(monthsAgo(new Date("2026-08-31T23:59:59.999Z"), 6))).toBe(
    "2026-02-28T23:59:59.999Z"
  )
  expect(iso(monthsAgo(new Date("2026-05-31T10:00:00.000Z"), 1))).toBe(
    "2026-04-30T10:00:00.000Z"
  )
})

test("February 29 of a leap year, a year earlier, is February 28, and a leap day is kept where the earlier year has one", () => {
  expect(iso(monthsAgo(new Date("2028-02-29T12:00:00.000Z"), 12))).toBe(
    "2027-02-28T12:00:00.000Z"
  )
  expect(iso(monthsAgo(new Date("2028-08-29T12:00:00.000Z"), 6))).toBe(
    "2028-02-29T12:00:00.000Z"
  )
})

test("the date it is given is left as it was", () => {
  const now = new Date("2026-08-31T12:00:00.000Z")

  monthsAgo(now, 6)

  expect(iso(now)).toBe("2026-08-31T12:00:00.000Z")
})
