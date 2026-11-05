import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogEmpty } from "@/ui/log-empty"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

test("an empty log says its sentence as a paragraph in one frame", () => {
  const html = renderToStaticMarkup(
    <LogEmpty message="Rien ne correspond." resetHref={null} />
  )

  expect(html).toMatch(/^<div[^>]*>.*<\/div>$/)
  expect(
    Array.from(html.matchAll(/<p>(.*?)<\/p>/g), ([, line]) => line)
  ).toEqual(["Rien ne correspond."])
})

test("with nowhere to reset to, it offers no link", () => {
  const html = renderToStaticMarkup(
    <LogEmpty message="Rien ne correspond." resetHref={null} />
  )

  expect(html).not.toContain("<a")
  expect(text(html)).toBe("Rien ne correspond.")
})

test("with an address to reset to, it offers « Réinitialiser » after the sentence", () => {
  const html = renderToStaticMarkup(
    <LogEmpty message="Rien ne correspond." resetHref="/events" />
  )

  expect(text(html)).toBe("Rien ne correspond.Réinitialiser")
  expect(html).toMatch(/<a[^>]*\shref="\/events"[^>]*>Réinitialiser<\/a>/)
  expect(html.indexOf("<a")).toBeGreaterThan(html.indexOf("</p>"))
})
