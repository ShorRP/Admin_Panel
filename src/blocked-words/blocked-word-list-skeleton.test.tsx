import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordListSkeleton } from "./blocked-word-list-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the blocked words' skeleton is a status that says, to assistive technologies alone, that they are loading", () => {
  expect(status(renderToStaticMarkup(<BlockedWordListSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement des mots interdits…",
    srOnlyText: "Chargement des mots interdits…",
  })
})
