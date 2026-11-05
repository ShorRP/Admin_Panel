import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ParisDay, parisDayOf } from "@/ui/paris-day"

test("a moment falls on the day of Paris it is on, not the day of UTC", () => {
  expect(parisDayOf(new Date("2026-10-24T22:30:00.000Z"))).toBe("2026-10-25")
  expect(parisDayOf(new Date("2026-10-24T21:59:00.000Z"))).toBe("2026-10-24")
  expect(parisDayOf(new Date("2026-12-31T23:30:00.000Z"))).toBe("2027-01-01")
})

test("a day shows its date in French in a time whose dateTime is that day of Paris, in full or in short", () => {
  const date = new Date("2026-12-02T10:00:00.000Z")

  expect(renderToStaticMarkup(<ParisDay date={date} dateStyle="full" />)).toBe(
    '<time dateTime="2026-12-02">mercredi 2 décembre 2026</time>'
  )
  expect(
    renderToStaticMarkup(<ParisDay date={date} dateStyle="medium" />)
  ).toBe('<time dateTime="2026-12-02">2 déc. 2026</time>')
})
