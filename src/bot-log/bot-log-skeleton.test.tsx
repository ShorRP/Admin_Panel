import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BotLogSkeleton } from "./bot-log-skeleton"

test("the Bot log's skeleton shows the filters' form as bars, with no field to type in, no button and no link", () => {
  const html = renderToStaticMarkup(<BotLogSkeleton />)

  expect(html).not.toMatch(/<(form|input|button|label|a)[\s>]/)
})

test("the Bot log's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  const html = renderToStaticMarkup(<BotLogSkeleton />)

  expect({
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }).toEqual({
    isStatus: true,
    text: "Chargement du Journal du Bot…",
    srOnlyText: "Chargement du Journal du Bot…",
  })
})
