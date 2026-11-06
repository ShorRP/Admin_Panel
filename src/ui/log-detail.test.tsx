import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogDetail, LogRawFields, LogTitle } from "@/ui/log-detail"

test("a title is a paragraph that wraps anywhere", () => {
  const html = renderToStaticMarkup(
    <LogTitle>Tickets · Ticket ouvert</LogTitle>
  )

  expect(html).toContain("Tickets · Ticket ouvert")
  expect(html).toMatch(/^<p[^>]*wrap-anywhere/)
})

test("a detail is a paragraph that wraps anywhere, in the muted color", () => {
  const html = renderToStaticMarkup(<LogDetail>Lieu : Blancherive</LogDetail>)

  expect(html).toContain("Lieu : Blancherive")
  expect(html).toMatch(/^<p[^>]*wrap-anywhere/)
  expect(html).toContain("text-muted-foreground")
})

test.each(["", null, undefined, false])(
  "a detail with nothing to say draws nothing (%s)",
  (nothing) => {
    expect(renderToStaticMarkup(<LogDetail>{nothing}</LogDetail>)).toBe("")
  }
)

test("raw fields show a name and its value, or the value alone, one paragraph each, in order", () => {
  const html = renderToStaticMarkup(
    <LogRawFields
      fields={[
        { name: null, value: "Redémarrage planifié" },
        { name: "Durée", value: "12 s" },
      ]}
    />
  )

  expect(html.indexOf("Redémarrage planifié")).toBeGreaterThan(-1)
  expect(html.indexOf("Durée : 12 s")).toBeGreaterThan(
    html.indexOf("Redémarrage planifié")
  )
  expect(html.match(/<p /g)).toHaveLength(2)
})
