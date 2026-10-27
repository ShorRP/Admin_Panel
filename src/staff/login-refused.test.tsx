import { LogIn, LogOut, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginRefused } from "./login-refused"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function controls(html: string) {
  return Array.from(
    html.matchAll(
      /<(a|button)(\s[^>]*)>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/\1>/g
    ),
    ([, element, attributes = "", iconAttributes = "", iconDrawing, text]) => ({
      element,
      href: /\shref="([^"]*)"/.exec(attributes)?.[1],
      icon: iconDrawing,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      text,
    })
  )
}

test("the refused page offers « Se reconnecter » after a hidden log-in icon, then « Se déconnecter » after a hidden log-out icon", () => {
  expect(controls(renderToStaticMarkup(<LoginRefused />))).toEqual([
    {
      element: "a",
      href: "/login",
      icon: drawing(LogIn),
      iconHidden: true,
      text: "Se reconnecter",
    },
    {
      element: "button",
      href: undefined,
      icon: drawing(LogOut),
      iconHidden: true,
      text: "Se déconnecter",
    },
  ])
})
