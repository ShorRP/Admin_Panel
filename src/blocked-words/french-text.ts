const frenchNumbers = new Intl.NumberFormat("fr-FR")

const frenchPlurals = new Intl.PluralRules("fr-FR")

const NO_BREAK_SPACE = String.fromCharCode(0xa0)

const OPENING_QUOTE = `«${NO_BREAK_SPACE}`

const CLOSING_QUOTE = `${NO_BREAK_SPACE}»`

export function quoted(text: string) {
  return `${OPENING_QUOTE}${text}${CLOSING_QUOTE}`
}

export function unquoted(text: string) {
  if (
    text.length < OPENING_QUOTE.length + CLOSING_QUOTE.length ||
    !text.startsWith(OPENING_QUOTE) ||
    !text.endsWith(CLOSING_QUOTE)
  ) {
    return null
  }
  return text.slice(OPENING_QUOTE.length, -CLOSING_QUOTE.length)
}

export function frenchNumber(value: number) {
  return frenchNumbers.format(value)
}

export function counted(count: number, one: string, other: string) {
  return `${frenchNumber(count)} ${frenchPlurals.select(count) === "one" ? one : other}`
}
