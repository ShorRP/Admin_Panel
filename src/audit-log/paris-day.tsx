const parisDayParts = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Paris",
})

const parisDayStyles = {
  full: new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }),
  medium: new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
  }),
}

export function parisDayOf(date: Date) {
  const parts = new Map(
    parisDayParts.formatToParts(date).map(({ type, value }) => [type, value])
  )
  return (["year", "month", "day"] as const)
    .map((type) => parts.get(type))
    .join("-")
}

export function ParisDay({
  date,
  dateStyle,
}: {
  date: Date
  dateStyle: keyof typeof parisDayStyles
}) {
  return (
    <time dateTime={parisDayOf(date)}>
      {parisDayStyles[dateStyle].format(date)}
    </time>
  )
}
