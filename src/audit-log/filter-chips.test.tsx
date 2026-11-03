import { X } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FilterChips } from "./filter-chips"

function drawing() {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<X />))?.[1]
}

function chipLinks(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", content = ""]) => ({
      href: /\shref="([^"]*)"/.exec(attributes)?.[1]?.replaceAll("&amp;", "&"),
      title: /\stitle="([^"]*)"/.exec(attributes)?.[1],
      ariaLabel: /\saria-label="([^"]*)"/.exec(attributes)?.[1],
      name: content.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]*>/g, ""),
      crossHidden: /<svg[^>]*\saria-hidden="true"[^>]*>/.test(content),
      cross: /<svg[^>]*>(.*)<\/svg>/.exec(content)?.[1],
    })
  )
}

test("each chip is a link to its own address, named by what it removes, after the filter it shows", () => {
  const html = renderToStaticMarkup(
    <FilterChips
      chips={[
        { name: "Auteur", value: "Sigrid", href: "/audit-log?account=lyra" },
        { name: "Compte", value: "lyra", href: "/audit-log?author=Sigrid" },
      ]}
    />
  )

  expect(
    chipLinks(html).map(({ href, name, title }) => ({ href, name, title }))
  ).toEqual([
    {
      href: "/audit-log?account=lyra",
      name: "Retirer le filtre Auteur : Sigrid",
      title: "Auteur : Sigrid",
    },
    {
      href: "/audit-log?author=Sigrid",
      name: "Retirer le filtre Compte : lyra",
      title: "Compte : lyra",
    },
  ])
})

test("a chip is named in the text of the link, not by an aria-label, and ends on a hidden cross", () => {
  const [chip] = chipLinks(
    renderToStaticMarkup(
      <FilterChips chips={[{ name: "Auteur", value: "Sigrid", href: "/x" }]} />
    )
  )

  expect(chip?.ariaLabel).toBeUndefined()
  expect(chip?.crossHidden).toBe(true)
  expect(chip?.cross).toBe(drawing())
})

test("the chips are a list that names itself, and none draws nothing", () => {
  const html = renderToStaticMarkup(
    <FilterChips chips={[{ name: "Auteur", value: "Sigrid", href: "/x" }]} />
  )

  expect(html).toMatch(/^<ul[^>]*\saria-label="Filtres actifs"/)
  expect(renderToStaticMarkup(<FilterChips chips={[]} />)).toBe("")
})
