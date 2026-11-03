import { readFileSync } from "node:fs"
import { compile } from "tailwindcss"
import { expect, test } from "vitest"

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")

const TOUCH_VARIANT = /@custom-variant touch \{[\s\S]*?\n\}\n/

async function cssOf(candidate: string) {
  const [variant] = TOUCH_VARIANT.exec(css) ?? []
  expect(variant, "the touch variant in globals.css").toBeDefined()
  const compiler = await compile(`@tailwind utilities;\n${variant}`)
  return compiler.build([candidate])
}

test("a touch class applies under 1,024 px of width, so a desktop window narrower than that gets the touch sizes", async () => {
  const output = await cssOf("touch:flex")
  expect(output).toContain("@media (width < 64rem)")
})

test("a touch class applies on a coarse pointer, whatever the width, so a tablet in landscape gets the touch sizes", async () => {
  const output = await cssOf("touch:flex")
  expect(output).toContain("@media (pointer: coarse)")
})

test("a touch class has no other condition, so a mouse on a screen of 1,024 px or more keeps the desktop sizes", async () => {
  const output = await cssOf("touch:flex")
  const medias = output.match(/@media [^{]+/g) ?? []
  expect(medias.map((media) => media.trim()).toSorted()).toEqual([
    "@media (pointer: coarse)",
    "@media (width < 64rem)",
  ])
})

test("the page keeps the text size the browser would otherwise inflate in landscape", () => {
  expect(css).toMatch(/html \{[^}]*\n\s*text-size-adjust: 100%;/)
})
