import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogPagination } from "@/ui/log-pagination"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function render(props: {
  oldest?: Date | null
  newestHref?: string | null
  olderHref?: string | null
}) {
  return renderToStaticMarkup(
    <LogPagination
      label="Pages des événements"
      oldest={null}
      newestHref={null}
      olderHref={null}
      {...props}
    />
  )
}

function links(html: string) {
  return Array.from(
    html.matchAll(
      /<a[^>]* href="([^"]*)"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/a>/g
    ),
    ([, href, iconAttributes = "", icon, text]) => ({
      icon,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      text,
      href,
    })
  )
}

test("with nothing to say and nowhere to go, it renders nothing", () => {
  expect(render({})).toBe("")
})

test("it says the day of Paris of the oldest line, in a short date", () => {
  const html = render({ oldest: new Date("2026-10-24T22:30:00.000Z") })

  expect(html).toContain(
    'Jusqu’au <time dateTime="2026-10-25">25 oct. 2026</time></p>'
  )
  expect(html).not.toContain("<nav")
})

test("with only older lines, it links to them alone, after a hidden right arrow, in a navigation named by its label", () => {
  const html = render({ olderHref: "/events?before=1" })

  expect(html).toContain('<nav aria-label="Pages des événements"')
  expect(links(html)).toEqual([
    {
      icon: drawing(ArrowRight),
      iconHidden: true,
      text: "Plus anciens",
      href: "/events?before=1",
    },
  ])
})

test("with only a way back, it links to the newest lines alone, after a hidden left arrow", () => {
  expect(links(render({ newestHref: "/events" }))).toEqual([
    {
      icon: drawing(ArrowLeft),
      iconHidden: true,
      text: "Revenir aux plus récents",
      href: "/events",
    },
  ])
})

test("with both, the way back comes first", () => {
  expect(
    links(render({ newestHref: "/events", olderHref: "/events?before=1" })).map(
      ({ text }) => text
    )
  ).toEqual(["Revenir aux plus récents", "Plus anciens"])
})
