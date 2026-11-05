import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FilterFormSkeleton } from "@/ui/filter-form-skeleton"

function bars(html: string) {
  return html.match(/data-slot="skeleton"/g)?.length ?? 0
}

test("the skeleton draws a bar for each label and each field, one for the button, and one for the button that folds them", () => {
  const html = renderToStaticMarkup(
    <FilterFormSkeleton
      labelWidths={["w-12", "w-14", "w-16"]}
      fieldClassName="basis-44"
    />
  )

  expect(bars(html)).toBe(3 * 2 + 1 + 1)
})

test("the skeleton holds nothing to type in, nothing to press and no link", () => {
  const html = renderToStaticMarkup(
    <FilterFormSkeleton labelWidths={["w-12"]} fieldClassName="basis-44" />
  )

  expect(html).not.toMatch(/<(form|input|button|label|a)[\s>]/)
  expect(html).not.toContain("role=")
})
