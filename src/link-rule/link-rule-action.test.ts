import { expect, test } from "vitest"

import { changeableActionOf } from "./link-rule-action"

const MODERATOR = { opensModeration: true }

const MEMBER = { opensModeration: false }

const EVERY_ACTION = ["block", "timeout-1h", "timeout-1d"]

test("a staff member who holds a moderation role may change the action, with the three actions to choose among, whichever the rule has", () => {
  expect(changeableActionOf(MODERATOR, "block")).toEqual({
    current: "block",
    choices: EVERY_ACTION,
  })
  expect(changeableActionOf(MODERATOR, "timeout-1h")).toEqual({
    current: "timeout-1h",
    choices: EVERY_ACTION,
  })
  expect(changeableActionOf(MODERATOR, "timeout-1d")).toEqual({
    current: "timeout-1d",
    choices: EVERY_ACTION,
  })
})

test("a staff member who holds none has no change to make: « Bloquer seulement » is theirs, but choosing an exclusion and leaving one are not", () => {
  expect(changeableActionOf(MEMBER, "block")).toBeNull()
  expect(changeableActionOf(MEMBER, "timeout-1h")).toBeNull()
  expect(changeableActionOf(MEMBER, "timeout-1d")).toBeNull()
})

test("nobody may change an action that the panel does not offer, which is set in Discord", () => {
  expect(changeableActionOf(MODERATOR, null)).toBeNull()
  expect(changeableActionOf(MEMBER, null)).toBeNull()
})
