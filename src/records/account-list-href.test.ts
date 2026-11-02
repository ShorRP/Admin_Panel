import { expect, test } from "vitest"

import type { AccountListFilters } from "./account-list-filters"
import { accountListHref } from "./account-list-href"

const NO_FILTERS: AccountListFilters = {
  query: null,
  role: null,
  standing: null,
  joined: null,
  created: null,
  bots: null,
  sort: null,
}

test("the first page of the accounts has no page in its URL, and the others carry theirs", () => {
  expect(accountListHref(NO_FILTERS, 1)).toBe("/records")
  expect(accountListHref(NO_FILTERS, 2)).toBe("/records?page=2")
  expect(accountListHref(NO_FILTERS, 40)).toBe("/records?page=40")
})

test("a link writes only the filters that are set, in a fixed order, with the page last", () => {
  expect(
    accountListHref(
      {
        query: "ald",
        role: "1300000000000000001",
        standing: "timed-out",
        joined: "over-1y",
        created: "30d",
        bots: "shown",
        sort: "joined-recent",
      },
      3
    )
  ).toBe(
    "/records?query=ald&role=1300000000000000001&standing=timed-out&joined=over-1y&created=30d&bots=shown&sort=joined-recent&page=3"
  )
  expect(accountListHref({ ...NO_FILTERS, sort: "role" }, 1)).toBe(
    "/records?sort=role"
  )
  expect(accountListHref({ ...NO_FILTERS, role: "none" }, 2)).toBe(
    "/records?role=none&page=2"
  )
})

test("the text searched is written as a query string, spaces and symbols escaped", () => {
  expect(accountListHref({ ...NO_FILTERS, query: "alda & co é" }, 1)).toBe(
    "/records?query=alda+%26+co+%C3%A9"
  )
})
