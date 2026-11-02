import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { EmptyListFrame } from "@/ui/empty-list-frame"

test("an empty list's frame holds the sentence it is given as a paragraph, and the link after it", () => {
  const html = renderToStaticMarkup(
    <EmptyListFrame id="empty">
      <p>Aucun changement plus ancien.</p>
      <a href="/audit-log">Réinitialiser</a>
    </EmptyListFrame>
  )

  expect(html).toMatch(/^<div[^>]*\sid="empty"[^>]*>.*<\/div>$/)
  expect(
    Array.from(html.matchAll(/<p>(.*?)<\/p>/g), ([, text]) => text)
  ).toEqual(["Aucun changement plus ancien."])
  expect(html.indexOf("<a")).toBeGreaterThan(html.indexOf("</p>"))
})
