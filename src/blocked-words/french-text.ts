const frenchNumbers = new Intl.NumberFormat("fr-FR")

const frenchPlurals = new Intl.PluralRules("fr-FR")

export function quoted(text: string) {
  return `« ${text} »`
}

export function frenchNumber(value: number) {
  return frenchNumbers.format(value)
}

export function counted(count: number, one: string, other: string) {
  return `${frenchNumber(count)} ${frenchPlurals.select(count) === "one" ? one : other}`
}
