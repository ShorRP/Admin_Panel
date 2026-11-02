import { expect, test } from "vitest"

import { accountListHref } from "./account-list-href"

test("the first page of the accounts has no page in its URL, and the others carry theirs", () => {
  expect(accountListHref(1)).toBe("/records")
  expect(accountListHref(2)).toBe("/records?page=2")
  expect(accountListHref(40)).toBe("/records?page=40")
})
