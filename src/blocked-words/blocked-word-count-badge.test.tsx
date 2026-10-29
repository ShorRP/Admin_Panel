import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordCountBadge } from "./blocked-word-count-badge"

function badge(count: number) {
  const html = renderToStaticMarkup(<BlockedWordCountBadge count={count} />)
  return Array.from(
    html.matchAll(/<span([^>]*)>([^<]*)<\/span>/g),
    ([, attributes = "", text]) => ({
      text,
      hidden: /\saria-hidden="true"/.test(attributes),
      forAssistiveTechnologiesAlone: /\sclass="sr-only"/.test(attributes),
    })
  )
}

test("the badge shows the count of blocked words, hidden from assistive technologies, which read it in words instead", () => {
  expect(badge(12)).toEqual([
    { text: "12", hidden: true, forAssistiveTechnologiesAlone: false },
    { text: "12 mots", hidden: false, forAssistiveTechnologiesAlone: true },
  ])
})

test("the badge shows 0 too, and reads one word or none in the singular", () => {
  expect(badge(0)).toEqual([
    { text: "0", hidden: true, forAssistiveTechnologiesAlone: false },
    { text: "0 mot", hidden: false, forAssistiveTechnologiesAlone: true },
  ])
  expect(badge(1).map(({ text }) => text)).toEqual(["1", "1 mot"])
})

test("the badge's count reads as French numbers do", () => {
  expect(badge(1000).map(({ text }) => text)).toEqual(["1 000", "1 000 mots"])
})
