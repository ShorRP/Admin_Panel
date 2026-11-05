import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogPage } from "@/ui/log-page"

function render() {
  return renderToStaticMarkup(
    <LogPage
      overline="45 derniers jours · Heures de Paris"
      title="Événements"
      description="Qui a fait quoi, et quand."
      skeleton={<p id="skeleton" />}
    >
      <p id="content" />
    </LogPage>
  )
}

function parts(html: string) {
  return Array.from(
    html.matchAll(/<(p|h1)(?:\s[^>]*)?>([^<]+)<\/\1>/g),
    ([, element, text]) => `${element}: ${text}`
  )
}

test("the page is a main that gives the overline, the h1 and the sentence of its header", () => {
  const html = render()

  expect(html).toMatch(/^<main[^>]*>.*<\/main>$/)
  expect(parts(html)).toEqual([
    "p: 45 derniers jours · Heures de Paris",
    "h1: Événements",
    "p: Qui a fait quoi, et quand.",
  ])
})

test("the header is followed by a rule hidden from assistive technologies, then by the content", () => {
  const html = render()

  expect(html).toMatch(/<\/p><\/div><div aria-hidden="true"[^>]*>/)
  expect(html.indexOf('id="content"')).toBeGreaterThan(
    html.indexOf("Qui a fait quoi")
  )
})
