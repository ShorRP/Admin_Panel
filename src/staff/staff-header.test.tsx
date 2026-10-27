import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StaffHeader } from "./staff-header"

function links(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(.*?)<\/a>/g),
    ([, attributes = "", text]) => ({
      text,
      href: /\shref="([^"]*)"/.exec(attributes)?.[1],
      current: /\saria-current="([^"]*)"/.exec(attributes)?.[1],
    })
  )
}

function currentLinks(currentPath: string) {
  return links(
    renderToStaticMarkup(
      <StaffHeader currentPath={currentPath} memberName="aldis" />
    )
  ).filter(({ current }) => current !== undefined)
}

test("the header links to the panel, then to each section", () => {
  const html = renderToStaticMarkup(
    <StaffHeader currentPath="/blocked-words" memberName="aldis" />
  )

  expect(links(html).map(({ text, href }) => ({ text, href }))).toEqual([
    { text: "Panel de Shor", href: "/" },
    { text: "Mots interdits", href: "/blocked-words" },
    { text: "Journal d’audit", href: "/audit-log" },
  ])
})

test('the current section\'s link alone carries aria-current="page"', () => {
  expect(currentLinks("/blocked-words")).toEqual([
    { text: "Mots interdits", href: "/blocked-words", current: "page" },
  ])
  expect(currentLinks("/audit-log")).toEqual([
    { text: "Journal d’audit", href: "/audit-log", current: "page" },
  ])
})

test("a path outside every section marks no link current", () => {
  expect(currentLinks("/login/refused")).toEqual([])
})

test("the header names the staff member, then offers to log out", () => {
  const html = renderToStaticMarkup(
    <StaffHeader currentPath="/blocked-words" memberName="Brynja la Rouge" />
  )

  expect(html).toContain(">Brynja la Rouge<")
  expect(
    Array.from(
      html.matchAll(/<button[^>]*>(.*?)<\/button>/g),
      ([, text]) => text
    )
  ).toEqual(["Se déconnecter"])
  expect(html.indexOf("Brynja la Rouge")).toBeLessThan(
    html.indexOf("Se déconnecter")
  )
})
