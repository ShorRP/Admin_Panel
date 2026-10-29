import { LogOut } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogOutForm } from "./log-out-form"

function buttons(html: string) {
  return Array.from(
    html.matchAll(
      /<button(\s[^>]*)>(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/button>/g
    ),
    ([, attributes = "", iconAttributes = "", icon, content]) => ({
      submits: /\stype="submit"/.test(attributes),
      icon,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      content,
    })
  )
}

const LOG_OUT_ICON = /<svg[^>]*>(.*)<\/svg>/.exec(
  renderToStaticMarkup(<LogOut />)
)?.[1]

test("the log-out form submits « Se déconnecter », its visible text, after a hidden log-out icon", () => {
  expect(buttons(renderToStaticMarkup(<LogOutForm />))).toEqual([
    {
      submits: true,
      icon: LOG_OUT_ICON,
      iconHidden: true,
      content: "Se déconnecter",
    },
  ])
})

test("with its icon alone, the log-out form names its button « Se déconnecter » to assistive technologies alone", () => {
  expect(buttons(renderToStaticMarkup(<LogOutForm iconOnly />))).toEqual([
    {
      submits: true,
      icon: LOG_OUT_ICON,
      iconHidden: true,
      content: '<span class="sr-only">Se déconnecter</span>',
    },
  ])
})
