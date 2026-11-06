import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { cutEmptySentence, LogCutNote } from "@/ui/log-cut"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

test("a cut page says how many messages were read and that « Plus anciens » continues the reading", () => {
  const html = renderToStaticMarkup(<LogCutNote readMessages={100} />)

  expect(html).toMatch(/^<p[^>]*>.*<\/p>$/)
  expect(text(html)).toBe(
    "Les 100 messages suivants du salon ont été lus, ce qui ne remplit pas la page : « Plus anciens » continue la lecture."
  )
})

test("the count is written as French writes a number", () => {
  expect(
    text(renderToStaticMarkup(<LogCutNote readMessages={1000} />))
  ).toMatch(/^Les 1 000 messages /)
})

test("a cut page with no line says that none of the messages read matches", () => {
  expect(cutEmptySentence(100)).toBe(
    "Aucune ligne ne correspond aux filtres parmi les 100 messages suivants du salon : « Plus anciens » continue la lecture."
  )
})
