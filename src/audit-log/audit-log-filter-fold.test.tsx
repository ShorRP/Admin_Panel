import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import {
  AuditLogFilterFold,
  AuditLogSheetFields,
} from "./audit-log-filter-fold"
import type { AuditLogFilters } from "./audit-log-filters"

const NO_FILTER: AuditLogFilters = { type: null, author: null, account: null }

function renderFold(filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogFilterFold filters={{ ...NO_FILTER, ...filters }} />
  )
}

function renderFields(filters: Partial<AuditLogFilters>) {
  return renderToStaticMarkup(
    <AuditLogSheetFields filters={{ ...NO_FILTER, ...filters }} />
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function chips(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", content = ""]) => ({
      href: attribute(attributes, "href")?.replaceAll("&amp;", "&"),
      name: content.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]*>/g, ""),
    })
  )
}

test("with no author and no account, the button names them and counts none, and no chip shows", () => {
  const html = renderFold({})

  expect(html).toMatch(/<button[^>]*>.*Auteur et compte<\/button>/)
  expect(html).not.toContain("filtre")
  expect(html).not.toContain("<ul")
})

test.each([
  [{ author: "Sigrid" }, "1 filtre actif"],
  [{ account: "lyra" }, "1 filtre actif"],
  [{ author: "Sigrid", account: "lyra" }, "2 filtres actifs"],
])(
  "with %j set, the button counts the filters of the sheet, in words for assistive technologies",
  (filters, words) => {
    expect(renderFold(filters)).toContain(`>${words}</span>`)
  }
)

test("the type chosen is not counted, since its pills stay in view, and no chip shows for it", () => {
  const html = renderFold({ type: "kicks" })

  expect(html).not.toContain("filtre actif")
  expect(chips(html)).toEqual([])
})

test("each filter set shows as a chip, a link to the audit log without that filter, keeping the type and the other filter", () => {
  expect(
    chips(renderFold({ type: "kicks", author: "Sigrid", account: "lyra" }))
  ).toEqual([
    {
      href: "/audit-log?type=kicks&account=lyra",
      name: "Retirer le filtre Auteur : Sigrid",
    },
    {
      href: "/audit-log?type=kicks&author=Sigrid",
      name: "Retirer le filtre Compte : lyra",
    },
  ])
})

test("the sheet's fields are the author and the account, under their labels, holding what was searched, with ids of their own", () => {
  const html = renderFields({ author: "bryn", account: "lyra" })
  const inputs = Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
    name: attribute(input, "name"),
    value: attribute(input, "value"),
    id: attribute(input, "id"),
  }))
  const labels = Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )

  expect(inputs.map(({ name, value }) => ({ name, value }))).toEqual([
    { name: "author", value: "bryn" },
    { name: "account", value: "lyra" },
  ])
  expect(labels).toEqual([
    { htmlFor: inputs[0]?.id, text: "Auteur" },
    { htmlFor: inputs[1]?.id, text: "Compte" },
  ])
  expect(inputs.map(({ id }) => id)).not.toContain("audit-log-author")
  expect(inputs.map(({ id }) => id)).not.toContain("audit-log-account")
})
