import { expect, test } from "vitest"

import { actionChoicesOf } from "./link-rule-action"

const MODERATOR = { opensModeration: true }

const MEMBER = { opensModeration: false }

const EVERY_ACTION = ["block", "timeout-1h", "timeout-1d"]

test("a staff member who holds a moderation role may choose among the three actions, whichever the rule has", () => {
  expect(actionChoicesOf(MODERATOR, "block")).toEqual(EVERY_ACTION)
  expect(actionChoicesOf(MODERATOR, "timeout-1h")).toEqual(EVERY_ACTION)
  expect(actionChoicesOf(MODERATOR, "timeout-1d")).toEqual(EVERY_ACTION)
})

test("a staff member who holds none has no choice to make: « Bloquer seulement » is theirs, but choosing an exclusion and leaving one are not", () => {
  expect(actionChoicesOf(MEMBER, "block")).toEqual([])
  expect(actionChoicesOf(MEMBER, "timeout-1h")).toEqual([])
  expect(actionChoicesOf(MEMBER, "timeout-1d")).toEqual([])
})

test("nobody may change an action that the panel does not offer, which is set in Discord", () => {
  expect(actionChoicesOf(MODERATOR, null)).toEqual([])
  expect(actionChoicesOf(MEMBER, null)).toEqual([])
})
