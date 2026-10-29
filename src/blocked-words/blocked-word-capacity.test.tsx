import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordCapacity } from "./blocked-word-capacity"

function gauge(html: string) {
  const [, barAttributes = "", bar = ""] =
    /<div([^>]*)>(<div[^>]*><\/div>)<\/div>/.exec(html) ?? []
  return {
    texts: Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text),
    barHidden: /\saria-hidden="true"/.test(barAttributes),
    barWidth: /\sstyle="width:([^"]*)"/.exec(bar)?.[1],
  }
}

test("the capacity gauge shows the count of blocked words in large, out of the 1 000 the rule holds, under its overline, over a bar hidden from assistive technologies that fills in proportion", () => {
  expect(
    gauge(renderToStaticMarkup(<BlockedWordCapacity count={18} />))
  ).toEqual({
    texts: ["Capacité", "18", "/ 1 000 mots"],
    barHidden: true,
    barWidth: "1.8%",
  })
})

test("the gauge's count reads as French numbers do, and a full rule fills the bar", () => {
  expect(
    gauge(renderToStaticMarkup(<BlockedWordCapacity count={1000} />))
  ).toEqual({
    texts: ["Capacité", "1 000", "/ 1 000 mots"],
    barHidden: true,
    barWidth: "100%",
  })
})

test("the gauge is a group that its overline names", () => {
  const html = renderToStaticMarkup(<BlockedWordCapacity count={18} />)
  const id = /^<div role="group" aria-labelledby="([^"]+)"/.exec(html)?.[1]

  expect(new RegExp(`<p id="${id}"[^>]*>([^<]*)</p>`).exec(html)?.[1]).toBe(
    "Capacité"
  )
})

test("an empty rule leaves the bar empty", () => {
  expect(
    gauge(renderToStaticMarkup(<BlockedWordCapacity count={0} />)).barWidth
  ).toBe("0%")
})
