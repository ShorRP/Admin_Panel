import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordExceptions } from "./blocked-word-exceptions"

test("the exceptions card says, under its overline, whom the blocked words spare", () => {
  const html = renderToStaticMarkup(<BlockedWordExceptions />)

  expect(Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text)).toEqual([
    "Exceptions",
    "Les mots interdits ne s’appliquent ni au propriétaire du serveur Discord, ni aux membres qui ont la permission « Administrateur » ou « Gérer le serveur ».",
  ])
})

test("the exceptions card is a section that its overline names", () => {
  const html = renderToStaticMarkup(<BlockedWordExceptions />)
  const id = /^<section aria-labelledby="([^"]+)"/.exec(html)?.[1]

  expect(new RegExp(`<p id="${id}"[^>]*>([^<]*)</p>`).exec(html)?.[1]).toBe(
    "Exceptions"
  )
})
