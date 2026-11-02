import { z } from "zod"

import type { BlockedWord } from "./read-blocked-words"

export type FilteredBlockedWords =
  | { query: null; words: BlockedWord[] }
  | { query: string; words: BlockedWord[]; total: number }

const QUERY = z.string().trim().min(1).nullable().catch(null)

export function filterBlockedWords(
  words: BlockedWord[],
  queryParam: unknown
): FilteredBlockedWords {
  const query = QUERY.parse(queryParam)
  if (query === null) {
    return { query, words }
  }
  const lowerCaseQuery = query.toLowerCase()
  return {
    query,
    words: words.filter(({ word }) =>
      word.toLowerCase().includes(lowerCaseQuery)
    ),
    total: words.length,
  }
}
