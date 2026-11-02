import { expect, test } from "vitest"

import { filterBlockedWords } from "./filter-blocked-words"
import type { BlockedWord } from "./read-blocked-words"

const WORDS: BlockedWord[] = [
  { word: "abricot", action: "block" },
  { word: "Free Nitro", action: "timeout-1h" },
  { word: "nitro gratuit", action: "block" },
  { word: "Éclair", action: "timeout-1d" },
  { word: "zèbre", action: "block" },
]

function wordsOf(words: BlockedWord[]) {
  return words.map(({ word }) => word)
}

test("a blocked word passes the filter when it contains the text searched, whatever its case and its action", () => {
  expect(filterBlockedWords(WORDS, "NITRO")).toEqual({
    query: "NITRO",
    words: [WORDS[1], WORDS[2]],
    total: 5,
  })
  expect(wordsOf(filterBlockedWords(WORDS, "itr").words)).toEqual([
    "Free Nitro",
    "nitro gratuit",
  ])
  expect(wordsOf(filterBlockedWords(WORDS, "éCL").words)).toEqual(["Éclair"])
})

test("the filter tells an accented letter from a plain one, since it leaves out the case alone", () => {
  expect(filterBlockedWords(WORDS, "eclair").words).toEqual([])
  expect(filterBlockedWords(WORDS, "zebre").words).toEqual([])
})

test("the text searched leaves out the spaces around it", () => {
  expect(filterBlockedWords(WORDS, "  nitro ")).toEqual({
    query: "nitro",
    words: [WORDS[1], WORDS[2]],
    total: 5,
  })
})

test("with no filter, or an invalid one, which counts as absent, every blocked word shows", () => {
  for (const queryParam of [undefined, "", "   ", ["nitro", "zèbre"], 42]) {
    expect(filterBlockedWords(WORDS, queryParam)).toEqual({
      query: null,
      words: WORDS,
    })
  }
})
