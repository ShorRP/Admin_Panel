import { expect, test } from "vitest"

import {
  cursorOf,
  gameLogFiltersOf,
  hasFilter,
  NO_FILTERS,
} from "./game-log-filters"

test("nothing in the address is no filter", () => {
  expect(gameLogFiltersOf({})).toEqual(NO_FILTERS)
  expect(hasFilter(NO_FILTERS)).toBe(false)
})

test("each filter is read from its own parameter, a text trimmed", () => {
  expect(
    gameLogFiltersOf({
      category: "characters",
      action: " administration:heal ",
      character: " Merida ",
      account: "2094594320",
      target: "4278190080",
      cell: "3c",
      plugin: " Skyrim.esm ",
      reason: " test ",
      text: "  heal ",
      from: "2026-11-01",
      to: "2026-11-05",
    })
  ).toEqual({
    category: "characters",
    action: "administration:heal",
    character: "Merida",
    account: "2094594320",
    target: "4278190080",
    cell: "3c",
    plugin: "Skyrim.esm",
    reason: "test",
    text: "heal",
    from: "2026-11-01",
    to: "2026-11-05",
  })
})

test.each([
  ["a category that is none of the two", { category: "servers" }],
  ["a repeated category", { category: ["administration", "characters"] }],
  ["an empty action", { action: "" }],
  ["an action with no word in it", { action: "· —" }],
  ["an action of over 100 characters", { action: "a".repeat(101) }],
  ["a blank character", { character: "   " }],
  ["a character with no word in it", { character: "!!" }],
  ["a character of over 100 characters", { character: "a".repeat(101) }],
  ["a game account that is no number", { account: "abc" }],
  ["a game account with a letter in it", { account: "2094x594320" }],
  ["a negative game account", { account: "-1" }],
  ["a game account of over 20 digits", { account: "1".repeat(21) }],
  ["a repeated game account", { account: ["1", "2"] }],
  ["a target with no word in it", { target: "…" }],
  ["a target of over 100 characters", { target: "1".repeat(101) }],
  ["a cell that is no form ID in hex", { cell: "tamriel" }],
  ["a cell of over 8 digits", { cell: "123456789" }],
  ["a cell with its plugin", { cell: "3c:Skyrim.esm" }],
  ["an empty plugin", { plugin: "" }],
  ["a plugin of over 100 characters", { plugin: "a".repeat(101) }],
  ["a reason with no word in it", { reason: "…" }],
  ["a reason of over 1,024 characters", { reason: "a".repeat(1025) }],
  ["a text of over 1,024 characters", { text: "a".repeat(1025) }],
  ["a text with no word in it", { text: "!!!" }],
  ["a day that does not exist", { from: "2026-02-30" }],
  ["a day in the wrong form", { to: "05/11/2026" }],
])("%s counts as absent", (_name, searchParams) => {
  expect(gameLogFiltersOf(searchParams)).toEqual(NO_FILTERS)
})

test("a game account loses its leading zeros, so that Discord is asked for the number the game server writes", () => {
  expect(gameLogFiltersOf({ account: " 002094594320 " }).account).toBe(
    "2094594320"
  )
  expect(gameLogFiltersOf({ account: "000" }).account).toBe("0")
})

test("a cell is kept as it was typed, with its prefix", () => {
  expect(gameLogFiltersOf({ cell: " 0x3C " }).cell).toBe("0x3C")
})

test("any filter makes the address filtered, the category too", () => {
  expect(hasFilter({ ...NO_FILTERS, category: "administration" })).toBe(true)
  expect(hasFilter({ ...NO_FILTERS, plugin: "Skyrim" })).toBe(true)
  expect(hasFilter({ ...NO_FILTERS, to: "2026-11-05" })).toBe(true)
})

test("the cursor is a snowflake, or else absent", () => {
  expect(cursorOf({ before: "1568500000000000000" })).toBe(
    "1568500000000000000"
  )
  expect(cursorOf({ before: "abc" })).toBeNull()
  expect(cursorOf({})).toBeNull()
})
