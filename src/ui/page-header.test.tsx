import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { PageHeader } from "@/ui/page-header"

function parts(html: string) {
  return Array.from(
    html.matchAll(/<(p|h1)[^>]*>([^<]*)<\/\1>/g),
    ([, element, text]) => `${element}: ${text}`
  )
}

test("a page's header gives its overline, then the page's h1, then its sentence", () => {
  expect(
    parts(
      renderToStaticMarkup(
        <PageHeader overline="Fiches des comptes" title="Modération">
          Cherche un compte.
        </PageHeader>
      )
    )
  ).toEqual([
    "p: Fiches des comptes",
    "h1: Modération",
    "p: Cherche un compte.",
  ])
})

test("a page's header without an overline gives only its h1 and its sentence", () => {
  expect(
    parts(
      renderToStaticMarkup(
        <PageHeader title="Fiche">Aucun compte Discord n’a cet ID.</PageHeader>
      )
    )
  ).toEqual(["h1: Fiche", "p: Aucun compte Discord n’a cet ID."])
})
