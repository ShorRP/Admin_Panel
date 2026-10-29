import { LogIn, LogOut, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginRefused } from "./login-refused"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function noticeOf(html: string) {
  const main = /<main[^>]*>(.*)<\/main>/.exec(html)?.[1] ?? ""
  return {
    heading: /<h1[^>]*>(.*?)<\/h1>/.exec(main)?.[1],
    sentence: /<\/h1>.*?<p[^>]*>(.*?)<\/p>/.exec(main)?.[1],
    controls: Array.from(
      main.matchAll(
        /<(a|button)(\s[^>]*)>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/\1>/g
      ),
      ([
        ,
        element,
        attributes = "",
        iconAttributes = "",
        iconDrawing,
        text,
      ]) => ({
        element,
        href: /\shref="([^"]*)"/.exec(attributes)?.[1],
        icon: iconDrawing,
        iconHidden: /\saria-hidden="true"/.test(iconAttributes),
        text,
      })
    ),
  }
}

test("the refused page says the account lacks the staff role, then offers « Se reconnecter » after a hidden log-in icon, and « Se déconnecter » after a hidden log-out icon", () => {
  expect(noticeOf(renderToStaticMarkup(<LoginRefused />))).toEqual({
    heading: "Accès refusé",
    sentence:
      "Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor.",
    controls: [
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
    ],
  })
})
