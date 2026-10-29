import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OrnamentRule } from "@/ui/ornament-rule"

function rule(html: string) {
  return {
    hidden: /^<div[^>]*\saria-hidden="true"/.test(html),
    marks: Array.from(html.matchAll(/<span[^>]*><\/span>/g)).length,
    text: html.replace(/<[^>]*>/g, ""),
  }
}

test("the rule with a diamond is hidden from assistive technologies and holds no text, with a line before its diamond only when asked", () => {
  expect(rule(renderToStaticMarkup(<OrnamentRule />))).toEqual({
    hidden: true,
    marks: 2,
    text: "",
  })
  expect(rule(renderToStaticMarkup(<OrnamentRule leadingLine />))).toEqual({
    hidden: true,
    marks: 3,
    text: "",
  })
})
