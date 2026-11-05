import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { TicketArchiveFilterForm } from "./ticket-archive-filter-form"
import { NO_FILTERS, type TicketArchiveFilters } from "./ticket-archive-filters"

function render(filters: Partial<TicketArchiveFilters>) {
  return renderToStaticMarkup(
    <TicketArchiveFilterForm filters={{ ...NO_FILTERS, ...filters }} />
  )
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function inputs(html: string) {
  return Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
    type: attribute(input, "type"),
    name: attribute(input, "name"),
    value: attribute(input, "value"),
    placeholder: attribute(input, "placeholder"),
  }))
}

function labels(html: string) {
  return Array.from(
    html.matchAll(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/g),
    ([, htmlFor, text]) => ({ htmlFor, text })
  )
}

function selects(html: string) {
  return Array.from(
    html.matchAll(/<select([^>]*)>(.*?)<\/select>/g),
    ([, attributes = "", options = ""]) => ({
      name: attribute(attributes, "name"),
      options: Array.from(
        options.matchAll(/<option([^>]*)>([^<]*)<\/option>/g),
        ([, optionAttributes = "", label]) => ({
          value: attribute(optionAttributes, "value"),
          selected: optionAttributes.includes("selected"),
          label,
        })
      ),
    })
  )
}

test("the form sends its seven filters to /support-tickets by GET, each under a label, holding what was searched", () => {
  const html = render({
    opener: "bryn",
    closer: "<@1400000000000000003>",
    reason: "launcher",
    from: "2026-10-05",
    to: "2026-10-31",
  })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""

  expect(attribute(form, "action")).toBe("/support-tickets")
  expect(attribute(form, "method")).toBeUndefined()
  expect(inputs(html)).toEqual([
    {
      type: "text",
      name: "opener",
      value: "bryn",
      placeholder: "Nom, ID ou mention",
    },
    {
      type: "text",
      name: "closer",
      value: "&lt;@1400000000000000003&gt;",
      placeholder: "Nom, ID ou mention",
    },
    {
      type: "text",
      name: "reason",
      value: "launcher",
      placeholder: "Mots du motif",
    },
    { type: "date", name: "from", value: "2026-10-05", placeholder: undefined },
    { type: "date", name: "to", value: "2026-10-31", placeholder: undefined },
  ])
  expect(selects(html).map(({ name }) => name)).toEqual(["on", "sort"])
  expect(labels(html).map(({ text }) => text)).toEqual([
    "Ouvreur",
    "Fermeur",
    "Motif",
    "Du",
    "Au",
    "Période sur",
    "Ordre",
  ])
})

test("each label points to the control it names", () => {
  const html = render({})
  const ids = Array.from(
    html.matchAll(/<(?:input|select)[^>]*\sid="([^"]*)"/g),
    ([, id]) => id
  )

  expect(labels(html).map(({ htmlFor }) => htmlFor)).toEqual(ids)
  expect(new Set(ids).size).toBe(7)
})

test("with nothing searched, the fields are empty, the choices stand on closing and the newest, and the form asks for no browser validation", () => {
  const html = render({})

  expect(inputs(html).map(({ value }) => value)).toEqual(["", "", "", "", ""])
  expect(selects(html)).toEqual([
    {
      name: "on",
      options: [
        { value: "", selected: true, label: "La fermeture" },
        { value: "opened", selected: false, label: "L’ouverture" },
      ],
    },
    {
      name: "sort",
      options: [
        { value: "", selected: true, label: "Plus récentes d’abord" },
        { value: "oldest", selected: false, label: "Plus anciennes d’abord" },
      ],
    },
  ])
  expect(html).not.toMatch(/\s(required|maxlength|pattern)=/i)
})

test("the choices stand on what the address holds", () => {
  const [on, sort] = selects(render({ on: "opened", sort: "oldest" }))

  expect(on?.options.find(({ selected }) => selected)?.value).toBe("opened")
  expect(sort?.options.find(({ selected }) => selected)?.value).toBe("oldest")
})

test("the kind chosen is kept in a hidden field, and none is sent without one", () => {
  expect(render({ kind: "rp-request" })).toContain(
    '<input type="hidden" name="kind" value="rp-request"/>'
  )
  expect(render({})).not.toContain('name="kind"')
})

test("the form sends with « Filtrer »", () => {
  expect(render({})).toMatch(
    /<button[^>]*type="submit"[^>]*>.*Filtrer<\/button>/
  )
})
