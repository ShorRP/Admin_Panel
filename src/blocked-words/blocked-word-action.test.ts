import { expect, test } from "vitest"

import {
  allowedActions,
  BLOCKED_WORD_ACTIONS,
  blockedWordAction,
  mayUse,
  strongestOf,
} from "./blocked-word-action"

const STAFF_ONLY = { opensModeration: false, opensBans: false }

const MODERATOR = { opensModeration: true, opensBans: false }

test("the actions run from the weakest to the strongest, under the labels the staff read", () => {
  expect(BLOCKED_WORD_ACTIONS.map(({ label }) => label)).toEqual([
    "Bloquer seulement",
    "Exclusion 1 heure",
    "Exclusion 1 jour",
  ])
})

test("each action has the name of the AutoMod rule that ShorBot reads, with a middle dot between two ordinary spaces", () => {
  expect(BLOCKED_WORD_ACTIONS.map(({ ruleName }) => ruleName)).toEqual([
    "Mots interdits du panel",
    "Mots interdits du panel · exclusion 1 heure",
    "Mots interdits du panel · exclusion 1 jour",
  ])
  const separator = Buffer.from([0x20, 0xc2, 0xb7, 0x20])
  for (const { ruleName } of BLOCKED_WORD_ACTIONS.slice(1)) {
    expect(Buffer.from(ruleName).includes(separator)).toBe(true)
  }
})

test("the actions that time out say so in a message of at most 150 characters, with a no-break space before the colon, and the one that only blocks sets none", () => {
  const [block, ...timeouts] = BLOCKED_WORD_ACTIONS

  expect(block?.customMessage).toBeNull()
  expect(
    timeouts.map(({ customMessage, timeoutSeconds }) => ({
      customMessage,
      timeoutSeconds,
      length: Array.from(customMessage ?? "").length,
    }))
  ).toEqual([
    {
      customMessage:
        "Message bloqué : il contient un mot interdit. Tu reçois une exclusion temporaire d’une heure du serveur Discord de Shor.",
      timeoutSeconds: 3600,
      length: 120,
    },
    {
      customMessage:
        "Message bloqué : il contient un mot interdit. Tu reçois une exclusion temporaire d’un jour du serveur Discord de Shor.",
      timeoutSeconds: 86400,
      length: 118,
    },
  ])
})

test("anyone on the staff may use the action that only blocks, and only a moderator the ones that time out", () => {
  expect(allowedActions(STAFF_ONLY).map(({ id }) => id)).toEqual(["block"])
  expect(allowedActions(MODERATOR).map(({ id }) => id)).toEqual([
    "block",
    "timeout-1h",
    "timeout-1d",
  ])
  expect(mayUse(STAFF_ONLY, blockedWordAction("timeout-1h"))).toBe(false)
  expect(mayUse(MODERATOR, blockedWordAction("timeout-1h"))).toBe(true)
  expect(mayUse(STAFF_ONLY, blockedWordAction("block"))).toBe(true)
})

test("of several actions, the strongest is the one the member would suffer, and none gives none", () => {
  expect(strongestOf(["block", "timeout-1d", "timeout-1h"])?.id).toBe(
    "timeout-1d"
  )
  expect(strongestOf(["timeout-1h", "block"])?.id).toBe("timeout-1h")
  expect(strongestOf([])).toBeNull()
})
