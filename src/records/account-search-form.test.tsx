import { Search, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AccountSearchForm } from "./account-search-form"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

test("the search sends its one field, query, to /records, under the label « Compte », holding what was searched", () => {
  const html = renderToStaticMarkup(<AccountSearchForm query="ald" />)
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const field = /<input[^>]*>/.exec(html)?.[0] ?? ""
  const [, labelFor, label] =
    /<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/.exec(html) ?? []

  expect(attribute(form, "action")).toBe("/records")
  expect(attribute(form, "method")).toBeUndefined()
  expect(attribute(field, "name")).toBe("query")
  expect(attribute(field, "value")).toBe("ald")
  expect(label).toBe("Compte")
  expect(attribute(field, "id")).toBe(labelFor)
  expect(field).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the search's button reads « Chercher », after a hidden search icon", () => {
  const html = renderToStaticMarkup(<AccountSearchForm query="" />)
  const [, iconAttributes = "", iconDrawing, text] =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      html
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
  }).toEqual({ icon: drawing(Search), iconHidden: true, text: "Chercher" })
})
