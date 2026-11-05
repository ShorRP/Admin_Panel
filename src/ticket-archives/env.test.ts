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

test("the archives channel's variable gives its ID", () => {
  expect(
    parseTicketArchivesEnv({
      TICKET_ARCHIVES_CHANNEL_ID: "1562505523490848881",
    })
  ).toEqual({ archivesChannelId: "1562505523490848881" })
})

test("an archives channel left unset or empty is not configured", () => {
  expect(parseTicketArchivesEnv({})).toEqual({ archivesChannelId: null })
  expect(parseTicketArchivesEnv({ TICKET_ARCHIVES_CHANNEL_ID: "" })).toEqual({
    archivesChannelId: null,
  })
})

test("an archives channel that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseTicketArchivesEnv({ TICKET_ARCHIVES_CHANNEL_ID: "transcriptions" })
  )

  expect(error).toContain("TICKET_ARCHIVES_CHANNEL_ID")
  expect(error).not.toContain("transcriptions")
})
