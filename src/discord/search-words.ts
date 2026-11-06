const WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]+(?:’[\p{L}\p{N}]+)*/gu

const HAS_WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

export function wordsOf(text: string) {
  return text.toLowerCase().match(WORD) ?? []
}

export function hasWord(text: string) {
  return HAS_WORD.test(text)
}

export function withAWord(text: string | null) {
  return text !== null && hasWord(text) ? text : null
}

export function longestTermOf(text: string) {
  return text
    .split(/\s+/)
    .filter(hasWord)
    .toSorted((left, right) => right.length - left.length)[0]
}

export function holdsWords(text: string, searched: string) {
  const words = new Set(wordsOf(text))
  return wordsOf(searched).every((word) => words.has(word))
}
