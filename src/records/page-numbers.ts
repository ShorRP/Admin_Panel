const ALL_SHOWN_UP_TO = 7

const COMPACT_ALL_SHOWN_UP_TO = 5

export const GAP = "…"

export function pageNumbersOf(
  page: number,
  pages: number,
  { compact = false }: { compact?: boolean } = {}
) {
  if (pages <= (compact ? COMPACT_ALL_SHOWN_UP_TO : ALL_SHOWN_UP_TO)) {
    return Array.from({ length: pages }, (_, index) => index + 1)
  }
  const shown = [
    ...new Set(
      [1, page - 1, page, page + 1, pages].filter(
        (number) => number >= 1 && number <= pages
      )
    ),
  ].toSorted((left, right) => left - right)
  const entries: (number | typeof GAP)[] = []
  for (const [index, number] of shown.entries()) {
    const previous = shown[index - 1]
    if (previous !== undefined) {
      const hidden = number - previous - 1
      if (hidden === 1 && !compact) {
        entries.push(previous + 1)
      } else if (hidden >= 1) {
        entries.push(GAP)
      }
    }
    entries.push(number)
  }
  return entries
}
