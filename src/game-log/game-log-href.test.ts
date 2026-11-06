import { expect, test } from "vitest"

import { NO_FILTERS } from "./game-log-filters"
import { gameLogHref, hiddenFieldsOf } from "./game-log-href"

test("with no filter and no cursor the address is the page's own", () => {
  expect(gameLogHref(NO_FILTERS)).toBe("/game-log")
})

test("the filters that are set are written in the order of the form's fields, then the cursor", () => {
  expect(
    gameLogHref({
      category: "administration",
      action: "administration:heal",
      character: "Merida",
      account: "2094594320",
      target: "4278190080",
      cell: "3c",
      plugin: "Skyrim.esm",
      reason: "test",
      text: "heal",
      from: "2026-11-01",
      to: "2026-11-05",
      before: "1568100000000000000",
    })
  ).toBe(
    "/game-log?category=administration&action=administration%3Aheal&character=Merida&account=2094594320&target=4278190080&cell=3c&plugin=Skyrim.esm&reason=test&text=heal&from=2026-11-01&to=2026-11-05&before=1568100000000000000"
  )
  expect(gameLogHref({ ...NO_FILTERS, to: "2026-11-05" })).toBe(
    "/game-log?to=2026-11-05"
  )
})

test("a text is written as a query string would, spaces and accents escaped", () => {
  expect(gameLogHref({ ...NO_FILTERS, text: "Déconnexion de Lyra" })).toBe(
    "/game-log?text=D%C3%A9connexion+de+Lyra"
  )
})

test("a filter left out is not written", () => {
  expect(
    gameLogHref({ ...NO_FILTERS, category: "characters", text: "heal" })
  ).toBe("/game-log?category=characters&text=heal")
})

test("the form keeps the category, which its pills choose, in a hidden field, and nothing else", () => {
  expect(hiddenFieldsOf(NO_FILTERS)).toEqual([])
  expect(
    hiddenFieldsOf({ ...NO_FILTERS, category: "characters", text: "heal" })
  ).toEqual([{ name: "category", value: "characters" }])
})
