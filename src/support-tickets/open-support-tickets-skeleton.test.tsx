import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OPEN_SUPPORT_TICKET_CLASSES } from "./open-support-tickets-layout"
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

test("the skeleton draws two cards of the list, with the cards' own classes, so that the content replaces it in the same layout", () => {
  const html = renderToStaticMarkup(<OpenSupportTicketsSkeleton />)

  expect(html.split(OPEN_SUPPORT_TICKET_CLASSES)).toHaveLength(3)
})
