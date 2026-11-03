import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Sheet } from "@/ui/sheet"
import { AccountFilterSheetForm } from "./account-filter-sheet-form"
import type { AccountListFilters } from "./account-list-filters"

const NO_FILTERS: AccountListFilters = {
  query: null,
  role: null,
  standing: null,
  joined: null,
  created: null,
  bots: null,
  sort: null,
}

const ROLES = [{ id: "1300000000000000001", name: "Garde de Blancherive" }]

function render(filters: AccountListFilters = NO_FILTERS) {
  return renderToStaticMarkup(
    <Sheet>
      <AccountFilterSheetForm filters={filters} roles={ROLES} />
    </Sheet>
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function controls(html: string) {
  return Array.from(
    html.matchAll(/<(input|select)([^>]*)>/g),
    ([, tag, attributes = ""]) => ({
      tag,
      type: attribute(attributes, "type"),
      name: attribute(attributes, "name"),
      id: attribute(attributes, "id"),
      value: attribute(attributes, "value"),
    })
  )
}

test("the sheet sends to /records by GET the search text first, then the six choices, each name once", () => {
  const html = render({ ...NO_FILTERS, query: "ald" })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""

  expect(attribute(form, "action")).toBe("/records")
  expect(attribute(form, "method")).toBeUndefined()
  expect(controls(html).map(({ name }) => name)).toEqual([
    "query",
    "role",
    "standing",
    "joined",
    "created",
    "bots",
    "sort",
  ])
  expect(controls(html)[0]).toMatchObject({
    tag: "input",
    type: "hidden",
    value: "ald",
  })
})

test("with nothing searched the sheet still sends an empty search text, as the form of the page does, so that both give the same address", () => {
  expect(controls(render())[0]).toMatchObject({
    type: "hidden",
    name: "query",
    value: "",
  })
})

test("each choice of the sheet is a select under a visible label, with an id of its own, apart from the form of the page", () => {
  const html = render()

  for (const { id } of controls(html).filter(({ tag }) => tag === "select")) {
    expect(id).toMatch(/^account-sheet-/)
    expect(html.includes(` for="${id}"`)).toBe(true)
  }
  expect(
    Array.from(html.matchAll(/<label[^>]*>([^<]*)<\/label>/g), ([, t]) => t)
  ).toEqual([
    "Rôle",
    "État",
    "Arrivée sur le serveur",
    "Âge du compte Discord",
    "Comptes de bot",
    "Trier par",
  ])
})

test("each choice opens on the value of the URL", () => {
  const html = render({
    ...NO_FILTERS,
    role: "1300000000000000001",
    standing: "banned",
    sort: "joined-old",
  })
  const selected = Array.from(
    html.matchAll(/<select[^>]*\sname="([^"]*)"[^>]*>(.*?)<\/select>/g),
    ([, name, options = ""]) => [
      name,
      /<option[^>]*\svalue="([^"]*)"[^>]*\sselected/.exec(options)?.[1] ??
        /<option[^>]*\sselected[^>]*\svalue="([^"]*)"/.exec(options)?.[1],
    ]
  )

  expect(selected).toEqual([
    ["role", "1300000000000000001"],
    ["standing", "banned"],
    ["joined", ""],
    ["created", ""],
    ["bots", ""],
    ["sort", "joined-old"],
  ])
})

test("the sheet ends on « Réinitialiser », which leads to the list with the search alone, then on « Appliquer »", () => {
  const html = render({
    ...NO_FILTERS,
    query: "ald",
    standing: "banned",
    sort: "role",
  })
  const reset = /<a([^>]*)>([^<]*)<\/a>/.exec(html)

  expect(attribute(reset?.[1] ?? "", "href")).toBe("/records?query=ald")
  expect(reset?.[2]).toBe("Réinitialiser")
  expect(html.match(/type="submit"/g)).toHaveLength(1)
  expect(/type="submit"[^>]*>.*Appliquer<\/button>/.test(html)).toBe(true)
})
