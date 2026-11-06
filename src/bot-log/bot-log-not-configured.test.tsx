import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BotLogNotConfigured } from "./bot-log-not-configured"

test("a Bot log left out of the configuration says so in one sentence, with no link and no form", () => {
  const html = renderToStaticMarkup(<BotLogNotConfigured />)

  expect(html.replace(/<[^>]*>/g, "")).toBe(
    "Le Journal du Bot n’est pas configuré pour ce serveur Discord."
  )
  expect(html).not.toMatch(/<(a|form|input|button)[\s>]/)
})
