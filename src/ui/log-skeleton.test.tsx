import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogSkeleton } from "@/ui/log-skeleton"

function render() {
  return renderToStaticMarkup(
    <LogSkeleton
      loading="Chargement des événements…"
      pillWidths={["w-13", "w-29", "w-24"]}
      form={<div id="form-skeleton" />}
    />
  )
}

test("the skeleton is a status that says, to assistive technologies alone, what is loading", () => {
  const html = render()

  expect(/^<\w+ role="status"/.test(html)).toBe(true)
  expect(/<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1]).toBe(
    "Chargement des événements…"
  )
  expect(html.replace(/<[^>]*>/g, "")).toBe("Chargement des événements…")
})

test("the skeleton draws a pill for each width it is given, then the form skeleton it is given", () => {
  const html = render()

  expect(html.match(/h-7\.5 rounded-full/g)).toHaveLength(3)
  expect(html.indexOf('id="form-skeleton"')).toBeGreaterThan(
    html.lastIndexOf("h-7.5 rounded-full")
  )
})

test("the skeleton draws two days of rows, with nothing to type in, press or follow", () => {
  const html = render()

  expect(html).not.toMatch(/<(h2|form|input|button|label|a)[\s>]/)
  expect(html.match(/h-5\.5/g)).toHaveLength(2)
  expect(html.match(/size-6 shrink-0 rounded-full/g)).toHaveLength(5)
})
