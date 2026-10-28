import type { ReactElement } from "react"
import { Ban, Gavel, LogOut, Menu, ScrollText } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { prerender } from "react-dom/static"
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

async function header(
  currentPath: string,
  { member = "aldis", opensModeration = false } = {}
) {
  const { prelude } = await prerender(
    <StaffHeader
      currentPath={currentPath}
      member={member}
      opensModeration={Promise.resolve(opensModeration)}
    />
  )
  return await new Response(prelude).text()
}

async function currentLinks(currentPath: string) {
  return links(await header(currentPath, { opensModeration: true }))
    .filter(({ current }) => current !== undefined)
    .map(({ text, href, current }) => ({ text, href, current }))
}

test("the header links to the panel, then to each section", async () => {
  const html = await header("/blocked-words")

  expect(links(html).map(({ text, href }) => ({ text, href }))).toEqual([
    { text: "Panel de Shor", href: "/" },
    { text: "Mots interdits", href: "/blocked-words" },
    { text: "Journal d’audit", href: "/audit-log" },
  ])
})

test("the link to the panel shows Shor's logo before its name, hidden from assistive technologies", async () => {
  const [panel] = links(await header("/blocked-words"))

  expect(panel).toEqual({
    text: "Panel de Shor",
    href: "/",
    current: undefined,
    image: { drawing: drawing(<ShorLogo />), hidden: true },
  })
})

test("each section's link shows its icon before its name, hidden from assistive technologies", async () => {
  const [, ...sections] = links(await header("/blocked-words"))

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

test('the current section\'s link alone carries aria-current="page"', async () => {
  expect(await currentLinks("/blocked-words")).toEqual([
    { text: "Mots interdits", href: "/blocked-words", current: "page" },
  ])
  expect(await currentLinks("/audit-log")).toEqual([
    { text: "Journal d’audit", href: "/audit-log", current: "page" },
  ])
})

test("a path outside every section marks no link current", async () => {
  expect(await currentLinks("/login/refused")).toEqual([])
})

test("a staff member who opens the moderation section sees « Modération » last among the sections, after a hidden gavel icon", async () => {
  const [, , , moderation, ...rest] = links(
    await header("/blocked-words", { opensModeration: true })
  )

  expect(moderation).toEqual({
    text: "Modération",
    href: "/records",
    current: undefined,
    image: { drawing: drawing(<Gavel />), hidden: true },
  })
  expect(rest).toEqual([])
})

test("a staff member who cannot open the moderation section sees no link to it", async () => {
  expect(
    links(await header("/blocked-words")).map(({ text }) => text)
  ).not.toContain("Modération")
})

test("the moderation section is current on its search and on every record", async () => {
  const moderation = {
    text: "Modération",
    href: "/records",
    current: "page",
  }

  expect(await currentLinks("/records")).toEqual([moderation])
  expect(await currentLinks("/records/1400000000000000001")).toEqual([
    moderation,
  ])
  expect(await currentLinks("/recordsx")).toEqual([])
})

test("the header names the staff member, then offers to log out after a hidden log-out icon", async () => {
  const html = await header("/blocked-words", { member: "Brynja la Rouge" })

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

test("a menu button shows a hidden menu icon, and names itself « Ouvrir le menu » to assistive technologies alone", async () => {
  const html = await header("/blocked-words")

  expect(
    buttons(html).filter(({ content }) => content?.includes("Ouvrir le menu"))
  ).toEqual([
    {
      content: '<span class="sr-only">Ouvrir le menu</span>',
      image: { drawing: drawing(<Menu />), hidden: true },
    },
  ])
})
