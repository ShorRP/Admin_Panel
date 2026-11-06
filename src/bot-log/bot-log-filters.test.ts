import { expect, test } from "vitest"

import {
  botLogFiltersOf,
  cursorOf,
  hasFilter,
  NO_FILTERS,
} from "./bot-log-filters"

test("nothing in the address is no filter", () => {
  expect(botLogFiltersOf({})).toEqual(NO_FILTERS)
  expect(hasFilter(NO_FILTERS)).toBe(false)
})

test("each filter is read from its own parameter, a text trimmed", () => {
  expect(
    botLogFiltersOf({
      family: "tickets",
      action: " Ticket fermé ",
      account: "lyra",
      channel: "#ticket-0042",
      text: "  résolu ",
      from: "2026-11-01",
      to: "2026-11-05",
    })
  ).toEqual({
    family: "tickets",
    action: "Ticket fermé",
    account: "lyra",
    channel: "#ticket-0042",
    text: "résolu",
    from: "2026-11-01",
    to: "2026-11-05",
  })
})

test.each([
  ["a family that is none of the five", { family: "tickets-opened" }],
  ["a repeated family", { family: ["tickets", "rules"] }],
  ["an empty action", { action: "" }],
  ["a blank action", { action: "   " }],
  ["an action with no word in it", { action: "· —" }],
  ["an account of over 100 characters", { account: "a".repeat(101) }],
  ["a channel of over 100 characters", { channel: "a".repeat(101) }],
  ["a text of over 1,024 characters", { text: "a".repeat(1025) }],
  ["a text with no word in it", { text: "!!!" }],
  ["a day that does not exist", { from: "2026-02-30" }],
  ["a day in the wrong form", { to: "05/11/2026" }],
])("%s counts as absent", (_name, searchParams) => {
  expect(botLogFiltersOf(searchParams)).toEqual(NO_FILTERS)
})

test("any filter makes the address filtered, the family too", () => {
  expect(hasFilter({ ...NO_FILTERS, family: "rules" })).toBe(true)
  expect(hasFilter({ ...NO_FILTERS, to: "2026-11-05" })).toBe(true)
})

test("the cursor is a snowflake, or else absent", () => {
  expect(cursorOf({ before: "1568500000000000000" })).toBe(
    "1568500000000000000"
  )
  expect(cursorOf({ before: "abc" })).toBeNull()
  expect(cursorOf({})).toBeNull()
})
