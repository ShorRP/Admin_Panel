import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { RecordDetailsSkeleton } from "./record-details-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the skeleton of the record is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<RecordDetailsSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement de la fiche…",
    srOnlyText: "Chargement de la fiche…",
  })
})
