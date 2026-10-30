import { RotateCcw, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import ErrorPage from "./error"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function message(html: string) {
  return /<p[^>]*>(.*?)<\/p>/.exec(html)?.[1]?.replaceAll(/<[^>]*>/g, "")
}

function serverError(digest: string) {
  return Object.assign(
    new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details."
    ),
    { digest }
  )
}

test("the error page tells the staff, in French, to retry, then to report the error's reference in #créer-ticket", () => {
  const html = renderToStaticMarkup(
    <ErrorPage error={serverError("2718281828")} retry={() => {}} />
  )

  expect(/<h1[^>]*>(.*)<\/h1>/.exec(html)?.[1]).toBe("Page indisponible")
  expect(message(html)).toBe(
    "Le panel n’a pas pu afficher cette page. Discord ne répond peut-être pas : réessaie dans un instant. Si ça continue, signale-le dans #créer-ticket avec la référence 2718281828."
  )
  expect(html).not.toContain("Server Components")
})

test.each([
  ["an error", new Error("Boom")],
  ["a value that is no error", "Boom"],
])(
  "the error page of %s without a reference, as one thrown in the browser, asks only to report it in #créer-ticket",
  (_, thrown) => {
    const html = renderToStaticMarkup(
      <ErrorPage error={thrown} retry={() => {}} />
    )

    expect(message(html)).toBe(
      "Le panel n’a pas pu afficher cette page. Discord ne répond peut-être pas : réessaie dans un instant. Si ça continue, signale-le dans #créer-ticket."
    )
    expect(html).not.toContain("Boom")
  }
)

test("the error page offers « Réessayer », after a hidden circular arrow", () => {
  const [, iconAttributes, iconDrawing, text] =
    /<button[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      renderToStaticMarkup(
        <ErrorPage error={serverError("2718281828")} retry={() => {}} />
      )
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes ?? ""),
    text,
  }).toEqual({ icon: drawing(RotateCcw), iconHidden: true, text: "Réessayer" })
})
