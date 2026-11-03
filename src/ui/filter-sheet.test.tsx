import { ListFilter, SlidersHorizontal, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import {
  FilterSheet,
  FilterSheetForm,
  FilterSheetTrigger,
} from "@/ui/filter-sheet"
import { Sheet } from "@/ui/sheet"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

const PROPS = {
  label: "Auteur et compte",
  action: "/audit-log",
  hiddenFields: [{ name: "type", value: "kicks" }],
  resetHref: "/audit-log",
  submitLabel: "Filtrer",
}

function renderTrigger(activeCount: number) {
  return renderToStaticMarkup(
    <FilterSheet {...PROPS} activeCount={activeCount}>
      <input name="author" />
    </FilterSheet>
  )
}

function renderForm() {
  return renderToStaticMarkup(
    <Sheet>
      <FilterSheetForm {...PROPS}>
        <label htmlFor="sheet-author">Auteur</label>
        <input id="sheet-author" name="author" defaultValue="bryn" />
        <label htmlFor="sheet-account">Compte</label>
        <input id="sheet-account" name="account" defaultValue="" />
      </FilterSheetForm>
    </Sheet>
  )
}

test("the sheet is closed until its button is pressed: only the button shows, which names the dialog it opens", () => {
  const html = renderTrigger(0)
  const button = /<button[^>]*>/.exec(html)?.[0] ?? ""

  expect(html).not.toContain("<form")
  expect(html).not.toContain("<input")
  expect(attribute(button, "aria-haspopup")).toBe("dialog")
  expect(attribute(button, "aria-expanded")).toBe("false")
  expect(attribute(button, "type")).toBe("button")
})

test("the button reads its label after a hidden filter icon, and with no filter set it counts none", () => {
  const html = renderTrigger(0)

  expect(html).toMatch(/^<button[^>]*><svg[^>]*\saria-hidden="true"/)
  expect(html).toContain(drawing(SlidersHorizontal))
  expect(html.replace(/<[^>]*>/g, "")).toBe("Auteur et compte")
})

test.each([
  [1, "1 filtre actif"],
  [2, "2 filtres actifs"],
])(
  "with %i filter(s) set, the button shows the number, hidden from assistive technologies, and says it in words for them",
  (count, words) => {
    const html = renderTrigger(count)

    expect(html).toContain(`<span aria-hidden="true"`)
    expect(
      Array.from(
        html.matchAll(/<span([^>]*)>([^<]*)<\/span>/g),
        ([, a, t]) => ({
          hidden: attribute(a ?? "", "aria-hidden") === "true",
          srOnly: /sr-only/.test(attribute(a ?? "", "class") ?? ""),
          text: t,
        })
      )
    ).toEqual([
      { hidden: true, srOnly: false, text: String(count) },
      { hidden: false, srOnly: true, text: words },
    ])
  }
)

test("the sheet's form sends to the page by GET, with its hidden fields before its own, and carries no submit but its own", () => {
  const html = renderForm()
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const inputs = Array.from(html.matchAll(/<input[^>]*>/g), ([input = ""]) => ({
    type: attribute(input, "type"),
    name: attribute(input, "name"),
    value: attribute(input, "value"),
  }))

  expect(attribute(form, "action")).toBe("/audit-log")
  expect(attribute(form, "method")).toBeUndefined()
  expect(inputs.map(({ name }) => name)).toEqual(["type", "author", "account"])
  expect(inputs[0]).toEqual({ type: "hidden", name: "type", value: "kicks" })
  expect(html.match(/type="submit"/g)).toHaveLength(1)
})

test("with no hidden field, the sheet's form sends nothing but what is typed in it", () => {
  const html = renderToStaticMarkup(
    <Sheet>
      <FilterSheetForm {...PROPS} hiddenFields={[]}>
        <input name="author" />
      </FilterSheetForm>
    </Sheet>
  )

  expect(html.match(/<input[^>]*>/g)).toHaveLength(1)
})

test("the sheet ends on « Réinitialiser », a link to the address it is given, then on its submit, whose label and filter icon it is given", () => {
  const html = renderForm()
  const reset = /<a([^>]*)>([^<]*)<\/a>/.exec(html)
  const submit =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      html
    )

  expect(attribute(reset?.[1] ?? "", "href")).toBe("/audit-log")
  expect(reset?.[2]).toBe("Réinitialiser")
  expect(html.indexOf(reset?.[0] ?? "")).toBeLessThan(
    html.indexOf(submit?.[0] ?? "")
  )
  expect(submit?.[2]).toBe(drawing(ListFilter))
  expect(attribute(submit?.[1] ?? "", "aria-hidden")).toBe("true")
  expect(submit?.[3]).toBe("Filtrer")
})

test("the reset link says it is a link, so that what closes the sheet does not make it a button", () => {
  const reset = /<a([^>]*)>Réinitialiser<\/a>/.exec(renderForm())?.[1] ?? ""

  expect(attribute(reset, "role")).toBe("link")
})

test("the trigger stands apart from the sheet's content, so that it can sit in a form of its own: it names the dialog and counts the same", () => {
  const html = renderToStaticMarkup(
    <Sheet>
      <FilterSheetTrigger label="Filtres" activeCount={2} />
    </Sheet>
  )
  const button = /<button[^>]*>/.exec(html)?.[0] ?? ""

  expect(attribute(button, "aria-haspopup")).toBe("dialog")
  expect(attribute(button, "type")).toBe("button")
  expect(html.replace(/<[^>]*>/g, "")).toBe("Filtres22 filtres actifs")
})
