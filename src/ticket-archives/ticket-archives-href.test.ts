import { expect, test } from "vitest"

import { ticketArchivesHref } from "./ticket-archives-href"

test("the first page of the archives is the page itself, any other holds its number", () => {
  expect(ticketArchivesHref(1)).toBe("/support-tickets")
  expect(ticketArchivesHref(2)).toBe("/support-tickets?page=2")
  expect(ticketArchivesHref(400)).toBe("/support-tickets?page=400")
})
