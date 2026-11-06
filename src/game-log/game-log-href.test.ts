import { expect, test } from "vitest"

import { gameLogHref } from "./game-log-href"

const NONE = { text: null, from: null, to: null }

test("with no filter and no cursor the address is the page's own", () => {
  expect(gameLogHref(NONE)).toBe("/game-log")
})

test("the filters that are set are written in the order of the form's fields, then the cursor", () => {
  expect(
    gameLogHref({
      text: "heal",
      from: "2026-11-01",
      to: "2026-11-05",
      before: "1568100000000000000",
    })
  ).toBe(
    "/game-log?text=heal&from=2026-11-01&to=2026-11-05&before=1568100000000000000"
  )
  expect(gameLogHref({ ...NONE, to: "2026-11-05" })).toBe(
    "/game-log?to=2026-11-05"
  )
})

test("a text is written as a query string would, spaces and accents escaped", () => {
  expect(gameLogHref({ ...NONE, text: "Déconnexion de Lyra" })).toBe(
    "/game-log?text=D%C3%A9connexion+de+Lyra"
  )
})
