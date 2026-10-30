import { ArrowLeft, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import NotFound from "./not-found"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

test("the not-found page says, in French, that the page does not exist", () => {
  const html = renderToStaticMarkup(<NotFound />)

  expect(/<h1[^>]*>(.*)<\/h1>/.exec(html)?.[1]).toBe("Page introuvable")
  expect(/<p[^>]*>(.*?)<\/p>/.exec(html)?.[1]).toBe("Cette page n’existe pas.")
})

test("the not-found page links back to the panel's home through « Revenir à l’accueil », after a hidden left arrow", () => {
  const [, href, iconAttributes, iconDrawing, text] =
    /<a[^>]* href="([^"]*)"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/a>/.exec(
      renderToStaticMarkup(<NotFound />)
    ) ?? []

  expect({
    href,
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes ?? ""),
    text,
  }).toEqual({
    href: "/",
    icon: drawing(ArrowLeft),
    iconHidden: true,
    text: "Revenir à l’accueil",
  })
})
