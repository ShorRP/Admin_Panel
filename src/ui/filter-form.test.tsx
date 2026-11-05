import { ListFilter, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FilterForm } from "@/ui/filter-form"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function render(hiddenFields: { name: string; value: string }[]) {
  return renderToStaticMarkup(
    <FilterForm
      action="/events"
      hiddenFields={hiddenFields}
      submitLabel="Filtrer"
    >
      <label htmlFor="who">Qui</label>
      <input id="who" name="who" defaultValue="lyra" />
    </FilterForm>
  )
}

test("the form sends to the address it is given, by GET", () => {
  const form = /<form[^>]*>/.exec(render([]))?.[0] ?? ""

  expect(attribute(form, "action")).toBe("/events")
  expect(attribute(form, "method")).toBeUndefined()
})

test("the form hides itself under md, where the fold takes its place, and wraps its fields from md", () => {
  const form = /<form[^>]*>/.exec(render([]))?.[0] ?? ""
  const classes = attribute(form, "class")?.split(" ")

  expect(classes).toContain("hidden")
  expect(classes).toContain("md:flex")
})

test("the hidden fields come first, then the fields it is given, then the button", () => {
  const html = render([{ name: "kind", value: "kicks" }])

  expect(
    Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
      type: attribute(input, "type"),
      name: attribute(input, "name"),
    }))
  ).toEqual([
    { type: "hidden", name: "kind" },
    { type: undefined, name: "who" },
  ])
  expect(html.indexOf("<button")).toBeGreaterThan(html.indexOf('name="who"'))
})

test("no hidden field adds no hidden input", () => {
  expect(render([])).not.toContain('type="hidden"')
})

test("the button reads the label it is given, after a hidden filter icon, and submits", () => {
  const [, iconAttributes = "", iconDrawing, text] =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      render([])
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
  }).toEqual({ icon: drawing(ListFilter), iconHidden: true, text: "Filtrer" })
})
