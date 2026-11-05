import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogSkeleton } from "@/ui/log-skeleton"

function render(pillWidths = ["w-13", "w-29", "w-24"]) {
  return renderToStaticMarkup(
    <LogSkeleton
      loading="Chargement des événements…"
      pillWidths={pillWidths}
      form={<div id="form-skeleton" />}
    />
  )
}

function bars(html: string) {
  return html.match(/data-slot="skeleton"/g)?.length ?? 0
}

test("the skeleton is a status that says, to assistive technologies alone, what is loading", () => {
  const html = render()

  expect(/^<\w+ role="status"/.test(html)).toBe(true)
  expect(/<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1]).toBe(
    "Chargement des événements…"
  )
  expect(html.replace(/<[^>]*>/g, "")).toBe("Chargement des événements…")
})

test("the skeleton draws a bar for each pill width it is given, before the form skeleton it is given, then the bars of its days", () => {
  const html = render()
  const beforeForm = html.slice(0, html.indexOf('id="form-skeleton"'))
  const afterForm = html.slice(html.indexOf('id="form-skeleton"'))

  expect(bars(beforeForm)).toBe(3)
  expect(bars(afterForm)).toBeGreaterThan(0)
  expect(bars(render(["w-13", "w-29", "w-24", "w-20", "w-16"]))).toBe(
    bars(html) + 2
  )
})

test("the skeleton holds nothing to type in, press or follow", () => {
  expect(render()).not.toMatch(/<(h2|form|input|button|label|a)[\s>]/)
})
