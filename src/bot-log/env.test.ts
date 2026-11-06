import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseBotLogEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

test("the channel's variable gives the Bot log's channel, and no author's ID, since the author is the application", () => {
  expect(parseBotLogEnv({ BOT_LOG_CHANNEL_ID: "1550837163464327289" })).toEqual(
    { botLog: { channelId: "1550837163464327289" } }
  )
})

test("a channel left unset or empty leaves the Bot log unconfigured", () => {
  expect(parseBotLogEnv({})).toEqual({ botLog: null })
  expect(parseBotLogEnv({ BOT_LOG_CHANNEL_ID: "" })).toEqual({ botLog: null })
})

test("a channel that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseBotLogEnv({ BOT_LOG_CHANNEL_ID: "log-admin" })
  )

  expect(error).toContain("BOT_LOG_CHANNEL_ID")
  expect(error).not.toContain("log-admin")
})
