import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AccountSearchFormSkeleton } from "./account-search-form-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the skeleton of the search form is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<AccountSearchFormSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement de la recherche…",
    srOnlyText: "Chargement de la recherche…",
  })
})
