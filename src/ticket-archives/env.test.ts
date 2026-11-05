import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseTicketArchivesEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

test("the archives channel's variable gives its ID, and the tickets category's its own", () => {
  expect(
    parseTicketArchivesEnv({
      TICKET_ARCHIVES_CHANNEL_ID: "1562505523490848881",
      TICKET_CATEGORY_ID: "1559574907426439229",
    })
  ).toEqual({
    archivesChannelId: "1562505523490848881",
    ticketCategoryId: "1559574907426439229",
  })
})

test("an archives channel and a tickets category left unset or empty are not configured", () => {
  const notConfigured = { archivesChannelId: null, ticketCategoryId: null }

  expect(parseTicketArchivesEnv({})).toEqual(notConfigured)
  expect(
    parseTicketArchivesEnv({
      TICKET_ARCHIVES_CHANNEL_ID: "",
      TICKET_CATEGORY_ID: "",
    })
  ).toEqual(notConfigured)
})

test("a tickets category alone configures it and leaves the archives channel unset", () => {
  expect(
    parseTicketArchivesEnv({ TICKET_CATEGORY_ID: "1559574907426439229" })
  ).toEqual({
    archivesChannelId: null,
    ticketCategoryId: "1559574907426439229",
  })
})

test("an archives channel that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseTicketArchivesEnv({ TICKET_ARCHIVES_CHANNEL_ID: "transcriptions" })
  )

  expect(error).toContain("TICKET_ARCHIVES_CHANNEL_ID")
  expect(error).not.toContain("transcriptions")
})

test("a tickets category that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseTicketArchivesEnv({ TICKET_CATEGORY_ID: "tickets-prives" })
  )

  expect(error).toContain("TICKET_CATEGORY_ID")
  expect(error).not.toContain("tickets-prives")
})
