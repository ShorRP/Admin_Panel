import { ListFilter, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogFilterForm } from "./audit-log-filter-form"
import type { AuditLogFilters } from "./audit-log-filters"

const NO_FILTER: AuditLogFilters = { type: null, author: null, account: null }

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

test("the form sends its author and its account to /audit-log, by GET, each under its own label, holding what was searched", () => {
  const html = render({ author: "bryn", account: "<@1400000000000000003>" })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const [author, account] = fields(html)

  expect(attribute(form, "action")).toBe("/audit-log")
  expect(attribute(form, "method")).toBeUndefined()
  expect(fields(html)).toHaveLength(2)
  expect(author).toMatchObject({ name: "author", value: "bryn" })
  expect(account).toMatchObject({
    name: "account",
    value: "&lt;@1400000000000000003&gt;",
  })
  expect(labels(html)).toEqual([
    { htmlFor: author?.id, text: "Auteur" },
    { htmlFor: account?.id, text: "Compte" },
  ])
})

test("with nothing searched, the fields are empty, and they ask for no browser validation", () => {
  const html = render({})

  expect(fields(html).map(({ value }) => value)).toEqual(["", ""])
  expect(html).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the type chosen goes with the form in a hidden field, and no type, in none", () => {
  expect(fields(render({ type: "kicks" }))[0]).toEqual({
    type: "hidden",
    name: "type",
    value: "kicks",
    id: undefined,
  })
  expect(fields(render({ type: "kicks" }))).toHaveLength(3)
  expect(fields(render({})).map(({ type }) => type)).not.toContain("hidden")
})

test("the form carries no page cursor, so that sending it leads back to the newest changes", () => {
  expect(
    fields(render({ type: "bans", author: "bryn", account: "lyra" })).map(
      ({ name }) => name
    )
  ).toEqual(["type", "author", "account"])
})

test("the fields suggest what they take, a name, an ID or a mention", () => {
  const placeholders = Array.from(
    render({}).matchAll(/<input[^>]*>/g),
    ([input = ""]) => attribute(input, "placeholder")
  )

  expect(placeholders).toEqual(["Nom, ID ou mention", "Nom, ID ou mention"])
})

test("the form's button reads « Filtrer », after a hidden filter icon", () => {
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
