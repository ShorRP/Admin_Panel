import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OpenSupportTicketsSkeleton } from "./open-support-tickets-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the skeleton of the tickets in progress is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<OpenSupportTicketsSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement des tickets en cours…",
    srOnlyText: "Chargement des tickets en cours…",
  })
})
