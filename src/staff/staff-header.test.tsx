import type { ReactElement } from "react"
import { Ban, LogOut, Menu, ScrollText } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ShorLogo } from "./shor-logo"
import { StaffHeader } from "./staff-header"

function image(attributes: string | undefined, drawing: string | undefined) {
  return attributes === undefined
    ? undefined
    : { drawing, hidden: /\saria-hidden="true"/.test(attributes) }
}

function links(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/a>/g),
    ([, attributes = "", imageAttributes, imageDrawing, content = ""]) => ({
      text: content.replace(/<[^>]*>/g, ""),
      href: /\shref="([^"]*)"/.exec(attributes)?.[1],
      current: /\saria-current="([^"]*)"/.exec(attributes)?.[1],
      image: image(imageAttributes, imageDrawing),
    })
  )
}

function buttons(html: string) {
  return Array.from(
    html.matchAll(/<button[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/button>/g),
    ([, imageAttributes, imageDrawing, content]) => ({
      content,
      image: image(imageAttributes, imageDrawing),
    })
  )
}

function drawing(image: ReactElement) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(image))?.[1]
}

function currentLinks(currentPath: string) {
  return links(
    renderToStaticMarkup(
      <StaffHeader currentPath={currentPath} memberName="aldis" />
    )
  )
    .filter(({ current }) => current !== undefined)
    .map(({ text, href, current }) => ({ text, href, current }))
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

test("the link to the panel shows Shor's logo before its name, hidden from assistive technologies", () => {
  const [panel] = links(
    renderToStaticMarkup(
      <StaffHeader currentPath="/blocked-words" memberName="aldis" />
    )
  )

  expect(panel).toEqual({
    text: "Panel de Shor",
    href: "/",
    current: undefined,
    image: { drawing: drawing(<ShorLogo />), hidden: true },
  })
})

test("each section's link shows its icon before its name, hidden from assistive technologies", () => {
  const [, ...sections] = links(
    renderToStaticMarkup(
      <StaffHeader currentPath="/blocked-words" memberName="aldis" />
    )
  )

  expect(sections.map(({ text, image }) => ({ text, image }))).toEqual([
    {
      text: "Mots interdits",
      image: { drawing: drawing(<Ban />), hidden: true },
    },
    {
      text: "Journal d’audit",
      image: { drawing: drawing(<ScrollText />), hidden: true },
    },
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

test("the header names the staff member, then offers to log out after a hidden log-out icon", () => {
  const html = renderToStaticMarkup(
    <StaffHeader currentPath="/blocked-words" memberName="Brynja la Rouge" />
  )

  expect(html).toContain(">Brynja la Rouge<")
  expect(
    buttons(html).filter(({ content }) => content === "Se déconnecter")
  ).toEqual([
    {
      content: "Se déconnecter",
      image: { drawing: drawing(<LogOut />), hidden: true },
    },
  ])
  expect(html.indexOf("Brynja la Rouge")).toBeLessThan(
    html.indexOf("Se déconnecter")
  )
})

test("a menu button shows a hidden menu icon, and names itself « Ouvrir le menu » to assistive technologies alone", () => {
  const html = renderToStaticMarkup(
    <StaffHeader currentPath="/blocked-words" memberName="aldis" />
  )

  expect(
    buttons(html).filter(({ content }) => content?.includes("Ouvrir le menu"))
  ).toEqual([
    {
      content: '<span class="sr-only">Ouvrir le menu</span>',
      image: { drawing: drawing(<Menu />), hidden: true },
    },
  ])
})
