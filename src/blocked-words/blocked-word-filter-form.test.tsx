import { ListFilter, Search, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordFilterForm } from "./blocked-word-filter-form"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

test("the filter sends its one field, query, to /blocked-words, named « Filtrer la liste » for assistive technologies alone, holding the text searched", () => {
  const html = renderToStaticMarkup(<BlockedWordFilterForm query="nitro" />)
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const field = /<input[^>]*>/.exec(html)?.[0] ?? ""
  const [, labelAttributes = "", label] =
    /<label([^>]*)>([^<]*)<\/label>/.exec(html) ?? []

  expect(attribute(form, "action")).toBe("/blocked-words")
  expect(attribute(form, "method")).toBeUndefined()
  expect(attribute(field, "name")).toBe("query")
  expect(attribute(field, "value")).toBe("nitro")
  expect(attribute(field, "placeholder")).toBe("Filtrer la liste")
  expect(label).toBe("Filtrer la liste")
  expect(attribute(labelAttributes, "class")?.split(" ")).toContain("sr-only")
  expect(attribute(field, "id")).toBe(attribute(labelAttributes, "for"))
  expect(field).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("without a filter, the field is empty", () => {
  const html = renderToStaticMarkup(<BlockedWordFilterForm query={null} />)
  const field = /<input[^>]*>/.exec(html)?.[0] ?? ""

  expect(attribute(field, "value")).toBe("")
})

test("the filter's field sits beside a search icon hidden from assistive technologies", () => {
  const html = renderToStaticMarkup(<BlockedWordFilterForm query={null} />)
  const [, iconAttributes = "", iconDrawing] =
    /<svg([^>]*)>(.*?)<\/svg><input/.exec(html) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
  }).toEqual({ icon: drawing(Search), iconHidden: true })
})

test("the filter's button reads « Filtrer », after a hidden list filter icon", () => {
  const html = renderToStaticMarkup(<BlockedWordFilterForm query={null} />)
  const [, iconAttributes = "", iconDrawing, text] =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      html
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
  }).toEqual({
    icon: drawing(ListFilter),
    iconHidden: true,
    text: "Filtrer",
  })
})
