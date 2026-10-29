import { LogIn, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoggedOut } from "./logged-out"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function noticeOf(html: string) {
  const main = /<main[^>]*>(.*)<\/main>/.exec(html)?.[1] ?? ""
  return {
    heading: /<h1[^>]*>(.*?)<\/h1>/.exec(main)?.[1],
    sentence: /<\/h1>.*?<p[^>]*>(.*?)<\/p>/.exec(main)?.[1],
    links: Array.from(
      main.matchAll(
        /<a[^>]* href="([^"]*)"[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/a>/g
      ),
      ([, href, iconAttributes = "", iconDrawing, text]) => ({
        icon: iconDrawing,
        iconHidden: /\saria-hidden="true"/.test(iconAttributes),
        text,
        href,
      })
    ),
  }
}

test("the logged-out page says the session is over, then links to the login through « Se connecter avec Discord », after a hidden log-in icon", () => {
  expect(noticeOf(renderToStaticMarkup(<LoggedOut />))).toEqual({
    heading: "Ta session est terminée.",
    sentence: "Reconnecte-toi avec ton compte Discord pour revenir au panel.",
    links: [
      {
        icon: drawing(LogIn),
        iconHidden: true,
        text: "Se connecter avec Discord",
        href: "/login",
      },
    ],
  })
})
