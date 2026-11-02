import { expect, test } from "vitest"

import { blockedWordAction } from "./blocked-word-action"
import {
  actionChangeOf,
  actionChangeReason,
  additionReason,
  removalReason,
} from "./blocked-word-reason"

const BLOCK = blockedWordAction("block")

const ONE_DAY = blockedWordAction("timeout-1d")

test("the reasons name the word and its action in French quotes", () => {
  expect(additionReason("foo", ONE_DAY)).toBe(
    "ajout de « foo », action « Exclusion 1 jour »"
  )
  expect(removalReason("foo", BLOCK)).toBe(
    "retrait de « foo », action « Bloquer seulement »"
  )
  expect(actionChangeReason("foo", BLOCK, ONE_DAY)).toBe(
    "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »"
  )
})

test("the reason of a change reads back as its word and the two actions", () => {
  expect(actionChangeOf(actionChangeReason("foo", BLOCK, ONE_DAY))).toEqual({
    word: "foo",
    from: BLOCK,
    to: ONE_DAY,
  })
})

test("a word that holds the change's own phrases reads back whole", () => {
  const word = "a » passe de « Exclusion 1 heure » à « Bloquer seulement"

  expect(actionChangeOf(actionChangeReason(word, ONE_DAY, BLOCK))).toEqual({
    word,
    from: ONE_DAY,
    to: BLOCK,
  })
})

test("the reason of an addition or of a removal, a text of Discord's and a change between unknown actions are no change of action", () => {
  for (const reason of [
    additionReason("foo", BLOCK),
    removalReason("foo", ONE_DAY),
    "Mots interdits à la main",
    "« foo » passe de « Bloquer seulement » à « Bannissement »",
    "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour » puis autre chose",
    "foo passe de « Bloquer seulement » à « Exclusion 1 jour »",
  ]) {
    expect(actionChangeOf(reason)).toBeNull()
  }
})
