const frenchNumbers = new Intl.NumberFormat("fr-FR")

export function frenchNumber(value: number) {
  return frenchNumbers.format(value)
}
