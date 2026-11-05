const WORD = /[\p{L}\p{N}\p{Extended_Pictographic}]+/gu

export function wordsOf(text: string) {
  return text.toLowerCase().match(WORD) ?? []
}

export function holdsWords(text: string, searched: string) {
  const words = new Set(wordsOf(text))
  return wordsOf(searched).every((word) => words.has(word))
}
