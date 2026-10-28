const parisTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

export function formatParisTime(date: Date) {
  return parisTime.format(date)
}

export function ParisTime({ date }: { date: Date }) {
  return <time dateTime={date.toISOString()}>{formatParisTime(date)}</time>
}
