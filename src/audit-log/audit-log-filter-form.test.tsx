import { ListFilter, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogFilterForm } from "./audit-log-filter-form"
import { NO_FILTER, type AuditLogFilters } from "./audit-log-filters"

function render(filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogFilterForm filters={{ ...NO_FILTER, ...filters }} />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
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

test("the form sends its author, its account, its text and its period to /audit-log, by GET, each under its own label, holding what was searched", () => {
  const html = render({
    author: "bryn",
    account: "<@1400000000000000003>",
    text: "spam",
    from: "2026-10-05",
    to: "2026-10-31",
  })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const inputs = fields(html)

  expect(attribute(form, "action")).toBe("/audit-log")
  expect(attribute(form, "method")).toBeUndefined()
  expect(inputs.map(({ name, value }) => ({ name, value }))).toEqual([
    { name: "author", value: "bryn" },
    { name: "account", value: "&lt;@1400000000000000003&gt;" },
    { name: "text", value: "spam" },
    { name: "from", value: "2026-10-05" },
    { name: "to", value: "2026-10-31" },
  ])
  expect(labels(html)).toEqual(
    ["Auteur", "Compte", "Texte", "Du", "Au"].map((text, index) => ({
      htmlFor: inputs[index]?.id,
      text,
    }))
  )
})

test("with nothing searched, the fields are empty, and they ask for no browser validation", () => {
  const html = render({})

  expect(fields(html).map(({ value }) => value)).toEqual(Array(5).fill(""))
  expect(html).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the type chosen goes with the form in a hidden field, and no type, in none", () => {
  expect(fields(render({ type: "kicks" }))[0]).toEqual({
    type: "hidden",
    name: "type",
    value: "kicks",
    id: undefined,
  })
  expect(fields(render({ type: "kicks" }))).toHaveLength(6)
  expect(fields(render({})).map(({ type }) => type)).not.toContain("hidden")
})

test("the form carries no page cursor, so that sending it leads back to the newest changes", () => {
  expect(
    fields(render({ type: "bans", author: "bryn", account: "lyra" })).map(
      ({ name }) => name
    )
  ).toEqual(["type", "author", "account", "text", "from", "to"])
})

test("the fields suggest what they take, a name, an ID or a mention, a word or a motif, and the days are date fields", () => {
  const inputs = Array.from(
    render({}).matchAll(/<input[^>]*>/g),
    ([input = ""]) => ({
      type: attribute(input, "type"),
      placeholder: attribute(input, "placeholder"),
    })
  )

  expect(inputs).toEqual([
    { type: "text", placeholder: "Nom, ID ou mention" },
    { type: "text", placeholder: "Nom, ID ou mention" },
    { type: "text", placeholder: "Mot ou motif" },
    { type: "date", placeholder: undefined },
    { type: "date", placeholder: undefined },
  ])
})

test("the form's button reads « Filtrer », after a hidden filter icon", () => {
  const [, iconAttributes = "", iconDrawing, text] =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      render({})
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
  }).toEqual({ icon: drawing(ListFilter), iconHidden: true, text: "Filtrer" })
})
