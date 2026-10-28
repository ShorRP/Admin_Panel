import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FoundAccountsSkeleton } from "./found-accounts-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the skeleton of the accounts found is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<FoundAccountsSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement des comptes…",
    srOnlyText: "Chargement des comptes…",
  })
})
