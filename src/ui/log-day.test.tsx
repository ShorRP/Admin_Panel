import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogDay } from "@/ui/log-day"

test("a day is a section whose heading gives the weekday, the date and the year of its day of Paris", () => {
  const html = renderToStaticMarkup(
    <LogDay date={new Date("2026-12-02T10:00:00.000Z")}>
      <li>une ligne</li>
    </LogDay>
  )

  expect(html).toMatch(/^<section[^>]*>/)
  expect(/<h2[^>]*>(.*?)<\/h2>/.exec(html)?.[1]).toBe(
    '<time dateTime="2026-12-02">mercredi 2 décembre 2026</time>'
  )
})

test("a day holds its lines in an ordered list after its heading and a rule hidden from assistive technologies, and names no landmark", () => {
  const html = renderToStaticMarkup(
    <LogDay date={new Date("2026-12-02T10:00:00.000Z")}>
      <li>une ligne</li>
      <li>une autre</li>
    </LogDay>
  )

  expect(html).toMatch(/<h2[^>]*>.*<\/h2><span aria-hidden="true"/)
  expect(html.indexOf("<ol")).toBeGreaterThan(html.indexOf("</h2>"))
  expect(/<ol[^>]*>(.*)<\/ol>/.exec(html)?.[1]).toBe(
    "<li>une ligne</li><li>une autre</li>"
  )
  expect(html).not.toMatch(/<section[^>]*\saria-label/)
})
