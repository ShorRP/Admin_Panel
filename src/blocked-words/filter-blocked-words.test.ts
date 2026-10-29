import { expect, test } from "vitest"

import { filterBlockedWords } from "./filter-blocked-words"

const WORDS = ["abricot", "Free Nitro", "nitro gratuit", "Éclair", "zèbre"]

test("a blocked word passes the filter when it contains the text searched, whatever its case", () => {
  expect(filterBlockedWords(WORDS, "NITRO")).toEqual({
    query: "NITRO",
    words: ["Free Nitro", "nitro gratuit"],
    total: 5,
  })
  expect(filterBlockedWords(WORDS, "itr").words).toEqual([
    "Free Nitro",
    "nitro gratuit",
  ])
  expect(filterBlockedWords(WORDS, "éCL").words).toEqual(["Éclair"])
})

test("the filter tells an accented letter from a plain one, since it leaves out the case alone", () => {
  expect(filterBlockedWords(WORDS, "eclair").words).toEqual([])
  expect(filterBlockedWords(WORDS, "zebre").words).toEqual([])
})

test("the text searched leaves out the spaces around it", () => {
  expect(filterBlockedWords(WORDS, "  nitro ")).toEqual({
    query: "nitro",
    words: ["Free Nitro", "nitro gratuit"],
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
