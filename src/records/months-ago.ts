export function monthsAgo(now: Date, months: number) {
  const earlier = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - months,
      1,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )
  )
  const lastDay = new Date(
    Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth() + 1, 0)
  ).getUTCDate()
  earlier.setUTCDate(Math.min(now.getUTCDate(), lastDay))
  return earlier
}
