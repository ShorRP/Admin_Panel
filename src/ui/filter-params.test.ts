import { expect, test } from "vitest"

import { cursorParamOf, dayParamOf, textParamOf } from "@/ui/filter-params"

test.each([
  ["2026-10-05", "2026-10-05"],
  ["2015-01-01", "2015-01-01"],
  ["2099-12-31", "2099-12-31"],
  ["2028-02-29", "2028-02-29"],
])("the day %s is a day", (value, day) => {
  expect(dayParamOf(value)).toBe(day)
})

test.each([
  ["absent", undefined],
  ["empty", ""],
  ["a date written with a slash", "2026/10/05"],
  ["a date with no leading zero", "2026-1-5"],
  ["a date that does not exist", "2026-02-30"],
  ["a 29 February of a common year", "2027-02-29"],
  ["a month that does not exist", "2026-13-01"],
  ["a date before Discord existed", "2014-12-31"],
  ["a date past 2099", "2100-01-01"],
  ["a date with a time", "2026-10-05T10:00"],
  ["a date given twice", ["2026-10-05", "2026-10-06"]],
  ["a number", 20261005],
  ["null", null],
])("%s is no day", (_, value) => {
  expect(dayParamOf(value)).toBeNull()
})

test("a text loses the spaces around it", () => {
  expect(textParamOf("  free nitro ", 100)).toBe("free nitro")
})

test.each([
  ["absent", undefined],
  ["empty", ""],
  ["blank", "   "],
  ["given twice", ["a", "b"]],
  ["a number", 42],
  ["null", null],
])("a text that is %s counts as absent", (_, value) => {
  expect(textParamOf(value, 100)).toBeNull()
})

test("a text of the maximum length is read, and one character more counts as absent", () => {
  expect(textParamOf("a".repeat(100), 100)).toBe("a".repeat(100))
  expect(textParamOf("a".repeat(101), 100)).toBeNull()
})

test.each([
  ["a snowflake of 17 digits", "12345678901234567"],
  ["a snowflake of 19 digits", "1568100000000000000"],
  ["the largest ID Discord can mint", "18446744073709551615"],
])("%s is a cursor", (_, value) => {
  expect(cursorParamOf(value)).toBe(value)
})

test.each([
  ["absent", undefined],
  ["empty", ""],
  ["a word", "hier"],
  ["16 digits", "1234567890123456"],
  ["21 digits", "123456789012345678901"],
  ["an ID past 64 bits", "18446744073709551616"],
  ["a signed number", "-1568100000000000000"],
  ["given twice", ["1568100000000000000", "1568100000000000001"]],
  ["a number", 1568100000000000000],
  ["null", null],
])("%s is no cursor", (_, value) => {
  expect(cursorParamOf(value)).toBeNull()
})
