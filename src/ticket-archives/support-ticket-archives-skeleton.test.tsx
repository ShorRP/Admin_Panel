import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { SupportTicketArchivesSkeleton } from "./support-ticket-archives-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the skeleton of the ticket archives is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(
    status(renderToStaticMarkup(<SupportTicketArchivesSkeleton />))
  ).toEqual({
    isStatus: true,
    text: "Chargement des archives de tickets…",
    srOnlyText: "Chargement des archives de tickets…",
  })
})

test("the skeleton draws the entries of the list, with the list's own classes", () => {
  const html = renderToStaticMarkup(<SupportTicketArchivesSkeleton />)

  expect(html.match(/rounded-xl border bg-card/g)).toHaveLength(1)
  expect(html.match(/sm:grid-cols-2/g)).toHaveLength(3)
})
