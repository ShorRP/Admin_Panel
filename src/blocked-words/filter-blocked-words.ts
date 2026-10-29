import { z } from "zod"

export type FilteredBlockedWords = {
  filter: string | null
  words: string[]
  total: number
}

const FILTER = z.string().trim().min(1).nullable().catch(null)

export function filterBlockedWords(
  words: string[],
  filterParam: unknown
): FilteredBlockedWords {
  const filter = FILTER.parse(filterParam)
  if (filter === null) {
    return { filter, words, total: words.length }
  }
  const searched = filter.toLocaleLowerCase("fr")
  return {
    filter,
    words: words.filter((word) =>
      word.toLocaleLowerCase("fr").includes(searched)
    ),
    total: words.length,
  }
}
