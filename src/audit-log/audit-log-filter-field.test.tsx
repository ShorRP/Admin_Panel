import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogFilterFields } from "./audit-log-filter-field"
import { NO_FILTER, type AuditLogFilters } from "./audit-log-filters"

function render(idPrefix: string, filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogFilterFields
      filters={{ ...NO_FILTER, ...filters }}
      idPrefix={idPrefix}
      className="field"
    />
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function inputs(html: string) {
  return Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
    name: attribute(input, "name"),
    type: attribute(input, "type"),
    value: attribute(input, "value"),
    id: attribute(input, "id"),
  }))
}

test("the fields are the author, the account, the text and the two days of the period, under their labels, holding what was searched", () => {
  const html = render("sheet", {
    author: "bryn",
    account: "lyra",
    text: "spam",
    from: "2026-10-05",
    to: "2026-10-31",
  })
  const fields = inputs(html)
  const labels = Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )

  expect(
    fields.map(({ name, type, value }) => ({ name, type, value }))
  ).toEqual([
    { name: "author", type: "text", value: "bryn" },
    { name: "account", type: "text", value: "lyra" },
    { name: "text", type: "text", value: "spam" },
    { name: "from", type: "date", value: "2026-10-05" },
    { name: "to", type: "date", value: "2026-10-31" },
  ])
  expect(labels).toEqual(
    ["Auteur", "Compte", "Texte", "Du", "Au"].map((text, index) => ({
      htmlFor: fields[index]?.id,
      text,
    }))
  )
})

test("each id starts with the prefix it is given, so that the page's form and its sheet share none", () => {
  expect(inputs(render("audit-log", {})).map(({ id }) => id)).toEqual([
    "audit-log-author",
    "audit-log-account",
    "audit-log-text",
    "audit-log-from",
    "audit-log-to",
  ])
  expect(inputs(render("audit-log-sheet", {})).map(({ id }) => id)).toEqual([
    "audit-log-sheet-author",
    "audit-log-sheet-account",
    "audit-log-sheet-text",
    "audit-log-sheet-from",
    "audit-log-sheet-to",
  ])
})

test("with nothing searched, the fields are empty", () => {
  expect(inputs(render("sheet", {})).map(({ value }) => value)).toEqual(
    Array(5).fill("")
  )
})

test("the type is no field of the form, since its pills carry it", () => {
  expect(
    inputs(render("sheet", { type: "kicks" })).map(({ name }) => name)
  ).not.toContain("type")
})
