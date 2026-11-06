import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { GameLogFilterForm } from "./game-log-filter-form"
import { NO_FILTERS, type GameLogFilters } from "./game-log-filters"

function render(filters: Partial<GameLogFilters>) {
  return renderToStaticMarkup(
    <GameLogFilterForm filters={{ ...NO_FILTERS, ...filters }} />
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function fields(html: string) {
  return Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
    type: attribute(input, "type"),
    name: attribute(input, "name"),
    value: attribute(input, "value"),
    id: attribute(input, "id"),
  }))
}

function labels(html: string) {
  return Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )
}

test("the form sends its text and its period to /game-log, by GET, each under its own label, holding what was searched", () => {
  const html = render({ text: "heal", from: "2026-10-05", to: "2026-10-31" })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const inputs = fields(html)

  expect(attribute(form, "action")).toBe("/game-log")
  expect(attribute(form, "method")).toBeUndefined()
  expect(
    inputs.map(({ type, name, value }) => ({ type, name, value }))
  ).toEqual([
    { type: "text", name: "text", value: "heal" },
    { type: "date", name: "from", value: "2026-10-05" },
    { type: "date", name: "to", value: "2026-10-31" },
  ])
  expect(labels(html)).toEqual(
    ["Texte", "Du", "Au"].map((text, index) => ({
      htmlFor: inputs[index]?.id,
      text,
    }))
  )
})

test("with nothing searched, the fields are empty, and they ask for no browser validation", () => {
  const html = render({})

  expect(fields(html).map(({ value }) => value)).toEqual(["", "", ""])
  expect(html).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the form carries no page cursor, no hidden field and a button, so that sending it leads back to the newest lines", () => {
  const html = render({ text: "heal" })

  expect(fields(html).map(({ type }) => type)).not.toContain("hidden")
  expect(html).toMatch(/<button[^>]*type="submit"[^>]*>.*Filtrer<\/button>/)
})
