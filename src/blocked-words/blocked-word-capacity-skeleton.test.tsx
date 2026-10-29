import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordCapacitySkeleton } from "./blocked-word-capacity-skeleton"

test("the capacity gauge's skeleton holds no text and is hidden from assistive technologies, since the list's skeleton says that the blocked words are loading", () => {
  const html = renderToStaticMarkup(<BlockedWordCapacitySkeleton />)

  expect({
    hidden: /^<div[^>]*\saria-hidden="true"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    isStatus: html.includes('role="status"'),
  }).toEqual({ hidden: true, text: "", isStatus: false })
})
