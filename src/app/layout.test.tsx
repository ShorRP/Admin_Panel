import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { APPLY_STORED_THEME } from "@/ui/theme"
import RootLayout from "./layout"

const html = renderToStaticMarkup(
  <RootLayout>
    <p />
  </RootLayout>
)

test("the root layout declares every page French", () => {
  expect(html).toContain('<html lang="fr">')
})

test("the root layout's head applies the stored theme in a script of its own, which the browser runs before it reads the body", () => {
  expect(/<head>(.*)<\/head><body>/.exec(html)?.[1]).toBe(
    `<script>${APPLY_STORED_THEME}</script>`
  )
})
