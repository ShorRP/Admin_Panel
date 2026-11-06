import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import {
  filterChipsOf,
  FilterFields,
  formatDay,
  PERIOD_FIELDS,
  searchTextField,
  type FilterFieldSpec,
} from "@/ui/filter-fields"

type Name = "who" | "text" | "from" | "to"

const FIELDS: readonly FilterFieldSpec<Name>[] = [
  { name: "who", label: "Qui", type: "text", placeholder: "Nom ou ID" },
  searchTextField("Mot ou motif"),
  ...PERIOD_FIELDS,
]

const NOTHING: Record<Name, string | null> = {
  who: null,
  text: null,
  from: null,
  to: null,
}

function render(values: Partial<Record<Name, string>>, idPrefix = "log") {
  return renderToStaticMarkup(
    <FilterFields
      fields={FIELDS}
      values={{ ...NOTHING, ...values }}
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
    placeholder: attribute(input, "placeholder"),
  }))
}

test("the period is two fields, « Du » and « Au », named from and to, and the text one field named text", () => {
  expect(PERIOD_FIELDS).toEqual([
    { name: "from", label: "Du", type: "day" },
    { name: "to", label: "Au", type: "day" },
  ])
  expect(searchTextField("Mot ou motif")).toEqual({
    name: "text",
    label: "Texte",
    type: "text",
    placeholder: "Mot ou motif",
  })
})

test("each field is an input under its label, a day a date input, holding what was searched", () => {
  const html = render({ who: "bryn", text: "spam", from: "2026-10-05" })
  const fields = inputs(html)
  const labels = Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )

  expect(
    fields.map(({ name, type, value, placeholder }) => ({
      name,
      type,
      value,
      placeholder,
    }))
  ).toEqual([
    { name: "who", type: "text", value: "bryn", placeholder: "Nom ou ID" },
    { name: "text", type: "text", value: "spam", placeholder: "Mot ou motif" },
    { name: "from", type: "date", value: "2026-10-05", placeholder: undefined },
    { name: "to", type: "date", value: "", placeholder: undefined },
  ])
  expect(labels).toEqual(
    fields.map(({ id }, index) => ({
      htmlFor: id,
      text: ["Qui", "Texte", "Du", "Au"][index],
    }))
  )
})

test("each id starts with the prefix it is given, so that a page's form and its sheet share none", () => {
  expect(inputs(render({}, "log")).map(({ id }) => id)).toEqual([
    "log-who",
    "log-text",
    "log-from",
    "log-to",
  ])
  expect(inputs(render({}, "log-sheet")).map(({ id }) => id)).toEqual([
    "log-sheet-who",
    "log-sheet-text",
    "log-sheet-from",
    "log-sheet-to",
  ])
})

test("with nothing searched, the fields are empty", () => {
  expect(inputs(render({})).map(({ value }) => value)).toEqual(["", "", "", ""])
})

test("a day shows in the French way, in the day it is, whatever the time zone", () => {
  expect(formatDay("2026-11-03")).toBe("3 nov. 2026")
  expect(formatDay("2026-01-01")).toBe("1 janv. 2026")
})

test("a chip names its field and shows what was searched, a day written out, and leads to the address without that filter", () => {
  const chips = filterChipsOf(
    FIELDS,
    { who: "bryn", text: null, from: "2026-11-03", to: "2026-12-25" },
    (name) => `/log?without=${name}`
  )

  expect(chips).toEqual([
    { name: "Qui", value: "bryn", href: "/log?without=who" },
    { name: "Du", value: "3 nov. 2026", href: "/log?without=from" },
    { name: "Au", value: "25 déc. 2026", href: "/log?without=to" },
  ])
})

test("with nothing searched, there is no chip", () => {
  expect(filterChipsOf(FIELDS, NOTHING, () => "/log")).toEqual([])
})
