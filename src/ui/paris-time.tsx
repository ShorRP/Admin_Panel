const parisTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

export function ParisTime({ date }: { date: Date }) {
  return <time dateTime={date.toISOString()}>{parisTime.format(date)}</time>
}
