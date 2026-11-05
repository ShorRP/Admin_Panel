import { z } from "zod"

const FIRST_YEAR = 2015

const LAST_YEAR = 2099

const DAY = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDay)
  .nullable()
  .catch(null)

export function dayParamOf(value: unknown): string | null {
  return DAY.parse(value)
}

export function textParamOf(value: unknown, maxLength: number): string | null {
  return z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .nullable()
    .catch(null)
    .parse(value)
}

function isCalendarDay(day: string) {
  const [year, month, date] = day.split("-").map(Number)
  if (
    year === undefined ||
    month === undefined ||
    date === undefined ||
    year < FIRST_YEAR ||
    year > LAST_YEAR
  ) {
    return false
  }
  const moment = new Date(Date.UTC(year, month - 1, date))
  return (
    moment.getUTCFullYear() === year &&
    moment.getUTCMonth() === month - 1 &&
    moment.getUTCDate() === date
  )
}
