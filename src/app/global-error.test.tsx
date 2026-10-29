import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { APPLY_STORED_THEME } from "@/ui/theme"
import ErrorPage from "./error"
import GlobalError from "./global-error"

const ERROR = Object.assign(new Error("Root layout failed"), {
  digest: "1414213562",
})

function render() {
  return renderToStaticMarkup(<GlobalError error={ERROR} retry={() => {}} />)
}

test("the global error page is a French document of its own", () => {
  expect(render()).toMatch(/^<html lang="fr"><head>.*<\/head><body>/)
})

test("the global error page names its tab « Page indisponible – Panel de Shor » and points to the panel's favicon", () => {
  const head = /<head>(.*)<\/head>/.exec(render())?.[1] ?? ""

  expect(/<title>(.*)<\/title>/.exec(head)?.[1]).toBe(
    "Page indisponible – Panel de Shor"
  )
  expect(/<link rel="icon" href="([^"]*)"/.exec(head)?.[1]).toBe("/icon.svg")
})

test("the global error page applies the stored theme in its head, as the root layout does, so that it follows a theme the staff member chose", () => {
  expect(/<head>(.*)<\/head>/.exec(render())?.[1]).toContain(
    `<script>${APPLY_STORED_THEME}</script>`
  )
})

test("the global error page shows the error page's message and « Réessayer »", () => {
  expect(/<body>(.*)<\/body>/.exec(render())?.[1]).toBe(
    renderToStaticMarkup(<ErrorPage error={ERROR} retry={() => {}} />)
  )
})
