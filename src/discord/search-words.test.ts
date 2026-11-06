import { expect, test } from "vitest"

import { holdsWords, longestTermOf, wordsOf } from "./search-words"

test("a word is whole, whatever its case, and an apostrophe U+2019 joins the letters around it", () => {
  expect(wordsOf("Problème RÉSOLU, l’ouverture 42 ✅")).toEqual([
    "problème",
    "résolu",
    "l’ouverture",
    "42",
    "✅",
  ])
})

test("a text holds the words it is searched by wherever they sit in it", () => {
  expect(holdsWords("un deux trois quatre cinq", "cinq un")).toBe(true)
})

test("a word is not held by a longer word that contains it", () => {
  expect(holdsWords("Focus Mode désactivé", "activé")).toBe(false)
  expect(holdsWords("Focus Mode activé", "activé")).toBe(true)
})

test("the longest term is the longest run of non-space characters that holds a word", () => {
  expect(longestTermOf("de problème ... résolu")).toBe("problème")
  expect(longestTermOf("... --")).toBeUndefined()
})
