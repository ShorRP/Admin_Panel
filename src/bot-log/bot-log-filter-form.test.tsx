import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BotLogFilterForm } from "./bot-log-filter-form"
import { NO_FILTERS, type BotLogFilters } from "./bot-log-filters"

function render(filters: Partial<BotLogFilters>) {
  return renderToStaticMarkup(
    <BotLogFilterForm filters={{ ...NO_FILTERS, ...filters }} />
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

test("the form sends its six fields to /bot-log, by GET, each under its own label, holding what was searched", () => {
  const html = render({
    action: "Ticket fermé",
    account: "lyra",
    channel: "ticket-0042",
    text: "résolu",
    from: "2026-10-05",
    to: "2026-10-31",
  })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const inputs = fields(html)

  expect(attribute(form, "action")).toBe("/bot-log")
  expect(attribute(form, "method")).toBeUndefined()
  expect(
    inputs.map(({ type, name, value }) => ({ type, name, value }))
  ).toEqual([
    { type: "text", name: "action", value: "Ticket fermé" },
    { type: "text", name: "account", value: "lyra" },
    { type: "text", name: "channel", value: "ticket-0042" },
    { type: "text", name: "text", value: "résolu" },
    { type: "date", name: "from", value: "2026-10-05" },
    { type: "date", name: "to", value: "2026-10-31" },
  ])
  expect(labels(html)).toEqual(
    ["Action", "Compte", "Salon", "Texte", "Du", "Au"].map((text, index) => ({
      htmlFor: inputs[index]?.id,
      text,
    }))
  )
})

test("the account and the channel take a name, an ID or a mention", () => {
  const html = render({})

  expect(html.match(/placeholder="Nom, ID ou mention"/g)).toHaveLength(2)
})

test("with nothing searched, the fields are empty, and they ask for no browser validation", () => {
  const html = render({})

  expect(fields(html).map(({ value }) => value)).toEqual([
    "",
    "",
    "",
    "",
    "",
    "",
  ])
  expect(html).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the form keeps the family in a hidden field and carries no cursor, so that sending it leads back to the newest lines", () => {
  const chosen = fields(render({ family: "tickets" }))
  const none = fields(render({}))

  expect(chosen.filter(({ type }) => type === "hidden")).toEqual([
    expect.objectContaining({ name: "family", value: "tickets" }),
  ])
  expect(none.map(({ type }) => type)).not.toContain("hidden")
  expect(chosen.map(({ name }) => name)).not.toContain("before")
  expect(render({})).toMatch(
    /<button[^>]*type="submit"[^>]*>.*Filtrer<\/button>/
  )
})
