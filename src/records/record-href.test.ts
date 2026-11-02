import { expect, test } from "vitest"

import { recordHref, recordHrefOf } from "./record-href"

const ID = "1400000000000000001"

test("an account's record is at /records/ and its ID", () => {
  expect(recordHref(ID)).toBe(`/records/${ID}`)
})

test("a staff member who moderates gets the link to the record of an account with an ID", () => {
  expect(recordHrefOf(ID, true)).toBe(`/records/${ID}`)
})

test("a staff member who does not moderate gets no link, whatever the account", () => {
  expect(recordHrefOf(ID, false)).toBeNull()
  expect(recordHrefOf(null, false)).toBeNull()
})

test("an account with no ID gets no link, even for a staff member who moderates", () => {
  expect(recordHrefOf(null, true)).toBeNull()
})
