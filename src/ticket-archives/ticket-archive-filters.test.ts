import { expect, test } from "vitest"

import {
  hasFilter,
  NO_FILTERS,
  ticketArchiveFiltersOf,
} from "./ticket-archive-filters"

test("no parameter is no filter", () => {
  expect(ticketArchiveFiltersOf({})).toEqual(NO_FILTERS)
  expect(hasFilter(NO_FILTERS)).toBe(false)
})

test("every filter is read from its parameter, the texts trimmed", () => {
  const filters = ticketArchiveFiltersOf({
    kind: "player-report",
    opener: "  aldis ",
    closer: "<@1400000000000000002>",
    reason: " joueur averti ",
    from: "2026-10-05",
    to: "2026-10-31",
    on: "opened",
    sort: "oldest",
  })

  expect(filters).toEqual({
    kind: "player-report",
    opener: "aldis",
    closer: "<@1400000000000000002>",
    reason: "joueur averti",
    from: "2026-10-05",
    to: "2026-10-31",
    on: "opened",
    sort: "oldest",
  })
  expect(hasFilter(filters)).toBe(true)
})

test("each filter alone makes the filters set", () => {
  for (const searchParams of [
    { kind: "rp-request" },
    { opener: "aldis" },
    { closer: "aldis" },
    { reason: "bug" },
    { from: "2026-10-05" },
    { to: "2026-10-05" },
    { on: "opened", from: "2026-10-05" },
    { sort: "oldest" },
  ]) {
    expect(hasFilter(ticketArchiveFiltersOf(searchParams))).toBe(true)
  }
})

const INVALID: [string, Record<string, unknown>][] = [
  ["a kind that is none of the four", { kind: "other" }],
  ["a kind in capitals", { kind: "TECHNICAL-ISSUE" }],
  ["a kind given twice", { kind: ["rp-request", "other-request"] }],
  ["an empty opener", { opener: "" }],
  ["a blank opener", { opener: "   " }],
  ["an opener given twice", { opener: ["aldis", "brynja"] }],
  ["an opener of 101 characters", { opener: "a".repeat(101) }],
  ["a closer that is no text", { closer: 42 }],
  ["an empty reason", { reason: "" }],
  ["a reason with no word", { reason: "!? ..." }],
  ["a reason of 1,025 characters", { reason: "a".repeat(1025) }],
  ["a reason given twice", { reason: ["bug", "launcher"] }],
  ["a date written with a slash", { from: "2026/10/05" }],
  ["a date with no leading zero", { from: "2026-1-5" }],
  ["a date that does not exist", { from: "2026-02-30" }],
  ["a month that does not exist", { to: "2026-13-01" }],
  ["a date before Discord existed", { from: "2014-12-31" }],
  ["a date past 2099", { to: "2100-01-01" }],
  ["a date with a time", { from: "2026-10-05T10:00" }],
  ["a date given twice", { from: ["2026-10-05", "2026-10-06"] }],
  ["a period on closing", { on: "closed" }],
  ["a period on anything", { on: "both" }],
  ["a sort by newest", { sort: "newest" }],
  ["a sort given twice", { sort: ["oldest", "oldest"] }],
]

for (const [name, searchParams] of INVALID) {
  test(`${name} counts as absent`, () => {
    expect(ticketArchiveFiltersOf(searchParams)).toEqual(NO_FILTERS)
  })
}

test("a period on the opening with no day is no filter: it is absent, and the filters are not set", () => {
  expect(ticketArchiveFiltersOf({ on: "opened" })).toEqual(NO_FILTERS)
  expect(hasFilter(ticketArchiveFiltersOf({ on: "opened" }))).toBe(false)
  expect(ticketArchiveFiltersOf({ on: "opened", to: "2026-10-05" }).on).toBe(
    "opened"
  )
})

test("a valid filter survives an invalid one beside it", () => {
  expect(
    ticketArchiveFiltersOf({
      kind: "nope",
      opener: "aldis",
      from: "2026-02-30",
    })
  ).toEqual({ ...NO_FILTERS, opener: "aldis" })
})

test("the first and the last day that Discord can hold are valid dates", () => {
  expect(
    ticketArchiveFiltersOf({ from: "2015-01-01", to: "2099-12-31" })
  ).toMatchObject({ from: "2015-01-01", to: "2099-12-31" })
  expect(ticketArchiveFiltersOf({ from: "2028-02-29" }).from).toBe("2028-02-29")
})
