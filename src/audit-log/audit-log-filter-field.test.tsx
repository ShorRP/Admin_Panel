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
    value: attribute(input, "value"),
    id: attribute(input, "id"),
  }))
}

test("the fields are the author and the account, under their labels, holding what was searched", () => {
  const html = render("sheet", { author: "bryn", account: "lyra" })
  const fields = inputs(html)
  const labels = Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )

  expect(fields.map(({ name, value }) => ({ name, value }))).toEqual([
    { name: "author", value: "bryn" },
    { name: "account", value: "lyra" },
  ])
  expect(labels).toEqual([
    { htmlFor: fields[0]?.id, text: "Auteur" },
    { htmlFor: fields[1]?.id, text: "Compte" },
  ])
})

test("each id starts with the prefix it is given, so that the page's form and its sheet share none", () => {
  expect(inputs(render("audit-log", {})).map(({ id }) => id)).toEqual([
    "audit-log-author",
    "audit-log-account",
  ])
  expect(inputs(render("audit-log-sheet", {})).map(({ id }) => id)).toEqual([
    "audit-log-sheet-author",
    "audit-log-sheet-account",
  ])
})

test("with nothing searched, the fields are empty", () => {
  expect(inputs(render("sheet", {})).map(({ value }) => value)).toEqual([
    "",
    "",
  ])
})
