import { RotateCcw, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginFailed } from "./login-failed"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function noticeOf(html: string) {
  const main = /<main[^>]*>(.*)<\/main>/.exec(html)?.[1] ?? ""
  return {
    heading: /<h1[^>]*>(.*?)<\/h1>/.exec(main)?.[1],
    sentence: /<\/h1>.*?<p[^>]*>(.*?)<\/p>/
      .exec(main)?.[1]
      ?.replaceAll(/<[^>]*>/g, ""),
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

test("the failed login page says the login did not go through, asks to report a repeated failure in #créer-ticket, linked, then links back to the login through « Réessayer », after a hidden circular arrow", () => {
  expect(noticeOf(renderToStaticMarkup(<LoginFailed />))).toEqual({
    heading: "Connexion échouée",
    sentence:
      "La connexion avec Discord n’a pas abouti. Réessaie, et si ça échoue encore, signale-le dans #créer-ticket.",
    links: [
      {
        icon: undefined,
        iconHidden: false,
        text: "#créer-ticket",
        href: "https://discord.com/channels/1545540661774913626/1550835033311412224",
      },
      {
        icon: drawing(RotateCcw),
        iconHidden: true,
        text: "Réessayer",
        href: "/login",
      },
    ],
  })
})
