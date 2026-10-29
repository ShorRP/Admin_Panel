import type { ReactElement, ReactNode } from "react"
import {
  Ban,
  Gavel,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ScrollText,
  Sun,
} from "lucide-react"
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

function textOf(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function links(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/a>/g),
    ([, attributes = "", imageAttributes, imageDrawing, content = ""]) => ({
      text: textOf(content),
      href: /\shref="([^"]*)"/.exec(attributes)?.[1],
      current: /\saria-current="([^"]*)"/.exec(attributes)?.[1],
      image: image(imageAttributes, imageDrawing),
      content,
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

function groups(html: string) {
  return Array.from(
    html.matchAll(
      /<p id="([^"]*)"[^>]*>([^<]*)<\/p><ul aria-labelledby="([^"]*)"[^>]*>(.*?)<\/ul>/g
    ),
    ([, id, title, labelledBy, list = ""]) => ({
      title,
      titlesItsList: id === labelledBy,
      sections: links(list).map(({ text }) => text),
    })
  )
}

function drawing(image: ReactElement) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(image))?.[1]
}

function insideElement(html: string, element: "aside" | "header") {
  const inside = new RegExp(
    String.raw`<${element}[^>]*>([\s\S]*)</${element}>`
  ).exec(html)?.[1]
  if (inside === undefined) {
    throw new Error(`StaffHeader renders no <${element}>.`)
  }
  return inside
}

async function render(
  currentPath: string,
  {
    member = "aldis",
    opensModeration = false,
    blockedWordCount = null,
  }: {
    member?: string
    opensModeration?: boolean
    blockedWordCount?: ReactNode
  } = {}
) {
  const { prelude } = await prerender(
    <StaffHeader
      currentPath={currentPath}
      member={member}
      opensModeration={Promise.resolve(opensModeration)}
      blockedWordCount={blockedWordCount}
    />,
    { progressiveChunkSize: Number.POSITIVE_INFINITY }
  )
  const html = await new Response(prelude).text()
  return {
    sidebar: insideElement(html, "aside"),
    bar: insideElement(html, "header"),
  }
}

async function currentLinks(currentPath: string) {
  const { sidebar } = await render(currentPath, { opensModeration: true })
  return links(sidebar)
    .filter(({ current }) => current !== undefined)
    .map(({ text, href, current }) => ({ text, href, current }))
}

test("the sidebar links to the panel, then to each section", async () => {
  const { sidebar } = await render("/blocked-words")

  expect(links(sidebar).map(({ text, href }) => ({ text, href }))).toEqual([
    { text: "Shor Panel du staff", href: "/" },
    { text: "Mots interdits", href: "/blocked-words" },
    { text: "Journal d’audit", href: "/audit-log" },
  ])
})

test("the sidebar's link to the panel shows Shor's logo, hidden from assistive technologies, before « Shor » and « Panel du staff »", async () => {
  const [panel] = links((await render("/blocked-words")).sidebar)

  expect(panel).toMatchObject({
    text: "Shor Panel du staff",
    href: "/",
    current: undefined,
    image: { drawing: drawing(<ShorLogo />), hidden: true },
  })
})

test("the bar's link to the panel shows Shor's logo alone, and leaves « Shor » and « Panel du staff » to assistive technologies", async () => {
  const { bar } = await render("/blocked-words")

  expect(
    links(bar).map(({ text, href, image, content }) => ({
      text,
      href,
      image,
      nameForAssistiveTechnologiesAlone: content.startsWith(
        '<span class="sr-only">'
      ),
    }))
  ).toEqual([
    {
      text: "Shor Panel du staff",
      href: "/",
      image: { drawing: drawing(<ShorLogo />), hidden: true },
      nameForAssistiveTechnologiesAlone: true,
    },
  ])
})

test("the sidebar's ornament, between the link to the panel and the sections, is hidden from assistive technologies", async () => {
  const { sidebar } = await render("/blocked-words")
  const ornament =
    /<\/a>(<div[^>]*>[\s\S]*?<\/div>)<nav/.exec(sidebar)?.[1] ?? ""

  expect({
    found: ornament !== "",
    hidden: /^<div[^>]*\saria-hidden="true"/.test(ornament),
    text: textOf(ornament),
  }).toEqual({ found: true, hidden: true, text: "" })
})

test("a staff member who cannot open the moderation section sees the sections under « Administration », and no « Modération » at all", async () => {
  const { sidebar } = await render("/blocked-words")

  expect(groups(sidebar)).toEqual([
    {
      title: "Administration",
      titlesItsList: true,
      sections: ["Mots interdits", "Journal d’audit"],
    },
  ])
  expect(textOf(sidebar)).not.toContain("Modération")
})

test("a staff member who opens the moderation section also sees « Modération », last, under a title of its own", async () => {
  const { sidebar } = await render("/blocked-words", { opensModeration: true })

  expect(groups(sidebar)).toEqual([
    {
      title: "Administration",
      titlesItsList: true,
      sections: ["Mots interdits", "Journal d’audit"],
    },
    { title: "Modération", titlesItsList: true, sections: ["Modération"] },
  ])
})

test("each section's link shows its icon before its name, hidden from assistive technologies", async () => {
  const [, ...sections] = links(
    (await render("/blocked-words", { opensModeration: true })).sidebar
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
    {
      text: "Modération",
      image: { drawing: drawing(<Gavel />), hidden: true },
    },
  ])
})

test("the blocked words' link shows the count it is given after the section's name, and no other section shows it, whichever is current", async () => {
  const count = <span id="blocked-word-count">12</span>
  const countMarkup = renderToStaticMarkup(count)
  for (const currentPath of ["/blocked-words", "/audit-log"]) {
    const sections = links(
      (
        await render(currentPath, {
          opensModeration: true,
          blockedWordCount: count,
        })
      ).sidebar
    ).slice(1)

    expect(
      sections.map(({ content }) => ({
        countAfterName: content.startsWith(`Mots interdits${countMarkup}`),
        count: content.includes(countMarkup),
      }))
    ).toEqual([
      { countAfterName: true, count: true },
      { countAfterName: false, count: false },
      { countAfterName: false, count: false },
    ])
  }
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

test("the sidebar's foot offers the theme toggle, on Auto until the browser reads the chosen theme, then names the staff member, then offers to log out through a hidden log-out icon, named « Se déconnecter » to assistive technologies alone", async () => {
  const { sidebar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
  })
  const foot = sidebar.slice(sidebar.indexOf("</nav>"))

  expect(textOf(foot)).toBe("AutoClairSombreBrynja la RougeSe déconnecter")
  expect(/<div role="group" aria-label="Thème"/.test(foot)).toBe(true)
  expect(
    Array.from(
      foot.matchAll(/<button[^>]*aria-pressed="true"[^>]*>(.*?)<\/button>/g),
      ([, content = ""]) => textOf(content)
    )
  ).toEqual(["Auto"])
  expect(buttons(foot)).toEqual([
    {
      content: "Auto",
      image: { drawing: drawing(<Monitor />), hidden: true },
    },
    {
      content: "Clair",
      image: { drawing: drawing(<Sun />), hidden: true },
    },
    {
      content: "Sombre",
      image: { drawing: drawing(<Moon />), hidden: true },
    },
    {
      content: '<span class="sr-only">Se déconnecter</span>',
      image: { drawing: drawing(<LogOut />), hidden: true },
    },
  ])
})

test("the bar names the staff member, then shows a menu button with a hidden menu icon, named « Ouvrir le menu » to assistive technologies alone", async () => {
  const { bar } = await render("/blocked-words", { member: "Brynja la Rouge" })

  expect(textOf(bar.slice(bar.indexOf("</a>")))).toBe(
    "Brynja la RougeOuvrir le menu"
  )
  expect(buttons(bar)).toEqual([
    {
      content: '<span class="sr-only">Ouvrir le menu</span>',
      image: { drawing: drawing(<Menu />), hidden: true },
    },
  ])
})
