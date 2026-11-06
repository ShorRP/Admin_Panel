import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { GameLogNotConfigured } from "./game-log-not-configured"

test("a game log left out of the configuration says so in one sentence, with no link and no form", () => {
  const html = renderToStaticMarkup(<GameLogNotConfigured />)

  expect(html.replace(/<[^>]*>/g, "")).toBe(
    "Le journal du jeu n’est pas configuré pour ce serveur Discord."
  )
  expect(html).not.toMatch(/<(a|form|input|button)[\s>]/)
})
