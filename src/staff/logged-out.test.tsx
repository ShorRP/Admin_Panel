import { LogIn, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoggedOut } from "./logged-out"

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

test("the logged-out page links to the login through « Se connecter », after a hidden log-in icon", () => {
  expect(links(renderToStaticMarkup(<LoggedOut />))).toEqual([
    {
      icon: drawing(LogIn),
      iconHidden: true,
      text: "Se connecter",
      href: "/login",
    },
  ])
})
