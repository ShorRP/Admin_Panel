import type { ReactElement, ReactNode } from "react"
import {
  Ban,
  Gavel,
  Lock,
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
      title: /\stitle="([^"]*)"/.exec(attributes)?.[1],
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

function navOf(html: string) {
  return /<nav[^>]*>(.*?)<\/nav>/.exec(html)?.[1] ?? ""
}

async function render(
  currentPath: string,
  {
    member = "aldis",
    opensModeration = false,
    ownRecord = null,
    blockedWordCount = null,
  }: {
    member?: string
    opensModeration?: boolean
    ownRecord?: { href: string; name: string } | null
    blockedWordCount?: ReactNode
  } = {}
) {
  const { prelude } = await prerender(
    <StaffHeader
      currentPath={currentPath}
      member={member}
      opensModeration={Promise.resolve(opensModeration)}
      ownRecord={Promise.resolve(ownRecord)}
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

test("the sidebar links to the panel, then to each section, then to the privacy policy", async () => {
  const { sidebar } = await render("/blocked-words")

  expect(links(sidebar).map(({ text, href }) => ({ text, href }))).toEqual([
    { text: "Shor Panel du staff", href: "/" },
    { text: "Mots interdits", href: "/blocked-words" },
    { text: "Journal d’audit", href: "/audit-log" },
    { text: "Confidentialité", href: "/privacy" },
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
  const sections = links(
    navOf((await render("/blocked-words", { opensModeration: true })).sidebar)
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
      navOf(
        (
          await render(currentPath, {
            opensModeration: true,
            blockedWordCount: count,
          })
        ).sidebar
      )
    )

    expect(
      sections.map(({ content }) => ({
        countAfterName:
          content.includes(countMarkup) &&
          textOf(content) === "Mots interdits12",
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

test("the sidebar's foot offers the theme toggle, on Auto until the browser reads the chosen theme, then names the staff member, then says what they are, then offers to log out through a hidden log-out icon, named « Se déconnecter » to assistive technologies alone, then links to the privacy policy", async () => {
  const { sidebar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
  })
  const foot = sidebar.slice(sidebar.indexOf("</nav>"))

  expect(textOf(foot)).toBe(
    "AutoClairSombreBrynja la RougeStaffSe déconnecterConfidentialité"
  )
  expect(/<div role="group" aria-label="Thème"/.test(foot)).toBe(true)
  expect(
    Array.from(
      foot.matchAll(/<button[^>]*aria-pressed="true"[^>]*>(.*?)<\/button>/g),
      ([, content = ""]) => textOf(content)
    )
  ).toEqual(["Auto"])
  const footButtons = buttons(foot)
  expect(
    footButtons.slice(0, 3).map(({ content, image }) => ({
      content: textOf(content),
      image,
    }))
  ).toEqual([
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
  ])
  expect(footButtons.slice(3)).toEqual([
    {
      content: '<span class="sr-only">Se déconnecter</span>',
      image: { drawing: drawing(<LogOut />), hidden: true },
    },
  ])
})

test("the sidebar's foot ends on a link to the privacy policy, below the staff member", async () => {
  const { sidebar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
  })
  const foot = sidebar.slice(sidebar.indexOf("</nav>"))

  expect({
    afterMember:
      foot.indexOf("Confidentialité") > foot.indexOf("Brynja la Rouge"),
    links: links(foot).map(({ text, href, current }) => ({
      text,
      href,
      current,
    })),
  }).toEqual({
    afterMember: true,
    links: [{ text: "Confidentialité", href: "/privacy", current: undefined }],
  })
})

test("each of the sidebar's section links repeats its name in a title, for the rail", async () => {
  const { sidebar } = await render("/blocked-words", { opensModeration: true })

  expect(
    links(navOf(sidebar)).map(({ text, title }) => ({ text, title }))
  ).toEqual([
    { text: "Mots interdits", title: "Mots interdits" },
    { text: "Journal d’audit", title: "Journal d’audit" },
    { text: "Modération", title: "Modération" },
  ])
})

test("a rule, hidden from assistive technologies, separates the sidebar's two groups for the rail, and there is none for a staff member with one group", async () => {
  const rules = (html: string) =>
    Array.from(
      navOf(html).matchAll(/<span aria-hidden="true" class="[^"]*"><\/span>/g)
    )
  const { sidebar: moderating } = await render("/blocked-words", {
    opensModeration: true,
  })
  const { sidebar: administering } = await render("/blocked-words")

  expect(rules(moderating)).toHaveLength(1)
  expect(rules(administering)).toHaveLength(0)
})

test("the sidebar's link to the privacy policy shows a lock before its name, hidden from assistive technologies, and repeats the name in a title, for the rail", async () => {
  const { sidebar } = await render("/blocked-words")
  const foot = sidebar.slice(sidebar.indexOf("</nav>"))

  expect(
    links(foot).map(({ text, title, image }) => ({ text, title, image }))
  ).toEqual([
    {
      text: "Confidentialité",
      title: "Confidentialité",
      image: { drawing: drawing(<Lock />), hidden: true },
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

const OWN_RECORD = {
  href: "/records/1400000000000000002",
  name: "Brynja la Rouge",
}

function ownRecordLinks(html: string) {
  return links(html).filter(({ href }) => href === OWN_RECORD.href)
}

test("a staff member who moderates sees their name in the sidebar as a link to their own record, named by the name alone, and the line « Staff · Modération » under it, outside the link", async () => {
  const { sidebar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
    opensModeration: true,
    ownRecord: OWN_RECORD,
  })
  const foot = sidebar.slice(sidebar.indexOf("</nav>"))

  expect(
    ownRecordLinks(sidebar).map(({ text, current, content }) => ({
      text,
      current,
      srOnly: content.includes("sr-only"),
    }))
  ).toEqual([{ text: "Brynja la Rouge", current: undefined, srOnly: false }])
  expect(textOf(foot)).toContain("Brynja la RougeStaff · Modération")
})

test("the bar's link to their own record keeps their name for assistive technologies in a text of its own, before what the bar shows, and the bar shows no line under the name", async () => {
  const { bar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
    opensModeration: true,
    ownRecord: OWN_RECORD,
  })

  expect(
    ownRecordLinks(bar).map(({ content }) => ({
      nameForAssistiveTechnologiesFirst: content.startsWith(
        '<span class="sr-only">Brynja la Rouge</span>'
      ),
    }))
  ).toEqual([{ nameForAssistiveTechnologiesFirst: true }])
  expect(textOf(bar)).not.toContain("Staff")
})

test("the link to their own record is the current page on that record alone", async () => {
  const currentOn = async (currentPath: string) =>
    ownRecordLinks(
      (
        await render(currentPath, {
          opensModeration: true,
          ownRecord: OWN_RECORD,
        })
      ).sidebar
    ).map(({ current }) => current)

  expect(await currentOn(OWN_RECORD.href)).toEqual(["page"])
  expect(await currentOn("/records")).toEqual([undefined])
  expect(await currentOn("/records/1400000000000000003")).toEqual([undefined])
})

test("a staff member who opens no record of their own sees their name in the sidebar and in the bar as text, with no link, and « Staff » under it in the sidebar", async () => {
  const { sidebar, bar } = await render("/blocked-words", {
    member: "Brynja la Rouge",
    ownRecord: null,
  })

  expect(ownRecordLinks(sidebar)).toEqual([])
  expect(ownRecordLinks(bar)).toEqual([])
  expect(
    links(sidebar).filter(({ text }) => text.includes("Brynja la Rouge"))
  ).toEqual([])
  expect(textOf(sidebar)).toContain("Brynja la RougeStaff")
  expect(textOf(sidebar)).not.toContain("Staff · Modération")
  expect(textOf(bar)).toContain("Brynja la Rouge")
})
