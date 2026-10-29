import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { OtherAutoModRules } from "./other-auto-mod-rules"

function label(html: string) {
  const id = /^<section aria-labelledby="([^"]*)"/.exec(html)?.[1] ?? ""
  return new RegExp(`<(\\w+)[^>]* id="${id}"[^>]*>([^<]*)</\\1>`).exec(
    html
  )?.[2]
}

function rules(html: string) {
  return Array.from(
    html.matchAll(
      /<li[^>]*>(?:<span[^>]*>([^<]*)<\/span>|<details[^>]*><summary[^>]*><span[^>]*>([^<]*)<\/span><span[^>]*>([^<]*)<svg([^>]*)>.*?<\/svg><\/span><\/summary><ul[^>]*>(.*?)<\/ul><\/details>)<\/li>/g
    ),
    ([, plainName, foldedName, summary, chevron = "", keywords = ""]) => ({
      name: plainName ?? foldedName,
      summary,
      ...(summary !== undefined && {
        chevronHidden: /\saria-hidden="true"/.test(chevron),
      }),
      keywords: Array.from(
        keywords.matchAll(/<li[^>]*>([^<]*)<\/li>/g),
        ([, keyword]) => keyword
      ),
    })
  )
}

test("the other AutoMod rules show under their own overline, read-only, each keyword rule folding its keywords away behind its name and their count", () => {
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

  expect(label(html)).toBe("Autres règles AutoMod")
  expect(html).toContain("Elles se modifient dans Discord.")
  expect(rules(html)).toEqual([
    {
      name: "Liens",
      summary: "2 mots-clés",
      chevronHidden: true,
      keywords: ["http", "www"],
    },
    {
      name: "Discord",
      summary: "1 mot-clé",
      chevronHidden: true,
      keywords: ["discord.gg"],
    },
    { name: "Vide", summary: undefined, keywords: [] },
    { name: "Mentions", summary: undefined, keywords: [] },
  ])
  expect(html).not.toMatch(/<button|<form|<input|<h2/)
})

test("with no other AutoMod rule, the section is left out", () => {
  expect(renderToStaticMarkup(<OtherAutoModRules rules={[]} />)).toBe("")
})
