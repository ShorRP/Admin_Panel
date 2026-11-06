const PARIS = "Europe/Paris"

const WALL_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
})

export function parisDayStart(day: string) {
  const [year, month, date] = day.split("-").map(Number)
  const midnight = Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1)
  const guess = midnight - parisOffsetAt(midnight)
  return new Date(midnight - parisOffsetAt(guess))
}

export function parisDayAfter(day: string) {
  const [year, month, date] = day.split("-").map(Number)
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (date ?? 1) + 1))
  return parisDayStart(next.toISOString().slice(0, 10))
}

export function parisPeriodOf({
  from,
  to,
}: {
  from: string | null
  to: string | null
}) {
  return {
    start: from === null ? null : parisDayStart(from),
    end: to === null ? null : parisDayAfter(to),
  }
}

function parisOffsetAt(instant: number) {
  const parts = Object.fromEntries(
    WALL_CLOCK.formatToParts(new Date(instant)).map(({ type, value }) => [
      type,
      Number(value),
    ])
  )
  const wallClock = Date.UTC(
    parts["year"] ?? 0,
    (parts["month"] ?? 1) - 1,
    parts["day"] ?? 1,
    parts["hour"] ?? 0,
    parts["minute"] ?? 0,
    parts["second"] ?? 0
  )
  return wallClock - Math.floor(instant / 1000) * 1000
}
