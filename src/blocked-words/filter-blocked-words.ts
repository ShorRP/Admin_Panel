import { z } from "zod"

export type FilteredBlockedWords =
  | { query: null; words: string[] }
  | { query: string; words: string[]; total: number }

const QUERY = z.string().trim().min(1).nullable().catch(null)

export function filterBlockedWords(
  words: string[],
  queryParam: unknown
): FilteredBlockedWords {
  const query = QUERY.parse(queryParam)
  if (query === null) {
    return { query, words }
  }
  const lowerCaseQuery = query.toLowerCase()
  return {
    query,
    words: words.filter((word) => word.toLowerCase().includes(lowerCaseQuery)),
    total: words.length,
  }
}
