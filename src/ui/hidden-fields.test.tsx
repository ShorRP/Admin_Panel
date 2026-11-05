import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { HiddenFields } from "@/ui/hidden-fields"

test("each hidden field is an input of its own, of type hidden, under its name and holding its value", () => {
  expect(
    renderToStaticMarkup(
      <HiddenFields
        fields={[
          { name: "kind", value: "kicks" },
          { name: "page", value: "2" },
        ]}
      />
    )
  ).toBe(
    '<input type="hidden" name="kind" value="kicks"/><input type="hidden" name="page" value="2"/>'
  )
})

test("no field renders nothing", () => {
  expect(renderToStaticMarkup(<HiddenFields fields={[]} />)).toBe("")
})
