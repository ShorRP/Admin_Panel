import { ExternalLink, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LoginNotice } from "./login-notice"

const SHOR_LOGO_VIEW_BOX = 'viewBox="0 0 1085.665 1173.71"'

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function loginNotice() {
  return renderToStaticMarkup(
    <LoginNotice
      title="Ta session est terminée."
      actions={<a href="/login">Se connecter avec Discord</a>}
    >
      Reconnecte-toi avec ton compte Discord pour revenir au panel.
    </LoginNotice>
  )
}

function partsOf(html: string) {
  return Array.from(
    html.matchAll(
      /<svg([^>]*)>.*?<\/svg>|<div role="group" aria-label="([^"]*)"[^>]*>.*?<\/div>|<div aria-hidden="true"[^>]*>(.*?)<\/div>|<h1[^>]*>(.*?)<\/h1>|<(?:p|span)[^>]*>([^<]*)<\/(?:p|span)>|<a[^>]*>(.*?)<\/a>/g
    ),
    ([, svg, group, hidden, heading, text, link]) => {
      if (svg !== undefined) {
        return {
          logo:
            svg.includes(SHOR_LOGO_VIEW_BOX) && /\saria-hidden="true"/.test(svg)
              ? "Shor's, hidden"
              : "other",
        }
      }
      if (group !== undefined) {
        return { group }
      }
      if (hidden !== undefined) {
        return { hidden: hidden.replace(/<[^>]*>/g, "") }
      }
      if (heading !== undefined) {
        return { heading }
      }
      if (link !== undefined) {
        return { link }
      }
      return { text }
    }
  )
}

function mainOf(html: string) {
  return /<main[^>]*>(.*)<\/main>/.exec(html)?.[1] ?? ""
}

test("a login page opens on the theme toggle, its icons alone and on Auto until the browser reads the chosen theme, before its heading", () => {
  const html = loginNotice()
  const toggle = /<div role="group" aria-label="Thème"[^>]*>(.*?)<\/div>/.exec(
    html
  )

  expect({
    beforeHeading: toggle !== null && toggle.index < html.indexOf("<h1"),
    buttons: Array.from(
      toggle?.[1]?.matchAll(
        /<button[^>]*aria-pressed="([^"]*)"[^>]*><svg[^>]*>.*?<\/svg>(.*?)<\/button>/g
      ) ?? [],
      ([, pressed, content]) => ({ pressed, content })
    ),
  }).toEqual({
    beforeHeading: true,
    buttons: [
      { pressed: "true", content: '<span class="sr-only">Auto</span>' },
      { pressed: "false", content: '<span class="sr-only">Clair</span>' },
      { pressed: "false", content: '<span class="sr-only">Sombre</span>' },
    ],
  })
})

test("a login page's top bar shows Shor's logo, hidden, and « Shor », then the theme toggle", () => {
  const html = loginNotice()

  expect(partsOf(html.slice(0, html.indexOf("<main")))).toEqual([
    { logo: "Shor's, hidden" },
    { text: "Shor" },
    { group: "Thème" },
  ])
})

test("a login page's footer says the panel is for Shor's staff, and links to shor-rp.fr in a new tab, with neither opener nor referrer, before a hidden external-link icon", () => {
  const footer = /<footer[^>]*>(.*?)<\/footer>/.exec(loginNotice())?.[1] ?? ""

  expect({
    texts: Array.from(footer.matchAll(/>([^<]+)</g), ([, text]) => text),
    links: Array.from(
      footer.matchAll(/<a(\s[^>]*)>([^<]*)<svg([^>]*)>(.*?)<\/svg><\/a>/g),
      ([, attributes = "", text, iconAttributes = "", icon]) => ({
        href: /\shref="([^"]*)"/.exec(attributes)?.[1],
        target: /\starget="([^"]*)"/.exec(attributes)?.[1],
        rel: /\srel="([^"]*)"/.exec(attributes)?.[1],
        text,
        icon,
        iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      })
    ),
  }).toEqual({
    texts: ["Réservé au staff de Shor", "shor-rp.fr"],
    links: [
      {
        href: "https://shor-rp.fr",
        target: "_blank",
        rel: "noopener noreferrer",
        text: "shor-rp.fr",
        icon: drawing(ExternalLink),
        iconHidden: true,
      },
    ],
  })
})

test("a login page's notice shows Shor's logo, hidden, the overline « Panel du staff · Skyrim Roleplay », its heading, its sentence, a rule hidden from assistive technologies, then its actions", () => {
  expect(partsOf(mainOf(loginNotice()))).toEqual([
    { logo: "Shor's, hidden" },
    { text: "Panel du staff · Skyrim Roleplay" },
    { heading: "Ta session est terminée." },
    { text: "Reconnecte-toi avec ton compte Discord pour revenir au panel." },
    { hidden: "" },
    { link: "Se connecter avec Discord" },
  ])
})
