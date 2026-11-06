import { inspect } from "node:util"
import { expect, test } from "vitest"

import { parseGameLogEnv } from "./env"

function thrownBy(run: () => unknown) {
  try {
    run()
  } catch (error) {
    return inspect(error)
  }
  throw new Error("Expected a throw")
}

test("the channel's variable and the webhook's give the game log's two IDs", () => {
  expect(
    parseGameLogEnv({
      GAME_LOG_CHANNEL_ID: "1552824453153423520",
      GAME_LOG_WEBHOOK_ID: "1552824522292330506",
    })
  ).toEqual({
    gameLog: {
      channelId: "1552824453153423520",
      webhookId: "1552824522292330506",
    },
  })
})

test("a channel and a webhook left unset or empty leave the game log unconfigured", () => {
  expect(parseGameLogEnv({})).toEqual({ gameLog: null })
  expect(
    parseGameLogEnv({ GAME_LOG_CHANNEL_ID: "", GAME_LOG_WEBHOOK_ID: "" })
  ).toEqual({ gameLog: null })
})

test("a channel without a webhook is refused, its error naming the missing variable", () => {
  const error = thrownBy(() =>
    parseGameLogEnv({ GAME_LOG_CHANNEL_ID: "1552824453153423520" })
  )

  expect(error).toContain("GAME_LOG_WEBHOOK_ID")
})

test("a webhook without a channel is refused, its error naming the missing variable", () => {
  const error = thrownBy(() =>
    parseGameLogEnv({ GAME_LOG_WEBHOOK_ID: "1552824522292330506" })
  )

  expect(error).toContain("GAME_LOG_CHANNEL_ID")
})

test("a channel that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseGameLogEnv({
      GAME_LOG_CHANNEL_ID: "log-jeux",
      GAME_LOG_WEBHOOK_ID: "1552824522292330506",
    })
  )

  expect(error).toContain("GAME_LOG_CHANNEL_ID")
  expect(error).not.toContain("log-jeux")
})

test("a webhook that is no snowflake is refused, its error naming the variable and never its value", () => {
  const error = thrownBy(() =>
    parseGameLogEnv({
      GAME_LOG_CHANNEL_ID: "1552824453153423520",
      GAME_LOG_WEBHOOK_ID: "shor-webhook",
    })
  )

  expect(error).toContain("GAME_LOG_WEBHOOK_ID")
  expect(error).not.toContain("shor-webhook")
})
