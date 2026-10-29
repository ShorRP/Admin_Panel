const parisTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

const parisTimeOfDay = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

export function formatParisTime(date: Date) {
  return parisTime.format(date)
}

export function ParisTime({
  date,
  timeOnly = false,
}: {
  date: Date
  timeOnly?: boolean
}) {
  return (
    <time dateTime={date.toISOString()}>
      {timeOnly ? parisTimeOfDay.format(date) : formatParisTime(date)}
    </time>
  )
}
