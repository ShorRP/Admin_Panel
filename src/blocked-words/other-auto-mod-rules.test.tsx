import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OtherAutoModRules } from "./other-auto-mod-rules"

function items(html: string) {
  return Array.from(
    html.matchAll(
      /<li[^>]*><span[^>]*>(.*?)<\/span>(<details>.*?<\/details>)?<\/li>/g
    ),
    ([, name, details = ""]) => ({
      name,
      summary: /<summary[^>]*>(.*?)<\/summary>/.exec(details)?.[1],
      keywords: Array.from(
        details.matchAll(/<li[^>]*>(.*?)<\/li>/g),
        ([, keyword]) => keyword
      ),
    })
  )
}

test("the other AutoMod rules show under their own heading, read-only, with a keyword rule's keywords folded away", () => {
  const html = renderToStaticMarkup(
    <OtherAutoModRules
      rules={[
        { id: "1", name: "Liens", keywords: ["http", "www"] },
        { id: "2", name: "Discord", keywords: ["discord.gg"] },
        { id: "3", name: "Vide", keywords: [] },
        { id: "4", name: "Mentions", keywords: null },
      ]}
    />
  )

  expect(html).toMatch(/<h2[^>]*>Autres règles AutoMod du serveur<\/h2>/)
  expect(html).toContain("Elles se modifient dans Discord.")
  expect(items(html)).toEqual([
    { name: "Liens", summary: "2 mots-clés", keywords: ["http", "www"] },
    { name: "Discord", summary: "1 mot-clé", keywords: ["discord.gg"] },
    { name: "Vide", summary: undefined, keywords: [] },
    { name: "Mentions", summary: undefined, keywords: [] },
  ])
  expect(html).not.toMatch(/<button|<form|<input/)
})

test("with no other AutoMod rule, the section is left out", () => {
  expect(renderToStaticMarkup(<OtherAutoModRules rules={[]} />)).toBe("")
})
