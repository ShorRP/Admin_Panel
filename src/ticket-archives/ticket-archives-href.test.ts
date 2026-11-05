import { expect, test } from "vitest"

import { NO_FILTERS } from "./ticket-archive-filters"
import { ticketArchivesHref } from "./ticket-archives-href"

test("the first page of the archives is the page itself, any other holds its number", () => {
  expect(ticketArchivesHref(NO_FILTERS, 1)).toBe("/support-tickets")
  expect(ticketArchivesHref(NO_FILTERS, 2)).toBe("/support-tickets?page=2")
  expect(ticketArchivesHref(NO_FILTERS, 400)).toBe("/support-tickets?page=400")
})

test("only the filters that are set are written, in a fixed order, before the page", () => {
  expect(
    ticketArchivesHref(
      {
        kind: "rp-request",
        opener: "aldis",
        closer: "<@1400000000000000002>",
        reason: "launcher cassé",
        from: "2026-10-05",
        to: "2026-10-31",
        on: "opened",
        sort: "oldest",
      },
      3
    )
  ).toBe(
    "/support-tickets?kind=rp-request&opener=aldis&closer=%3C%401400000000000000002%3E&reason=launcher+cass%C3%A9&from=2026-10-05&to=2026-10-31&on=opened&sort=oldest&page=3"
  )
  expect(
    ticketArchivesHref({ ...NO_FILTERS, closer: "brynja", sort: "oldest" }, 1)
  ).toBe("/support-tickets?closer=brynja&sort=oldest")
})
