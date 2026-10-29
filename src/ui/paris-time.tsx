const PARIS = "Europe/Paris"

const parisTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: PARIS,
})

const parisTimeOfDay = new Intl.DateTimeFormat("fr-FR", {
  timeStyle: "short",
  timeZone: PARIS,
})

const parisCalendarDate = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: PARIS,
})

const DAY_FORMATS = {
  full: new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "UTC",
  }),
  medium: new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }),
}

export function formatParisTime(date: Date) {
  return parisTime.format(date)
}

export function parisDayOf(date: Date) {
  const parts = new Map(
    parisCalendarDate
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  )
  return (["year", "month", "day"] as const)
    .map((type) => parts.get(type))
    .join("-")
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

export function ParisDay({
  day,
  dateStyle,
}: {
  day: string
  dateStyle: keyof typeof DAY_FORMATS
}) {
  return (
    <time dateTime={day}>{DAY_FORMATS[dateStyle].format(new Date(day))}</time>
  )
}
