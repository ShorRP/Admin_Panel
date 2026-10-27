import { RotateCcw, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginFailed } from "./login-failed"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function links(html: string) {
  return Array.from(
    html.matchAll(
      /<a[^>]* href="([^"]*)"[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/a>/g
    ),
    ([, href, iconAttributes = "", iconDrawing, text]) => ({
      icon: iconDrawing,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      text,
      href,
    })
  )
}

test("the failed login page links back to the login through « Réessayer », after a hidden circular arrow", () => {
  expect(links(renderToStaticMarkup(<LoginFailed />))).toEqual([
    {
      icon: drawing(RotateCcw),
      iconHidden: true,
      text: "Réessayer",
      href: "/login",
    },
  ])
})
