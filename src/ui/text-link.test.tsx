import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { TextLink } from "@/ui/text-link"

test("a text link is a link to its destination, with its text, and keeps the attributes it is given", () => {
  const html = renderToStaticMarkup(
    <TextLink href="/audit-log?type=bans" aria-label="Tous les changements">
      Réinitialiser
    </TextLink>
  )

  expect(/<a[^>]*>(.*)<\/a>/.exec(html)?.[1]).toBe("Réinitialiser")
  expect(/\shref="([^"]*)"/.exec(html)?.[1]).toBe("/audit-log?type=bans")
  expect(/\saria-label="([^"]*)"/.exec(html)?.[1]).toBe("Tous les changements")
})
